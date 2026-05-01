// js/roles/im.js
// 债券基金经理 / 投资经理角色定义
import { IM_ACTIONS, imApplyAction, imIsActionAvailable } from '../actions/im.js';

const SCALE_PROFILES = {
  large: { initialAum: 500, cashRatio: 12 },
  medium: { initialAum: 200, cashRatio: 10 },
  small: { initialAum: 80, cashRatio: 8 },
};

const HEALTH_PROFILES = {
  good: { creditExposure: 15, concentration: 8, initialNavBuffer: 0 },
  medium: { creditExposure: 30, concentration: 12, initialNavBuffer: 0 },
  weak: { creditExposure: 50, concentration: 14, initialNavBuffer: -0.02 },
};

function getInitialMetrics(profile) {
  const sp = SCALE_PROFILES[profile.scale] || SCALE_PROFILES.medium;
  const hp = HEALTH_PROFILES[profile.healthLevel] || HEALTH_PROFILES.medium;
  return {
    nav: 1.0 + hp.initialNavBuffer,
    aum: sp.initialAum,
    cashRatio: sp.cashRatio,
    duration: 2.5,
    concentration: hp.concentration,
    creditExposure: hp.creditExposure,
    redemptionPressure: profile.tag === 'pending_redemption' ? 35 : 10,
    leverage: 100,
  };
}

function advanceTurn(state) {
  const { policyValue, metrics } = state;
  let { nav, aum, cashRatio, duration, concentration, creditExposure, redemptionPressure, leverage } = metrics;

  // NAV 漂移公式（联调调参后，目标通关率 ~70%）：
  //   - 票息基础收益 1.0%/季（年化 ~4%）
  //   - 政策影响 0.005（政策紧时久期长会更痛）
  //   - 信用惩罚 0.009（政策紧时高信用敞口吃亏）
  const policyContrib = policyValue * 0.005 * (duration / 3);
  const creditPenalty = (policyValue < 0 ? Math.abs(policyValue) : 0) * (creditExposure / 100) * 0.015;
  const baseYield = 0.009;
  const leverageMultiplier = leverage / 100;
  const navDelta = (baseYield + policyContrib - creditPenalty) * leverageMultiplier;
  nav = round(nav * (1 + navDelta), 4);

  const navMomentum = navDelta < 0 ? Math.abs(navDelta) * 800 : -5;
  const policyMomentum = policyValue < -2 ? 8 : 0;
  redemptionPressure = clamp(redemptionPressure + navMomentum + policyMomentum, 0, 100);

  // 赎回触发阈值 60，redeemRatio 公式更温和
  // 设计：good 玩家不会触发，medium 偶尔触发但能撑过去，weak 持续触发但仍有机会
  if (redemptionPressure >= 60 && aum > 0) {
    const redeemRatio = (redemptionPressure - 55) / 350;  // 1.4% - 13%
    const redeemAmount = aum * redeemRatio;
    aum = round(aum - redeemAmount, 2);
    cashRatio = aum > 0 ? round((cashRatio * (aum + redeemAmount) - redeemAmount * 100) / aum, 2) : 0;
  }

  leverage = Math.max(100, leverage - 2);

  return {
    metrics: { nav, aum, cashRatio, duration, concentration, creditExposure, redemptionPressure, leverage },
    score: state.score,
  };
}

function detectCrisis(state) {
  const m = state.metrics;
  if (m.redemptionPressure >= 80) {
    return {
      type: 'redemption_run',
      title: '⚠ 赎回挤兑警报',
      body: `赎回压力指数 ${Math.round(m.redemptionPressure)}，临近挤兑临界值。处理失败可能导致流动性枯竭。`,
      metrics: [
        { label: '赎回压力', value: `${Math.round(m.redemptionPressure)}` },
        { label: '现金比例', value: `${m.cashRatio.toFixed(1)}%` },
        { label: '组合净值', value: m.nav.toFixed(4) },
      ],
      options: [
        { label: '紧急砍仓回笼现金', cost: '中高', desc: '牺牲部分净值和规模，优先保证流动性。', effects: { cashRatio: 5, aum: -10, 'score.crisisResponse': 5 } },
        { label: '管理客户预期', cost: '中（不确定）', desc: '通过渠道沟通稳住客户，但承诺过度会损害合规评价。', effects: { redemptionPressure: -20, 'score.compliance': -3, _uncertain: 0.6 } },
        { label: '硬扛过去', cost: '高（不确定）', desc: '不主动处理，赌市场情绪自然恢复。', effects: { redemptionPressure: 5, _uncertain: 0.3 } },
      ],
    };
  }
  return null;
}

function getOnboardingHints(profile) {
  const heavy = profile.healthLevel === 'weak';
  return {
    goal: '存活 12 季度，期末净值不跌穿 0.85',
    topRisks: [
      '净值跌穿 0.85 → 产品清盘',
      '单券集中度超 25% → 监管约谈',
      '赎回压力失控 → 现金穿底 → NAV 加速下跌',
      heavy ? '当前持仓重仓弱资质，赎回潮容易踩踏' : null,
    ].filter(Boolean),
    firstActionHint: heavy
      ? '第一回合先卖出 3-5 亿弱资质券，把信用敞口压下来'
      : '观察政策方向，政策松时拉久期，紧时压久期',
  };
}

export const ROLE_IM = {
  id: 'im',
  name: '债券基金经理',
  shortName: '基金经理',
  description: '管理一只债券组合，存活 12 季度且净值不跌穿预警线',

  metrics: ['nav', 'aum', 'cashRatio', 'duration', 'concentration', 'creditExposure', 'redemptionPressure', 'leverage'],
  metricLabels: {
    nav: '组合净值',
    aum: '持仓规模',
    cashRatio: '现金比例',
    duration: '组合久期',
    concentration: '最大单券集中度',
    creditExposure: 'AA及以下占比',
    redemptionPressure: '赎回压力',
    leverage: '回购杠杆率',
  },
  deathConditions: [
    { metric: 'nav', op: '<=', threshold: 0.85, reason: '净值跌穿 0.85，产品被迫清盘' },
    { metric: 'concentration', op: '>', threshold: 25, reason: '单券集中度超 25%，被监管约谈处罚' },
    { metric: 'leverage', op: '>', threshold: 140, reason: '杠杆超 140%，触发监管强制降杠杆' },
    // 流动性挤兑硬死亡：极端情况兜底（cashRatio 极度恶化时仍未死于 NAV）
    { metric: 'cashRatio', op: '<', threshold: -300, reason: '流动性彻底枯竭，组合被强制清算' },
  ],
  scoreWeights: {
    liquidity: 1.2,
    costControl: 1.0,
    projectProgress: 0.8,
    compliance: 1.4,
    crisisResponse: 1.4,
    development: 1.0,
  },
  dimensionLabels: {
    liquidity: '流动性管理',
    costControl: '收益管理',
    projectProgress: '信用筛选',
    compliance: '合规指数',
    crisisResponse: '危机应对',
    development: 'AUM 稳定性',
  },

  actions: IM_ACTIONS,
  applyActionEffects: imApplyAction,
  isActionAvailable: imIsActionAvailable,

  getInitialMetrics,
  advanceTurn,
  detectCrisis,
  getOnboardingHints,
};

function round(v, n) { return parseFloat(v.toFixed(n)); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
