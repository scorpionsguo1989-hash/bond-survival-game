// js/engine.js
// 角色驱动引擎：通过 state.role.<hook>() 调度角色独有逻辑
// 设计稿 §2.4 / 实施计划 T2
import { GAME_CONFIG } from './config.js';
import { getRole } from './roles/index.js';
import { driftPolicy, applyPolicyShift } from './policy.js';

export function createInitialState(origin) {
  const role = getRole(origin.role);
  return {
    origin,
    role,                                  // ← 注入
    year: GAME_CONFIG.startYear,
    quarter: GAME_CONFIG.startQuarter,
    policyValue: GAME_CONFIG.policyAxisStart,
    metrics: role.getInitialMetrics(origin),
    score: {},
    actionsUsed: 0,
    quartersPassed: 0,
    survived: true,
    deathReason: null,
    history: [],          // [{year, quarter, snapshot}]
    eventLog: [],         // [{eventId, choiceIdx}]
    pendingEvent: null,
  };
}

/**
 * Advance to next quarter:
 *  1) drift policy
 *  2) delegate role-specific season settle (state.role.advanceTurn)
 *  3) roll quarter, snapshot history
 *
 * IMPORTANT: This function does NOT update state.survived or state.deathReason. Callers must
 * invoke checkDeath() on the returned state and write back survived=false + deathReason if dead.
 * See main.js handleEndTurn for the expected pattern.
 */
export function advanceTurn(state) {
  // 1. 政策轴漂移（朝当前方向）
  const dir = state.policyValue < 0 ? 'tight' : (state.policyValue > 0 ? 'loose' : 'stable');
  let newPolicy = driftPolicy(state.policyValue, dir);

  // 2. 角色独有的季度结算
  const { metrics: newMetrics, score: newScore } = state.role.advanceTurn(state);

  // 3. 季度推进
  let newQuarter = state.quarter + 1;
  let newYear = state.year;
  if (newQuarter > 4) { newQuarter = 1; newYear += 1; }

  // 4. 历史快照
  const newHistory = [...state.history, {
    year: state.year,
    quarter: state.quarter,
    cash: state.metrics.cash,
    leverageRatio: state.metrics.leverageRatio,
    financingCost: state.metrics.financingCost,
    nav: state.metrics.nav,                // IM 角色的净值历史（CFO 时 undefined）
    policyValue: state.policyValue,
  }];

  return {
    ...state,
    year: newYear,
    quarter: newQuarter,
    policyValue: newPolicy,
    metrics: newMetrics,
    score: newScore || state.score,
    actionsUsed: 0,
    quartersPassed: state.quartersPassed + 1,
    history: newHistory,
  };
}

/**
 * Apply event choice effects to state. Handles 4 effect types:
 * - "score.<dim>" — adds to state.score[dim]
 * - "collateralRoom" with "downgrade"/"upgrade" — transitions high↔medium↔low
 * - "_uncertainty" — probability of effects applying (0-1). On failure, only policyShift applies; other effects skipped.
 * - "_<flag>" — other internal flags, silently skipped (e.g., _delay)
 * - numeric — added to state.metrics[key]
 *
 * IMPORTANT: This function does NOT call checkDeath. Callers must invoke checkDeath() after
 * this returns if the effects could push metrics to death conditions.
 */
export function applyEventChoice(state, event, choiceIdx) {
  const choice = event.choices[choiceIdx];

  // Uncertainty gate: if choice has _uncertainty, roll probability.
  // On failure, only policyShift applies (commitment), other effects skipped.
  // The eventLog records the outcome for transparency.
  const uncertainty = choice.effects?._uncertainty;
  let uncertainOutcome = null;
  if (uncertainty !== undefined) {
    const success = Math.random() < uncertainty;
    uncertainOutcome = success ? 'succeeded' : 'failed';
    if (!success) {
      let postPolicy = state.policyValue;
      if (event.policyShift) {
        postPolicy = applyPolicyShift(postPolicy, event.policyShift);
      }
      return {
        ...state,
        policyValue: postPolicy,
        eventLog: [...state.eventLog, { eventId: event.id, choiceIdx, uncertainOutcome: 'failed' }],
      };
    }
  }

  let newMetrics = { ...state.metrics };
  let newScore = { ...state.score };
  let newPolicy = state.policyValue;

  if (event.policyShift) {
    newPolicy = applyPolicyShift(newPolicy, event.policyShift);
  }

  Object.entries(choice.effects || {}).forEach(([key, val]) => {
    if (key.startsWith('score.')) {
      const dim = key.slice(6);
      newScore[dim] = (newScore[dim] || 0) + val;
    } else if (key === 'collateralRoom') {
      if (val === 'downgrade') newMetrics.collateralRoom = downgradeCollateral(newMetrics.collateralRoom);
      else if (val === 'upgrade') newMetrics.collateralRoom = upgradeCollateral(newMetrics.collateralRoom);
    } else if (key.startsWith('_')) {
      // 内部flag，跳过
    } else if (typeof val === 'number') {
      newMetrics[key] = parseFloat(((newMetrics[key] || 0) + val).toFixed(2));
    }
  });

  // CFO 专属：更新授信使用率（仅当 creditTotal 存在）
  if (newMetrics.creditTotal) {
    newMetrics.creditUsage = Math.round((newMetrics.creditUsed / newMetrics.creditTotal) * 100);
  }

  return {
    ...state,
    metrics: newMetrics,
    score: newScore,
    policyValue: newPolicy,
    eventLog: [...state.eventLog, { eventId: event.id, choiceIdx, uncertainOutcome }],
  };
}

/**
 * Generic death check: iterate role.deathConditions and compare each metric.
 * Supports ops: <, <=, >, >=, ==
 */
export function checkDeath(state) {
  if (!state.role) return { dead: false };  // 防御性：未注入 role 时不判死
  for (const cond of state.role.deathConditions) {
    const value = state.metrics[cond.metric];
    if (value == null) continue;
    if (compareThreshold(value, cond.op, cond.threshold)) {
      return { dead: true, reason: cond.reason };
    }
  }
  return { dead: false };
}

function compareThreshold(value, op, threshold) {
  switch (op) {
    case '<':  return value < threshold;
    case '<=': return value <= threshold;
    case '>':  return value > threshold;
    case '>=': return value >= threshold;
    case '==': return value === threshold;
    default: throw new Error(`Unknown op: ${op}`);
  }
}

export function isGameOver(state) {
  if (!state.survived) return { over: true, type: 'death' };
  if (state.quartersPassed >= GAME_CONFIG.totalQuarters) return { over: true, type: 'survived' };
  return { over: false };
}

/**
 * Delegate crisis detection to role-specific hook.
 * Returns crisis modal config or null.
 */
export function detectCrisis(state) {
  if (!state.role || !state.role.detectCrisis) return null;
  return state.role.detectCrisis(state);
}

function downgradeCollateral(level) {
  if (level === 'high') return 'medium';
  if (level === 'medium') return 'low';
  return 'low';
}
function upgradeCollateral(level) {
  if (level === 'low') return 'medium';
  if (level === 'medium') return 'high';
  return 'high';
}
