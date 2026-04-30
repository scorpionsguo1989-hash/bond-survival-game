// js/engine.js
import { GAME_CONFIG } from './config.js';
import { ROLE_CFO, getInitialMetrics } from './roles.js';
import { driftPolicy, applyPolicyShift } from './policy.js';

export function createInitialState(origin) {
  return {
    origin,
    year: GAME_CONFIG.startYear,
    quarter: GAME_CONFIG.startQuarter,
    policyValue: GAME_CONFIG.policyAxisStart,
    metrics: getInitialMetrics(origin),
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
 * Advance to next quarter: drift policy, settle debt, deduct opCost+projectGap, add cash flow,
 * roll quarter, snapshot history.
 *
 * IMPORTANT: This function does NOT update state.survived or state.deathReason. Callers must
 * invoke checkDeath() on the returned state and write back survived=false + deathReason if dead.
 * See main.js handleEndTurn for the expected pattern.
 */
export function advanceTurn(state) {
  // 1. 政策轴漂移（朝当前方向）
  const dir = state.policyValue < 0 ? 'tight' : (state.policyValue > 0 ? 'loose' : 'stable');
  let newPolicy = driftPolicy(state.policyValue, dir);

  // 2. 收入和到期债务结算
  let newMetrics = { ...state.metrics };
  const dueIdx = state.quartersPassed;  // 第几个季度
  if (dueIdx < newMetrics.debtMaturity.length) {
    const due = newMetrics.debtMaturity[dueIdx] || 0;
    newMetrics.cash = parseFloat((newMetrics.cash - due).toFixed(2));
  }
  // 运营成本扣减
  newMetrics.cash = parseFloat((newMetrics.cash - newMetrics.opCostRate).toFixed(2));
  // 项目缺口扣减
  newMetrics.cash = parseFloat((newMetrics.cash - newMetrics.projectGap).toFixed(2));
  // 经营现金流回血（少量）
  newMetrics.cash = parseFloat((newMetrics.cash + 1.2).toFixed(2));

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
    policyValue: state.policyValue,
  }];

  return {
    ...state,
    year: newYear,
    quarter: newQuarter,
    policyValue: newPolicy,
    metrics: newMetrics,
    actionsUsed: 0,
    quartersPassed: state.quartersPassed + 1,
    history: newHistory,
  };
}

/**
 * Apply event choice effects to state. Handles 4 effect types:
 * - "score.<dim>" — adds to state.score[dim]
 * - "collateralRoom" with "downgrade"/"upgrade" — transitions high↔medium↔low
 * - "_<flag>" — internal flags, silently skipped (e.g., _uncertainty, _delay)
 * - numeric — added to state.metrics[key]
 *
 * IMPORTANT: This function does NOT call checkDeath. Callers must invoke checkDeath() after
 * this returns if the effects could push metrics to death conditions.
 */
export function applyEventChoice(state, event, choiceIdx) {
  const choice = event.choices[choiceIdx];
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

  // 更新授信使用率
  if (newMetrics.creditTotal) {
    newMetrics.creditUsage = Math.round((newMetrics.creditUsed / newMetrics.creditTotal) * 100);
  }

  return {
    ...state,
    metrics: newMetrics,
    score: newScore,
    policyValue: newPolicy,
    eventLog: [...state.eventLog, { eventId: event.id, choiceIdx }],
  };
}

export function checkDeath(state) {
  for (const cond of ROLE_CFO.deathConditions) {
    const value = state.metrics[cond.metric];
    if (cond.op === '<=' && value <= cond.threshold) {
      return { dead: true, reason: cond.reason };
    }
    if (cond.op === '>=' && value >= cond.threshold) {
      return { dead: true, reason: cond.reason };
    }
  }
  return { dead: false };
}

export function isGameOver(state) {
  if (!state.survived) return { over: true, type: 'death' };
  if (state.quartersPassed >= GAME_CONFIG.totalQuarters) return { over: true, type: 'survived' };
  return { over: false };
}

export function detectCrisis(state) {
  const m = state.metrics;
  if (m.cash < 0.5 && state.quartersPassed < 11) {
    return {
      id: 'crisis_cash',
      title: '资金链危机：现金即将耗尽',
      body: `账面现金仅剩${m.cash.toFixed(2)}亿，下季度到期债务和运营成本无法覆盖。距离违约不足90天。`,
      metrics: [
        { label: '账面资金', value: `${m.cash.toFixed(2)}亿` },
        { label: '下季到期', value: `${(m.debtMaturity[state.quartersPassed] || 0).toFixed(1)}亿` },
        { label: '缺口', value: `-${Math.max(0, (m.debtMaturity[state.quartersPassed] || 0) - m.cash).toFixed(1)}亿` },
      ],
      options: [
        { label: '紧急向兄弟平台拆借', cost: '中', desc: '联系同区域兄弟城投拆借资金，利率8%，期限30天。', effects: { cash: 2.5, financingCost: 0.5, 'score.危机应对': 5 } },
        { label: '资产紧急变现', cost: '中高', desc: '出售停车场运营权，估值打折15%，能覆盖缺口。', effects: { cash: 2.0, collateralRoom: 'downgrade', 'score.危机应对': 3 } },
        { label: '向上级紧急汇报', cost: '低（不确定）', desc: '请求主管领导协调银行特批放款。成功率约40%。', effects: { _uncertain: 0.4, cash: 3.0, 'score.合规指数': 4 } },
      ]
    };
  }
  return null;
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
