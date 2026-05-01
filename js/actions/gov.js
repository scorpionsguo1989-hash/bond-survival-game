// js/actions/gov.js
// 地方官员角色主动操作

export const GOV_ACTIONS = [
  {
    id: 'attract_investment',
    name: '招商引资',
    desc: '投入财政资金 + 优惠政策吸引重大项目，提升产业指数 + 政绩',
    cost: 1,
    params: [{ key: 'amount', label: '投入资金（亿）', min: 1, max: 5, step: 1, default: 2 }],
  },
  {
    id: 'issue_special_bond',
    name: '发专项债',
    desc: '消耗专项债额度获取现金，但债务率上升',
    cost: 1,
    params: [{ key: 'amount', label: '发债规模（亿）', min: 2, max: 15, step: 1, default: 5 }],
  },
  {
    id: 'transfer_appeal',
    name: '向上争取转移支付',
    desc: '不确定操作：成功率与政绩 + 财政自给率挂钩',
    cost: 1,
    params: [{ key: 'amount', label: '申请规模（亿）', min: 1, max: 10, step: 1, default: 3 }],
  },
  {
    id: 'land_auction',
    name: '土地收储出让',
    desc: '推地块上市，市场冷时打折严重',
    cost: 1,
    params: [{ key: 'amount', label: '挂牌规模（亿）', min: 1, max: 8, step: 1, default: 3 }],
  },
  {
    id: 'hidden_debt_swap',
    name: '隐性债务置换',
    desc: '消耗专项债额度置换隐债，降低风险敞口 + 加分政绩',
    cost: 1,
    params: [{ key: 'amount', label: '置换规模（亿）', min: 3, max: 15, step: 1, default: 5 }],
  },
];

export function govApplyAction(state, actionId, params) {
  const m = { ...state.metrics };
  const score = { ...(state.score || {}) };
  const policyValue = state.policyValue;

  switch (actionId) {
    case 'attract_investment': {
      const amt = params.amount;
      m.cash = round(m.cash - amt, 2);
      // 政策松时招商效果好
      const policyMult = policyValue >= 0 ? 1.2 : 0.7;
      const indexGain = amt * 3 * policyMult;
      m.industryIndex = clamp(m.industryIndex + indexGain, 0, 100);
      m.politicalScore = clamp(m.politicalScore + amt * 1.5, 0, 100);
      addScore(score, 'projectProgress', 4);
      addScore(score, 'development', 2);
      break;
    }
    case 'issue_special_bond': {
      const amt = params.amount;
      // 政策紧时审批难，超过额度的部分被砍
      const policyHaircut = policyValue <= -3 ? 0.7 : 1.0;
      const actual = Math.min(amt, m.specialBondQuota) * policyHaircut;
      m.cash = round(m.cash + actual, 2);
      m.specialBondQuota = round(m.specialBondQuota - Math.min(amt, m.specialBondQuota), 2);
      m.debtRatio = round(m.debtRatio + actual * 0.6, 2);
      addScore(score, 'liquidity', 2);
      break;
    }
    case 'transfer_appeal': {
      const amt = params.amount;
      // 成功率：政绩高 + 财政依赖度高 → 成功率高
      const successProb = Math.min(0.8, m.politicalScore / 120 + 0.2);
      if (Math.random() < successProb) {
        m.cash = round(m.cash + amt, 2);
        m.transferPayment = round(m.transferPayment + amt * 0.3, 2);
        m.politicalScore = clamp(m.politicalScore + 2, 0, 100);
        addScore(score, 'crisisResponse', 3);
      } else {
        m.politicalScore = clamp(m.politicalScore - 2, 0, 100);
        addScore(score, 'crisisResponse', -2);
      }
      break;
    }
    case 'land_auction': {
      const amt = params.amount;
      // 政策紧时土地市场冷，最多打 4 折
      const landMult = Math.max(0.4, policyValue >= 0 ? 1.0 : (1 + policyValue * 0.1));
      const proceeds = amt * landMult;
      m.cash = round(m.cash + proceeds, 2);
      m.landRevenue = round(m.landRevenue + proceeds * 0.4, 2);
      addScore(score, 'liquidity', 2);
      if (landMult < 0.7) addScore(score, 'compliance', -1);  // 贱卖也算不当
      break;
    }
    case 'hidden_debt_swap': {
      const amt = params.amount;
      const used = Math.min(amt, m.specialBondQuota);
      m.specialBondQuota = round(m.specialBondQuota - used, 2);
      m.hiddenDebtRisk = round(Math.max(0, m.hiddenDebtRisk - used * 1.5), 2);
      m.debtRatio = round(m.debtRatio - used * 0.3, 2);  // 隐性转显性，债务率下降
      m.politicalScore = clamp(m.politicalScore + used * 0.6, 0, 100);
      addScore(score, 'compliance', 5);
      addScore(score, 'costControl', 4);
      break;
    }
  }

  return { ...state, metrics: m, score, actionsUsed: (state.actionsUsed || 0) + 1 };
}

export function govIsActionAvailable(state, actionId) {
  const m = state.metrics;
  switch (actionId) {
    case 'attract_investment':
      return m.cash >= 1 ? { available: true } : { available: false, reason: '财政现金不足' };
    case 'issue_special_bond':
      return m.specialBondQuota > 0 ? { available: true } : { available: false, reason: '专项债额度已用尽' };
    case 'transfer_appeal':
      return { available: true };
    case 'land_auction':
      return { available: true };
    case 'hidden_debt_swap':
      return m.specialBondQuota >= 3 ? { available: true } : { available: false, reason: '专项债额度不足，无法置换' };
    default:
      return { available: false, reason: '未知操作' };
  }
}

function round(v, n) { return parseFloat(v.toFixed(n)); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function addScore(score, dim, delta) { score[dim] = (score[dim] || 0) + delta; }
