// js/roles/gov.js
// 地方官员角色：财政视角，化债 + 政绩 + 转移支付博弈
import { GOV_ACTIONS, govApplyAction, govIsActionAvailable } from '../actions/gov.js';
import { sampleTip, sampleRisks } from './_hintHelpers.js';
import { GOV_KIT_MODIFIERS } from '../starterKits.js';

const TIER_PROFILES = {
  strong_capital: { fiscalRevenue: 280, landRevenue: 180, specialBondQuota: 28, debtRatio: 200, transferPayment: 8 },
  prefecture:     { fiscalRevenue: 140, landRevenue: 90,  specialBondQuota: 16, debtRatio: 230, transferPayment: 14 },
  county:         { fiscalRevenue: 60,  landRevenue: 45,  specialBondQuota: 9,  debtRatio: 250, transferPayment: 22 },
  resource:       { fiscalRevenue: 70,  landRevenue: 30,  specialBondQuota: 10, debtRatio: 270, transferPayment: 18 },
};

const FISCAL_PROFILES = {
  self_sufficient: { hiddenDebtRisk: 40,  industryIndex: 65, transferMult: 0.4 },
  transfer_dep:    { hiddenDebtRisk: 70,  industryIndex: 50, transferMult: 1.4 },
  land_dep:        { hiddenDebtRisk: 110, industryIndex: 55, transferMult: 0.7 },
};

const TAG_MODIFIERS = {
  debt_zone:        { hiddenDebtRisk: +50, debtRatio: +20, politicalScoreInit: 45 },
  central_partner:  { industryIndex: +10, politicalScoreInit: 65 },
  major_project:    { industryIndex: +8,  fiscalRevenue: +10, politicalScoreInit: 60 },
  land_dispute:     { landRevenue: -15, politicalScoreInit: 50 },
  industry_pain:    { industryIndex: -8,  politicalScoreInit: 50 },
  population_drain: { fiscalRevenue: -8,  industryIndex: -5, politicalScoreInit: 55 },
};

function getInitialMetrics(profile) {
  const tp = TIER_PROFILES[profile.cityTier] || TIER_PROFILES.prefecture;
  const fp = FISCAL_PROFILES[profile.fiscalStatus] || FISCAL_PROFILES.transfer_dep;
  const tm = TAG_MODIFIERS[profile.tag] || { politicalScoreInit: 55 };
  // D 改造：起手包 modifier
  const k = GOV_KIT_MODIFIERS[profile?.starterKit] || GOV_KIT_MODIFIERS.balanced;

  return {
    fiscalRevenue: tp.fiscalRevenue + (tm.fiscalRevenue || 0),
    landRevenue: tp.landRevenue + (tm.landRevenue || 0),
    debtRatio: round(tp.debtRatio + (tm.debtRatio || 0) + (k.debtRatioDelta || 0), 2),
    hiddenDebtRisk: round((fp.hiddenDebtRisk + (tm.hiddenDebtRisk || 0)) * (k.hiddenDebtMult || 1), 2),
    industryIndex: clamp(fp.industryIndex + (tm.industryIndex || 0) + (k.industryIndexDelta || 0), 0, 100),
    politicalScore: clamp(tm.politicalScoreInit + (k.politicalScoreDelta || 0), 0, 100),
    specialBondQuota: round(tp.specialBondQuota * (k.specialBondQuotaMult || 1), 2),
    transferPayment: round(tp.transferPayment * fp.transferMult * (k.transferPaymentMult || 1), 2),
    cash: 4.0,  // 季度现金（与 CFO 单位对齐，便于事件 effects 复用）
  };
}

function advanceTurn(state) {
  const { policyValue, metrics } = state;
  let { fiscalRevenue, landRevenue, debtRatio, hiddenDebtRisk, industryIndex,
        politicalScore, specialBondQuota, transferPayment, cash } = metrics;

  // 1. 季度财政入账
  cash = round(cash + fiscalRevenue / 4, 2);

  // 2. 转移支付（按 politicalScore 调整：60 = 基线）
  const transfer = transferPayment * (politicalScore / 60);
  cash = round(cash + transfer, 2);

  // 3. 土地收入（政策紧时打折，最低 4 折）
  const landMult = policyValue >= 0 ? 1.0 : Math.max(0.4, 1 + policyValue * 0.08);
  cash = round(cash + (landRevenue / 4) * landMult, 2);

  // 4. 刚性支出（民生 + 工资 + 利息）≈ fiscalRevenue × 0.55（更贴合现实地方财政结构）
  const operatingCost = fiscalRevenue * 0.55 / 4;
  cash = round(cash - operatingCost, 2);

  // 5. 化债任务（按隐债敞口动态：重点区压力大）
  //    每季最少 1.5 亿，敞口大的最多 6 亿
  const debtServiceTarget = Math.min(6, Math.max(1.5, hiddenDebtRisk * 0.04));
  if (cash >= debtServiceTarget) {
    cash = round(cash - debtServiceTarget, 2);
    hiddenDebtRisk = Math.max(0, round(hiddenDebtRisk - debtServiceTarget, 2));
  } else {
    // 没钱完成化债任务 → 隐债累积 + 政绩重扣
    hiddenDebtRisk = round(hiddenDebtRisk + 3, 2);
    politicalScore = clamp(politicalScore - 2, 0, 100);
  }

  // 6. industryIndex 自然衰减（不投入则退步）
  industryIndex = Math.max(0, round(industryIndex - 1.0, 2));

  // 7. debtRatio 累积（隐债敞口大 → 债务率自然增加；化债任务完成 → 抵扣）
  debtRatio = round(debtRatio + hiddenDebtRisk * 0.05 - debtServiceTarget * 0.5, 2);

  // 8. 政绩自然衰减（不主动管理则退步，每季 -0.8）
  politicalScore = clamp(politicalScore - 0.8, 0, 100);

  return {
    metrics: { fiscalRevenue, landRevenue, debtRatio, hiddenDebtRisk,
               industryIndex, politicalScore, specialBondQuota, transferPayment, cash },
    score: state.score,
  };
}

function detectCrisis(state) {
  const m = state.metrics;
  // 隐债集中爆雷危机（hiddenDebtRisk > 200 触发）
  if (m.hiddenDebtRisk > 200) {
    return {
      type: 'hidden_debt_burst',
      title: '⚠ 隐性债务集中爆雷',
      body: `辖区隐性债务风险敞口已累积至 ${Math.round(m.hiddenDebtRisk)} 亿，省级巡查组下周进驻。处置不力将引发问责。`,
      metrics: [
        { label: '隐债敞口', value: `${Math.round(m.hiddenDebtRisk)} 亿` },
        { label: '现金', value: `${m.cash.toFixed(1)} 亿` },
        { label: '政绩', value: `${Math.round(m.politicalScore)}` },
      ],
      options: [
        { label: '紧急动用专项债额度置换', cost: '中', desc: '消耗专项债额度大幅化债', effects: { specialBondQuota: -8, hiddenDebtRisk: -40, debtRatio: -3, 'score.crisisResponse': 6 } },
        { label: '推动平台资产注入做账平账', cost: '中（不确定）', desc: '账面化债，省级查账可能被识破', effects: { hiddenDebtRisk: -25, _uncertain: 0.55, 'score.compliance': -5 } },
        { label: '主动汇报并申请化债试点', cost: '低（不确定）', desc: '诚恳态度争取省级支持，成功率约 50%', effects: { _uncertain: 0.5, hiddenDebtRisk: -30, transferPayment: 3, 'score.compliance': 5 } },
      ],
    };
  }
  return null;
}

// ────────────────────────────────────────────
// 命运卡 onboarding 池子（C 改造：替换原硬编码 1-2 句）
// ────────────────────────────────────────────

const TIPS_POOL = [
  // 标签
  { id: 'gov_tip_debt_zone',    text: '第一季先发专项债置换隐债，主动申报试点', when: { tag: 'debt_zone' } },
  { id: 'gov_tip_major_proj',   text: '第一季先核算项目资金缺口，避免后期拉胯', when: { tag: 'major_project' } },
  { id: 'gov_tip_land_disp',    text: '土地纠纷尽快协调，不然出让收入持续下滑', when: { tag: 'land_dispute' } },
  // 财政
  { id: 'gov_tip_landDep',      text: '房地产周期下行，开局把 Q3 土地预算下调', when: { fiscal: 'land_dep' } },
  { id: 'gov_tip_transferDep',  text: '第一季就和上级对接转移支付申请', when: { fiscal: 'transfer_dep' } },
  // 政治
  { id: 'gov_tip_reshuffle',    text: '即将换届，决策要为接班人留余地', when: { political: 'reshuffle' } },
  { id: 'gov_tip_parachute',    text: '空降身份，第一季先稳住本地关系', when: { political: 'parachute' } },
  { id: 'gov_tip_fresh',        text: '新官上任三把火，第一季给本地班子立个标准', when: { political: 'fresh' } },
  // 剧本
  { id: 'gov_tip_redm_open',    text: '危机开局，先做隐债自查 + 平台兜底优先级排序', when: { script: 'redemption' } },
  { id: 'gov_tip_v_window',     text: 'Q5 政策松时再申报特殊再融资，提前 1 季准备材料', when: { script: 'v_shape' } },
  { id: 'gov_tip_rise_save',    text: '前 4 季扩张窗口好用，但要为 Q9+ 危机留余地', when: { script: 'rise_and_fall' } },
];

const RISKS_POOL = [
  // 核心死亡 / 触发条件
  { id: 'gov_risk_debtRatio',   text: '综合债务率超 300% → 被中央约谈强制化债' },
  { id: 'gov_risk_political',   text: '政绩跌穿 20 → 被免职调离' },
  { id: 'gov_risk_hidden',      text: '隐债敞口超 200 亿 → 触发集中爆雷危机' },
  // 情境
  { id: 'gov_risk_debtZone',    text: '已是化债重点区域，初始隐债敞口高', when: { tag: 'debt_zone' } },
  { id: 'gov_risk_landDisp',    text: '土地出让受影响，财政缺口扩大', when: { tag: 'land_dispute' } },
  { id: 'gov_risk_industry',    text: '产业转型阵痛，传统税源萎缩', when: { tag: 'industry_pain' } },
  { id: 'gov_risk_population',  text: '人口持续流出，财政长期不可持续', when: { tag: 'population_drain' } },
  { id: 'gov_risk_landDep',     text: '高度依赖土地，房地产周期波动直接冲击预算', when: { fiscal: 'land_dep' } },
  { id: 'gov_risk_transferDep', text: '自有财政有限，需积极争取上级支持', when: { fiscal: 'transfer_dep' } },
  { id: 'gov_risk_reshuffle',   text: '换届期决策都要考虑接班人评价', when: { political: 'reshuffle' } },
  { id: 'gov_risk_slow',        text: 'Q1-Q4 平静是假象，Q9+ 集中爆雷', when: { script: 'slow_boil' } },
  { id: 'gov_risk_redm',        text: '危机开局，没有蜜月期', when: { script: 'redemption' } },
];

function getOnboardingHints(profile, scriptId = null) {
  return {
    goal: '存活 12 季度，期末综合债务率不超 300%、政绩不跌穿 20',
    topRisks: sampleRisks(RISKS_POOL, profile, scriptId, 3),
    firstActionHint: sampleTip(TIPS_POOL, profile, scriptId, '先观察辖区平台融资情况，必要时协调担保'),
  };
}

export const ROLE_GOV = {
  id: 'gov',
  name: '地方政府官员',
  shortName: '地方官员',
  description: '管理一个市/县的财政与债务，存活 12 季度且不被约谈/免职',

  metrics: ['fiscalRevenue', 'landRevenue', 'debtRatio', 'hiddenDebtRisk',
            'industryIndex', 'politicalScore', 'specialBondQuota', 'transferPayment'],
  metricLabels: {
    fiscalRevenue: '一般公共预算',
    landRevenue: '土地出让收入',
    debtRatio: '综合债务率',
    hiddenDebtRisk: '隐债风险敞口',
    industryIndex: '产业发展指数',
    politicalScore: '政绩评分',
    specialBondQuota: '专项债额度',
    transferPayment: '转移支付',
  },
  deathConditions: [
    { metric: 'debtRatio',      op: '>', threshold: 300, reason: '综合债务率超 300%，被中央约谈强制化债' },
    { metric: 'politicalScore', op: '<', threshold: 20,  reason: '政绩评分跌穿 20，被免职调离岗位' },
  ],
  scoreWeights: {
    liquidity: 1.0,
    costControl: 1.2,
    projectProgress: 1.0,
    compliance: 1.4,
    crisisResponse: 1.2,
    development: 1.0,
  },
  dimensionLabels: {
    liquidity: '财政平衡',
    costControl: '化债执行',
    projectProgress: '产业发展',
    compliance: '政绩合规',
    crisisResponse: '危机应对',
    development: '综合发展',
  },

  actions: GOV_ACTIONS,
  applyActionEffects: govApplyAction,
  isActionAvailable: govIsActionAvailable,

  getInitialMetrics,
  advanceTurn,
  detectCrisis,
  getOnboardingHints,
};

function round(v, n) { return parseFloat(v.toFixed(n)); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
