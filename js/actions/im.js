// js/actions/im.js
// 投资经理角色主动操作定义与效果

export const IM_ACTIONS = [
  {
    id: 'buy_bond',
    name: '买入债券',
    desc: '加仓债券，可选久期/评级；消耗现金比例',
    cost: 1,
    params: [
      { key: 'amount', label: '买入规模（亿）', min: 1, max: 20, step: 1, default: 5 },
      { key: 'durationTilt', label: '久期倾向', min: -1, max: 1, step: 1, default: 0 },
      { key: 'creditTilt', label: '信用倾向', min: -1, max: 1, step: 1, default: 0 },
    ],
  },
  {
    id: 'sell_bond',
    name: '卖出债券',
    desc: '减仓回笼现金，市价折损',
    cost: 1,
    params: [{ key: 'amount', label: '卖出规模（亿）', min: 1, max: 30, step: 1, default: 5 }],
  },
  {
    id: 'repo_leverage',
    name: '回购加杠杆',
    desc: '短借现金加仓，杠杆率上限 140%',
    cost: 1,
    params: [{ key: 'amount', label: '杠杆规模（亿）', min: 1, max: 20, step: 1, default: 5 }],
  },
  {
    id: 'restructure',
    name: '调整持仓结构',
    desc: '卖差券买好券，降信用敞口',
    cost: 1,
    params: [{ key: 'amount', label: '调整规模（亿）', min: 1, max: 15, step: 1, default: 5 }],
  },
  {
    id: 'manage_expectation',
    name: '管理客户预期',
    desc: '降低赎回压力，"画饼"代价',
    cost: 1,
    params: [{ key: 'intensity', label: '强度', min: 1, max: 3, step: 1, default: 2 }],
  },
];

export function imApplyAction(state, actionId, params) {
  const m = { ...state.metrics };
  const score = { ...(state.score || {}) };

  switch (actionId) {
    case 'buy_bond': {
      const cost = params.amount;
      m.cashRatio = round(m.cashRatio - (cost / m.aum) * 100, 2);
      m.aum = round(m.aum + cost, 2);
      m.duration = clamp(m.duration + params.durationTilt * 0.3, 0.5, 7);
      m.creditExposure = clamp(m.creditExposure + params.creditTilt * 5, 0, 100);
      // 集中度允许冲过 25 死亡线（buy_bond 是玩家主动选择的风险敞口）
      m.concentration = Math.min(35, m.concentration + (cost > 5 ? 2 : 0.5));
      addScore(score, 'projectProgress', 2);
      break;
    }
    case 'sell_bond': {
      const lossPct = state.policyValue <= -2 ? 0.025 : 0.01;
      const cashIn = params.amount * (1 - lossPct);
      m.aum = round(m.aum - params.amount, 2);
      m.cashRatio = m.aum > 0 ? round(m.cashRatio + (cashIn / m.aum) * 100, 2) : 0;
      addScore(score, 'liquidity', 3);
      break;
    }
    case 'repo_leverage': {
      const newLeverage = m.leverage + params.amount;
      if (newLeverage > 140) {
        addScore(score, 'compliance', -10);
        addScore(score, 'crisisResponse', -5);
      }
      m.leverage = Math.min(160, newLeverage);
      m.aum = round(m.aum + params.amount, 2);
      m.cashRatio = round(m.cashRatio + (params.amount / m.aum) * 100, 2);
      break;
    }
    case 'restructure': {
      m.creditExposure = Math.max(0, m.creditExposure - params.amount * 0.8);
      m.cashRatio = round(m.cashRatio - 1.5, 2);
      addScore(score, 'compliance', 3);
      addScore(score, 'projectProgress', 2);
      break;
    }
    case 'manage_expectation': {
      m.redemptionPressure = Math.max(0, m.redemptionPressure - params.intensity * 8);
      addScore(score, 'compliance', -2);
      addScore(score, 'crisisResponse', 3);
      break;
    }
  }

  return { ...state, metrics: m, score, actionsUsed: (state.actionsUsed || 0) + 1 };
}

export function imIsActionAvailable(state, actionId) {
  const m = state.metrics;
  switch (actionId) {
    case 'buy_bond':
      return m.cashRatio >= 5 ? { available: true } : { available: false, reason: '现金比例 < 5%，无法买入' };
    case 'repo_leverage':
      return m.leverage < 140 ? { available: true } : { available: false, reason: '杠杆已达 140% 上限' };
    case 'sell_bond':
      return m.aum > 1 ? { available: true } : { available: false, reason: 'AUM 太低无法卖出' };
    case 'restructure':
      return m.cashRatio >= 2 ? { available: true } : { available: false, reason: '现金比例不足' };
    case 'manage_expectation':
      return { available: true };
    default:
      return { available: false, reason: '未知操作' };
  }
}

function round(v, n) { return parseFloat(v.toFixed(n)); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function addScore(score, dim, delta) { score[dim] = (score[dim] || 0) + delta; }
