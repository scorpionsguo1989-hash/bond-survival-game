// js/engine.js
// 角色驱动引擎：通过 state.role.<hook>() 调度角色独有逻辑
// 设计稿 §2.4 / 实施计划 T2
import { GAME_CONFIG } from './config.js';
import { getRole } from './roles/index.js';
import { naturalDrift, applyPolicyShift } from './policy.js';
import { canTakeAction } from './actionBudget.js';
import { pickRandomScriptId, getCurrentAct, applyActScoreMultiplier } from './scripts.js';
import { pickGoalForGame } from './goals.js';
import { gameRandom } from './rng.js';

export function createInitialState(origin) {
  const role = getRole(origin.role);
  const scriptId = pickRandomScriptId();
  const goal = pickGoalForGame(origin.role, scriptId);
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
    blackSwansSeen: [],   // 已触发的黑天鹅事件 ID，避免一局重复
    nextSagaEventId: null, // Saga 长线：上一季选择指向的下一步事件 ID
    sagaSeenIds: [],       // 已触发过的 Saga 事件 ID，避免 step1 重复刷出
    completedSagaIds: [],  // 已终止/完成的 Saga 链 ID，避免同一链重新开局
    scriptId,             // 多周期叙事：本局抽到的剧本 ID
    goalId: goal.id,      // 本局目标 ID（写入持久化，ui.js 通过 getGoalById 反查文案）
    currentActId: null,   // 当前所在幕；由 main.js 在每季 loadCurrentTurnEvent 后更新
    coachingUsedTotal: 0, // AI 决策助手累积使用次数（整局 3 次上限）
    pendingEffects: [],   // 延迟后果队列：[{quarter, effects, sourceEvent, sourceTitle}]
    npcEncounters: {},    // NPC 记忆：{ [npcId]: { count, lastQuarter, lastEventTitle, lastChoiceLabel } }
    lastSwanTag: null,    // 上一个触发的黑天鹅 swanTag，用于避免连发同主题
    openingEventConsumed: false,  // E 改造：Q1 开场事件是否已触发；老存档 undefined 也走重新触发
  };
}

export const COACHING_MAX_PER_GAME = 3;

// 回合行动预算：定义在 actionBudget.js（避免与 actions.js 循环依赖），这里转出给调用方
export { canTakeAction };

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
  // 0. 已结束的局不再推进。终局页只是在主界面上盖一层弹窗，主界面的「结束本季」
  //    仍然挂着 handleEndTurn；不拦住的话 quartersPassed 会超过 12，
  //    而排行榜服务端只接受 1-12，会把这局成绩静默拒收。
  if (isGameOver(state).over) return state;

  // 1. 政策轴漂移：先向中性自然回归，再叠加当前幕的剧本压力
  //    剧本里 policyDrift > 0 推向宽松、< 0 推向收紧、= 0 不额外推
  let newPolicy = naturalDrift(state.policyValue);
  const act = getCurrentAct(state);
  if (act?.policyDrift) {
    newPolicy = applyPolicyShift(newPolicy, act.policyDrift);
  }

  // 2. 角色独有的季度结算（settlement = 本季变动的逐项归因）
  const { metrics: newMetrics, score: newScore, settlement } = state.role.advanceTurn(state);

  // 3. 季度推进
  let newQuarter = state.quarter + 1;
  let newYear = state.year;
  if (newQuarter > 4) { newQuarter = 1; newYear += 1; }

  // 4. 历史快照（包含所有角色可能查询的指标）
  const newHistory = [...state.history, {
    year: state.year,
    quarter: state.quarter,
    cash: state.metrics.cash,
    leverageRatio: state.metrics.leverageRatio,
    financingCost: state.metrics.financingCost,
    nav: state.metrics.nav,                // IM 角色的净值历史
    debtRatio: state.metrics.debtRatio,    // GOV 角色的债务率历史
    redemptionPressure: state.metrics.redemptionPressure,  // IM 赎回压力卡的环比来源
    policyValue: state.policyValue,
  }];

  // 5. 延迟后果结算：检查 pendingEffects 里到期（quarter <= newQuartersPassed）的项
  //    应用 effects 到 metrics/score；让 main.js 拿 triggeredDelayedEffects 显示 toast
  const newQuartersPassed = state.quartersPassed + 1;
  const triggeredDelayedEffects = [];
  const remainingPendingEffects = [];
  const settlementLines = [...(settlement || [])];
  let withDelayedMetrics = newMetrics;
  let withDelayedScore = newScore || state.score;
  for (const item of (state.pendingEffects || [])) {
    if (item && item.quarter <= newQuartersPassed) {
      triggeredDelayedEffects.push(item);
      const m = { ...withDelayedMetrics };
      const sc = { ...withDelayedScore };
      Object.entries(item.effects || {}).forEach(([key, val]) => {
        if (key.startsWith('_')) return;
        if (key.startsWith('score.')) {
          const dim = key.slice(6);
          sc[dim] = (sc[dim] || 0) + val;
        } else if (key === 'collateralRoom') {
          if (val === 'downgrade') m.collateralRoom = downgradeCollateral(m.collateralRoom);
          else if (val === 'upgrade') m.collateralRoom = upgradeCollateral(m.collateralRoom);
        } else if (typeof val === 'number') {
          m[key] = parseFloat(((m[key] || 0) + val).toFixed(2));
        }
      });
      // 延迟后果也要出现在归因里，否则玩家会看到一笔无法解释的变动
      Object.entries(item.effects || {}).forEach(([key, val]) => {
        if (key.startsWith('_') || key.startsWith('score.') || typeof val !== 'number') return;
        settlementLines.push({
          label: `前情回响 · ${(item.sourceTitle || '过往决策').slice(0, 14)}`,
          metric: key,
          delta: val,
        });
      });
      withDelayedMetrics = m;
      withDelayedScore = sc;
    } else {
      remainingPendingEffects.push(item);
    }
  }

  return {
    ...state,
    year: newYear,
    quarter: newQuarter,
    policyValue: newPolicy,
    metrics: withDelayedMetrics,
    score: withDelayedScore,
    actionsUsed: 0,
    quartersPassed: newQuartersPassed,
    history: newHistory,
    pendingEffects: remainingPendingEffects,
    triggeredDelayedEffects,  // main.js 拿这个弹 toast；下一季会被清空
    lastSettlement: settlementLines,  // 归因面板：本季每一笔变动的来源
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
    const success = gameRandom() < uncertainty;
    uncertainOutcome = success ? 'succeeded' : 'failed';
    if (!success) {
      // 失败不能是免费的。原实现只应用 policyShift、其余全跳过，于是 1283 个
      // 带 _uncertainty 的选项（占全部选项 35.5%）都是零成本的赌，玩家还收不到任何反馈。
      // 优先用内容写的 _onFail；没写就用角色的默认"空转成本"——事儿没办成，
      // 但时间花了、关系动了、承诺放出去了。
      const failEffects = choice.effects._onFail || state.role?.failureCost || {};
      let postPolicy = state.policyValue;
      if (event.policyShift) {
        postPolicy = applyPolicyShift(postPolicy, event.policyShift);
      }
      const failMetrics = { ...state.metrics };
      const failScore = { ...state.score };
      Object.entries(failEffects).forEach(([key, val]) => {
        if (key.startsWith('_')) return;
        if (key.startsWith('score.')) {
          const dim = key.slice(6);
          failScore[dim] = (failScore[dim] || 0) + val;
        } else if (key === 'collateralRoom') {
          if (val === 'downgrade') failMetrics.collateralRoom = downgradeCollateral(failMetrics.collateralRoom);
          else if (val === 'upgrade') failMetrics.collateralRoom = upgradeCollateral(failMetrics.collateralRoom);
        } else if (typeof val === 'number') {
          failMetrics[key] = parseFloat(((failMetrics[key] || 0) + val).toFixed(2));
        }
      });
      return {
        ...state,
        metrics: failMetrics,
        score: failScore,
        policyValue: postPolicy,
        eventLog: [...state.eventLog, { eventId: event.id, choiceIdx, uncertainOutcome: 'failed', quarter: (state.quartersPassed || 0) + 1 }],
        // 给 UI 用：让玩家知道自己赌输了，以及输掉了什么
        lastUncertainOutcome: { success: false, chance: uncertainty, effects: failEffects },
      };
    }
  }

  let newMetrics = { ...state.metrics };
  let newScore = { ...state.score };
  let newPolicy = state.policyValue;

  if (event.policyShift) {
    newPolicy = applyPolicyShift(newPolicy, event.policyShift);
  }

  // 多周期叙事：根据当前幕给 score.* 加权（鼓励"本幕的正确动作"）
  // 仅放大正向加成，负向不缩小（避免帮玩家逃避惩罚）
  const currentAct = getCurrentAct(state);
  const weightedEffects = applyActScoreMultiplier(choice.effects || {}, currentAct);

  // 收集延迟后果（如果选项含 _delayedEffect: { afterQuarters, effects }）
  const newPendingEffects = [];

  Object.entries(weightedEffects).forEach(([key, val]) => {
    if (key === '_delayedEffect') {
      // val 形如 { afterQuarters: 3, effects: { financingCost: 0.2, ... } }
      if (val && typeof val.afterQuarters === 'number' && val.effects) {
        newPendingEffects.push({
          quarter: (state.quartersPassed || 0) + Math.max(1, val.afterQuarters),
          effects: val.effects,
          sourceEvent: event.id,
          sourceTitle: event.title || '',
        });
      }
      return;
    }
    if (key.startsWith('score.')) {
      const dim = key.slice(6);
      newScore[dim] = (newScore[dim] || 0) + val;
    } else if (key === 'collateralRoom') {
      if (val === 'downgrade') newMetrics.collateralRoom = downgradeCollateral(newMetrics.collateralRoom);
      else if (val === 'upgrade') newMetrics.collateralRoom = upgradeCollateral(newMetrics.collateralRoom);
    } else if (key.startsWith('_')) {
      // 其他内部 flag，跳过
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
    eventLog: [...state.eventLog, { eventId: event.id, choiceIdx, uncertainOutcome, quarter: (state.quartersPassed || 0) + 1 }],
    pendingEffects: [...(state.pendingEffects || []), ...newPendingEffects],
    lastUncertainOutcome: uncertainOutcome === 'succeeded'
      ? { success: true, chance: uncertainty } : null,
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
