// js/roles/cfo.js
// 城投财务总监角色：完整 schema 定义（指标 / 死亡 / 操作 / 引擎钩子）
import { CFO_ACTIONS, applyAction as cfoApplyAction, isActionAvailable as cfoIsActionAvailable } from '../actions.js';
import { applyPolicyShift } from '../policy.js';

// 区域能级影响初始指标
const REGION_MODIFIERS = {
  east_core:    { cashMult: 1.4, leverageBase: 60, costBase: 5.0, creditBase: 25 },
  central_capital: { cashMult: 1.1, leverageBase: 67, costBase: 5.8, creditBase: 18 },
  west_prefecture: { cashMult: 0.7, leverageBase: 73, costBase: 6.8, creditBase: 12 },
  northeast_old: { cashMult: 0.6, leverageBase: 76, costBase: 7.2, creditBase: 8 },
};

const HEALTH_MODIFIERS = {
  good:   { cashMult: 1.3, leverageDelta: -5, costDelta: -0.5 },
  medium: { cashMult: 1.0, leverageDelta: 0,  costDelta: 0 },
  weak:   { cashMult: 0.6, leverageDelta: +5, costDelta: +0.7 },
};

const INITIAL_CREDIT_USAGE_RATIO = 0.55;

function generateDebtSchedule(rMult, hMult) {
  // 总债务规模随财务健康度变化，分布在12季度
  const totalDebt = 8 / (rMult * hMult);
  // 债务到期分布：前轻后重，Q5-Q7为高峰期，Q9+基本还完
  const distribution = [0.05, 0.07, 0.09, 0.12, 0.14, 0.17, 0.15, 0.11, 0.06, 0.04, 0, 0];
  return distribution.map(p => parseFloat((totalDebt * p).toFixed(2)));
}

export function getInitialMetrics(profile) {
  const r = REGION_MODIFIERS[profile.regionTier];
  const h = HEALTH_MODIFIERS[profile.healthLevel];
  return {
    cash: parseFloat((5.0 * r.cashMult * h.cashMult).toFixed(2)),
    creditTotal: r.creditBase,
    creditUsed: parseFloat((r.creditBase * INITIAL_CREDIT_USAGE_RATIO).toFixed(2)),
    creditUsage: INITIAL_CREDIT_USAGE_RATIO * 100,
    leverageRatio: r.leverageBase + h.leverageDelta,
    financingCost: parseFloat((r.costBase + h.costDelta).toFixed(2)),
    collateralRoom: profile.healthLevel === 'good' ? 'high' : (profile.healthLevel === 'medium' ? 'medium' : 'low'),
    opCostRate: 0.6,
    projectGap: 2.1,
    debtMaturity: generateDebtSchedule(r.cashMult, h.cashMult),
  };
}

// CFO 季度自动结算：扣到期债务/运营/项目缺口 + 加经营现金流
// 注意：目前 engine.js 仍在自己执行这些计算，T2 会改为调用此处。
function advanceTurn(state) {
  let newMetrics = { ...state.metrics };
  const dueIdx = state.quartersPassed;
  if (dueIdx < newMetrics.debtMaturity.length) {
    const due = newMetrics.debtMaturity[dueIdx] || 0;
    newMetrics.cash = parseFloat((newMetrics.cash - due).toFixed(2));
  }
  newMetrics.cash = parseFloat((newMetrics.cash - newMetrics.opCostRate).toFixed(2));
  newMetrics.cash = parseFloat((newMetrics.cash - newMetrics.projectGap).toFixed(2));
  newMetrics.cash = parseFloat((newMetrics.cash + 2.5).toFixed(2));
  return { metrics: newMetrics, score: state.score };
}

// CFO 危机检测：现金低于 0.5 亿（且未到末季）触发危机弹窗
// 该函数从 engine.js detectCrisis 抽出（CFO 部分）
function detectCrisis(state) {
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
      ],
    };
  }
  return null;
}

// 命运卡 onboarding 提示（设计稿 §3.10 / 实施计划 T5）
function getOnboardingHints(profile) {
  const isWeak = profile?.healthLevel === 'weak';
  return {
    goal: '存活 12 季度，期末现金不归零',
    topRisks: [
      '现金归零 → 资金链断裂',
      'Q5-Q7 是债务到期高峰，提前备款很重要',
      isWeak ? '初始现金紧张，Q1-Q2 不能大手大脚' : null,
    ].filter(Boolean),
    firstActionHint: isWeak
      ? '第一回合先申请银行续贷预留 1-2 亿子弹'
      : '先观察主线事件再决定主动操作时机',
  };
}

export const ROLE_CFO = {
  // —— 元数据 ——
  id: 'cfo',
  name: '城投财务总监',
  shortName: '财务总监',
  description: '管理一家城投平台的债务与现金流，存活到 2024 年底',

  // —— 数据定义 ——
  metrics: ['cash', 'debtMaturity', 'financingCost', 'creditUsage', 'leverageRatio', 'collateralRoom', 'projectGap', 'opCostRate'],
  metricLabels: {
    cash: '现金余量',
    debtMaturity: '债务到期日历',
    financingCost: '综合融资成本',
    creditUsage: '授信使用率',
    leverageRatio: '资产负债率',
    collateralRoom: '抵押物剩余空间',
    projectGap: '项目投资缺口',
    opCostRate: '运营成本消耗率',
  },
  deathConditions: [
    { metric: 'cash', op: '<=', threshold: 0, reason: '现金归零，资金链断裂' },
  ],
  scoreWeights: {
    liquidity: 1.0, costControl: 1.0, projectProgress: 1.0,
    compliance: 1.0, crisisResponse: 1.0, development: 1.0,
  },
  // 每角色独立的维度显示标签（内部 key 共享，UI 标签按角色）
  dimensionLabels: {
    liquidity: '流动性管理',
    costControl: '融资成本控制',
    projectProgress: '项目推进',
    compliance: '合规指数',
    crisisResponse: '危机应对',
    development: '综合发展',
  },

  // —— 操作定义（直接复用现有 actions.js）——
  actions: CFO_ACTIONS,
  applyActionEffects: cfoApplyAction,
  isActionAvailable: cfoIsActionAvailable,

  // —— 引擎钩子（T2 启用调用） ——
  getInitialMetrics,
  advanceTurn,
  detectCrisis,
  getOnboardingHints,
};
