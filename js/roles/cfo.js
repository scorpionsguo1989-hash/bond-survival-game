// js/roles/cfo.js
// 城投财务总监角色：完整 schema 定义（指标 / 死亡 / 操作 / 引擎钩子）
import { CFO_ACTIONS, applyAction as cfoApplyAction, isActionAvailable as cfoIsActionAvailable } from '../actions.js';
import { applyPolicyShift } from '../policy.js';
import { sampleTip, sampleRisks } from './_hintHelpers.js';
import { CFO_KIT_MODIFIERS, CFO_DEBT_SCHEDULES } from '../starterKits.js';
import { computeChallengeScore } from '../origins/cfoOrigin.js';
import { GAME_CONFIG, DIFFICULTY } from '../config.js';

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

// 每季固定收支（经营现金流入 / 运营消耗 / 项目缺口）
const QUARTERLY_INFLOW = 2.5;
const OP_COST_RATE = 0.6;
const PROJECT_GAP = 2.1;
const MIN_INITIAL_CASH = 2.0;   // 现金下限：保证任何出身都有至少一个完整回合可以反应

// 难度锚点：challengeScore 15→25 线性映射到「玩家 12 季里必须自己补上的融资缺口」。
// 旧实现里 totalDebt = 8/(rMult*hMult) 而 cash = 5*rMult*hMult 反向相乘，
// 实测缺口从 -3.2 亿（躺赢）到 30.9 亿，与标称难度的相关系数只有 0.206。
// 现在把债务总额当配平项算出来，标称难度就等于实际难度。
function targetFundingGap(challengeScore) {
  const { gapAtEasiest, gapAtHardest } = DIFFICULTY.cfo;
  const t = Math.max(0, Math.min(1, (challengeScore - 15) / 10));
  return gapAtEasiest + t * (gapAtHardest - gapAtEasiest);
}

// D 改造：起手包 modifier 来自 starterKits.js（默认 'balanced' 兼容老存档）
function getKitMods(profile) {
  return CFO_KIT_MODIFIERS[profile?.starterKit] || CFO_KIT_MODIFIERS.balanced;
}

// D 改造：分布形态由 starterKit 决定（mid_peak / late_peak / early_peak），总额不变
function spreadDebt(totalDebt, scheduleProfile = 'mid_peak') {
  const distribution = CFO_DEBT_SCHEDULES[scheduleProfile] || CFO_DEBT_SCHEDULES.mid_peak;
  return distribution.map(p => parseFloat((totalDebt * p).toFixed(2)));
}

/**
 * 保证第 1 季可玩：首季到期额不能吃光起始现金，否则玩家还没做任何决策就出局。
 * 把超出的部分按比例顺延到后面的季度——总额不变（难度不变），只挪节奏。
 */
function deferUnplayableFirstQuarter(schedule, cash) {
  const opDrain = OP_COST_RATE + PROJECT_GAP - QUARTERLY_INFLOW;   // 每季固定净流出
  const affordable = Math.max(0, cash - opDrain - 0.3);            // 留 0.3 亿余量
  const excess = schedule[0] - affordable;
  if (excess <= 0) return schedule;

  const out = [...schedule];
  out[0] = parseFloat(affordable.toFixed(2));
  const tailTotal = out.slice(1).reduce((a, b) => a + b, 0);
  if (tailTotal <= 0) { out[out.length - 1] = parseFloat((out[out.length - 1] + excess).toFixed(2)); return out; }
  for (let i = 1; i < out.length; i++) {
    out[i] = parseFloat((out[i] + excess * (out[i] / tailTotal)).toFixed(2));
  }
  return out;
}

export function getInitialMetrics(profile) {
  const r = REGION_MODIFIERS[profile.regionTier];
  const h = HEALTH_MODIFIERS[profile.healthLevel];
  const k = getKitMods(profile);
  const baseCreditTotal = r.creditBase * (k.creditMult || 1);

  // 现金保留区域/健康度/起手包的质感差异（手里有多少子弹），只加下限
  const cash = Math.max(MIN_INITIAL_CASH, 5.0 * r.cashMult * h.cashMult * (k.cashMult || 1));

  // 债务总额 = 目标缺口 + 起始现金 + 12 季经营净现金。
  // 项目缺口不再按起手包缩放：起手包用债务节奏/授信/杠杆/成本区分打法，不改净难度。
  const opNet = (QUARTERLY_INFLOW - OP_COST_RATE - PROJECT_GAP) * GAME_CONFIG.totalQuarters;
  const totalDebt = targetFundingGap(computeChallengeScore(profile)) + cash + opNet;

  return {
    cash: parseFloat(cash.toFixed(2)),
    creditTotal: parseFloat(baseCreditTotal.toFixed(2)),
    creditUsed: parseFloat((baseCreditTotal * INITIAL_CREDIT_USAGE_RATIO).toFixed(2)),
    creditUsage: INITIAL_CREDIT_USAGE_RATIO * 100,
    leverageRatio: r.leverageBase + h.leverageDelta + (k.leverageDelta || 0),
    financingCost: parseFloat((r.costBase + h.costDelta + (k.costDelta || 0)).toFixed(2)),
    collateralRoom: profile.healthLevel === 'good' ? 'high' : (profile.healthLevel === 'medium' ? 'medium' : 'low'),
    opCostRate: OP_COST_RATE,
    projectGap: PROJECT_GAP,
    debtMaturity: deferUnplayableFirstQuarter(spreadDebt(totalDebt, k.debtScheduleProfile), cash),
  };
}

// CFO 季度自动结算：扣到期债务/运营/项目缺口 + 加经营现金流
// 注意：目前 engine.js 仍在自己执行这些计算，T2 会改为调用此处。
function advanceTurn(state) {
  const newMetrics = { ...state.metrics };
  const dueIdx = state.quartersPassed;
  const due = dueIdx < newMetrics.debtMaturity.length ? (newMetrics.debtMaturity[dueIdx] || 0) : 0;

  // settlement：本季现金变动的逐项归因，UI 拿它渲染"钱去哪了"
  const settlement = [
    { label: '本季到期债务', delta: -due },
    { label: '运营成本', delta: -newMetrics.opCostRate },
    { label: '在建项目投入', delta: -newMetrics.projectGap },
    { label: '经营现金流入', delta: QUARTERLY_INFLOW },
  ].filter(x => Math.abs(x.delta) > 0.001);

  const net = settlement.reduce((s, x) => s + x.delta, 0);
  newMetrics.cash = parseFloat((newMetrics.cash + net).toFixed(2));
  return { metrics: newMetrics, score: state.score, settlement };
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
        { label: '紧急向兄弟平台拆借', cost: '中', desc: '联系同区域兄弟城投拆借资金，利率8%，期限30天。', effects: { cash: 2.5, financingCost: 0.5, 'score.crisisResponse': 5 } },
        { label: '资产紧急变现', cost: '中高', desc: '出售停车场运营权，估值打折15%，能覆盖缺口。', effects: { cash: 2.0, collateralRoom: 'downgrade', 'score.crisisResponse': 3 } },
        { label: '向上级紧急汇报', cost: '低（不确定）', desc: '请求主管领导协调银行特批放款。成功率约40%。', effects: { _uncertain: 0.4, cash: 3.0, 'score.compliance': 4 } },
      ],
    };
  }
  return null;
}

// ────────────────────────────────────────────
// 命运卡 onboarding 池子（C 改造：替换原硬编码 1-2 句）
// 形态参考 _hintHelpers.js：when 缺省 = 通用，命中所有字段才适用
// ────────────────────────────────────────────

const TIPS_POOL = [
  // 健康度驱动
  { id: 'cfo_tip_weak_credit', text: '第一回合先申请银行续贷预留 1-2 亿子弹', when: { health: 'weak' } },
  { id: 'cfo_tip_weak_sell',   text: '现金紧张，开局先把非标资产小额变现，攒一笔过冬钱', when: { health: 'weak' } },
  { id: 'cfo_tip_med_observe', text: '先观察主线事件再决定主动操作时机', when: { health: 'medium' } },
  { id: 'cfo_tip_good_extend', text: '组合健康，政策松窗口可以拉久期争取低成本融资', when: { health: 'good' } },
  // 剧本驱动
  { id: 'cfo_tip_v_winter',    text: 'Q1-Q4 是寒冬期，先撑过去，别 Q1 就上结构性融资', when: { script: 'v_shape' } },
  { id: 'cfo_tip_slow_ammo',   text: '表面平静期是攒子弹的窗口，别误以为可以放松', when: { script: 'slow_boil' } },
  { id: 'cfo_tip_rise_save',   text: '前 4 季扩张窗口好用，但要给 Q9+ 危机留 30% 子弹', when: { script: 'rise_and_fall' } },
  { id: 'cfo_tip_redm_endure', text: '危机直接砸脸，第一目标是活到 Q5 政策托举，别想 Q1-Q4 翻身', when: { script: 'redemption' } },
  // 标签 / 业务驱动
  { id: 'cfo_tip_hidden',      text: '第一回合先做隐债自查报告，避免巡查时被动', when: { tag: 'hidden_debt_zone' } },
  { id: 'cfo_tip_change',      text: '新班子 + 老账，第一季先做工作汇报再做实质决策', when: { tag: 'leadership_change' } },
  { id: 'cfo_tip_land',        text: '土地市场低迷，开局先别再吃地块', when: { business: 'land_dev' } },
];

const RISKS_POOL = [
  // 核心死亡条件（无 when = 任何局都显示，按出现顺序优先级最高）
  { id: 'cfo_risk_cash',       text: '现金归零 → 资金链断裂' },
  { id: 'cfo_risk_dueWave',    text: 'Q5-Q7 是债务到期高峰，提前备款很重要' },
  // 情境化（按 origin / script 命中）
  { id: 'cfo_risk_weakCash',   text: '初始现金紧张，Q1-Q2 不能大手大脚', when: { health: 'weak' } },
  { id: 'cfo_risk_hidden',     text: '隐债敞口大，省级巡查随时可能进驻', when: { tag: 'hidden_debt_zone' } },
  { id: 'cfo_risk_change',     text: '新班子可能"破立结合"，旧账要不要扛是政治问题', when: { tag: 'leadership_change' } },
  { id: 'cfo_risk_restruct',   text: '整合期资源调度受限，无法单独决策', when: { tag: 'restructuring' } },
  { id: 'cfo_risk_land',       text: '土地一级开发资金回笼周期长，Q5+ 才能回血', when: { business: 'land_dev' } },
  { id: 'cfo_risk_infra',      text: '在建项目"骑虎难下"，停建损失更大', when: { business: 'infrastructure' } },
  { id: 'cfo_risk_northeast',  text: '转移支付占比高，财政自给率低', when: { region: 'northeast_old' } },
  { id: 'cfo_risk_slow',       text: '看似平静的 Q1-Q4 后面是 Q9+ 集中爆雷', when: { script: 'slow_boil' } },
  { id: 'cfo_risk_rise',       text: 'Q1-Q4 蜜月期容易过度扩张，紧缩期被卡喉咙', when: { script: 'rise_and_fall' } },
  { id: 'cfo_risk_redm',       text: '没有蜜月期，第一季就要面对真问题', when: { script: 'redemption' } },
];

// 六维评分里由经营指标驱动的三个维度（其余三维靠事件累积）
// 流动性 ← 现金余量；融资成本控制 ← 综合融资成本；综合发展 ← 资产负债率
function scoreContributions(state) {
  const m = state.metrics || {};
  return {
    liquidity: clamp01to(m.cash * 4, 20),
    costControl: clamp01to(30 - (m.financingCost - 4) * 8, 30),
    development: clamp01to(30 - (m.leverageRatio - 60) * 1.5, 30),
  };
}

function clamp01to(v, max) {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(max, v));
}

// 命运卡 onboarding 提示（设计稿 §3.10 / 实施计划 T5；C 改造：池化抽样）
function getOnboardingHints(profile, scriptId = null) {
  return {
    // goal 字段保留兼容签名，UI 实际通过 state.goalId 反查 GOAL_POOLS（参见 goals.js / B 改造）
    goal: '存活 12 季度，期末现金不归零',
    topRisks: sampleRisks(RISKS_POOL, profile, scriptId, 3),
    firstActionHint: sampleTip(TIPS_POOL, profile, scriptId, '观察主线事件再决定主动操作时机'),
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
  // 不确定选项赌输了的默认代价：事儿没办成，但关系动了、加急费花了。
  // 内容里写 _onFail 可以覆盖这个默认值。
  failureCost: { financingCost: 0.15, 'score.crisisResponse': -1 },

  getInitialMetrics,
  advanceTurn,
  detectCrisis,
  getOnboardingHints,
  scoreContributions,
};
