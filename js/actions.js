// js/actions.js

export const CFO_ACTIONS = [
  {
    id: 'bank_loan',
    name: '申请银行续贷',
    desc: '使用未占用授信额度借款，到账快但占用授信',
    cost: 1,
    params: [{ key: 'amount', label: '借款金额（亿）', min: 0.5, max: 5, step: 0.5, default: 2 }],
  },
  {
    id: 'bond_issue',
    name: '发行城投债',
    desc: '在公开市场发债，成本较低但受窗口限制',
    cost: 1,
    params: [{ key: 'amount', label: '发行规模（亿）', min: 1, max: 8, step: 1, default: 3 }],
  },
  {
    id: 'asset_disposal',
    name: '资产处置变现',
    desc: '出售土地或股权获取现金，消耗抵押物空间',
    cost: 1,
    params: [{ key: 'amount', label: '处置规模（亿）', min: 1, max: 5, step: 0.5, default: 2 }],
  },
  {
    id: 'non_standard',
    name: '⚠ 非标融资',
    desc: '紧急情况使用，成本高且后遗症大',
    cost: 1,
    params: [{ key: 'amount', label: '融资规模（亿）', min: 1, max: 4, step: 0.5, default: 2 }],
  },
  {
    id: 'pre_funding',
    name: '提前备款',
    desc: '从经营现金流中预留资金应对到期',
    cost: 1,
    params: [{ key: 'amount', label: '备款金额（亿）', min: 0.5, max: 3, step: 0.5, default: 1 }],
  },
];

export function isActionAvailable(state, actionId) {
  const m = state.metrics;
  switch (actionId) {
    case 'bank_loan':
      if (m.creditUsed >= m.creditTotal) return { available: false, reason: '授信已用尽' };
      return { available: true };
    case 'bond_issue':
      if (state.policyValue <= -4) return { available: false, reason: '政策极紧，发债窗口关闭' };
      return { available: true };
    case 'asset_disposal':
      if (m.collateralRoom === 'low') return { available: false, reason: '抵押物已用尽' };
      return { available: true };
    case 'non_standard':
      if (state.policyValue <= -3) return { available: false, reason: '监管严格，非标已被禁' };
      return { available: true };
    case 'pre_funding':
      return { available: true };
    default:
      return { available: false, reason: '未知操作' };
  }
}

export function applyAction(state, actionId, params) {
  const newMetrics = { ...state.metrics };
  const newScore = { ...(state.score || {}) };
  let newPolicyValue = state.policyValue;

  switch (actionId) {
    case 'bank_loan': {
      const amt = params.amount;
      newMetrics.cash = parseFloat((newMetrics.cash + amt).toFixed(2));
      newMetrics.creditUsed = parseFloat((newMetrics.creditUsed + amt).toFixed(2));
      newMetrics.creditUsage = Math.round((newMetrics.creditUsed / newMetrics.creditTotal) * 100);
      addScore(newScore, '流动性管理', 2);
      break;
    }
    case 'bond_issue': {
      const amt = params.amount;
      newMetrics.cash = parseFloat((newMetrics.cash + amt).toFixed(2));
      // 政策越紧成本越高
      const costAdjust = state.policyValue <= -2 ? 0.3 : 0;
      newMetrics.financingCost = parseFloat((newMetrics.financingCost + costAdjust).toFixed(2));
      addScore(newScore, '融资成本控制', state.policyValue >= 0 ? 4 : 1);
      break;
    }
    case 'asset_disposal': {
      const amt = params.amount;
      // 资产处置打折15%
      const cashIn = parseFloat((amt * 0.85).toFixed(2));
      newMetrics.cash = parseFloat((newMetrics.cash + cashIn).toFixed(2));
      newMetrics.collateralRoom = downgradeCollateral(newMetrics.collateralRoom);
      newMetrics.leverageRatio = parseFloat((newMetrics.leverageRatio - 1.5).toFixed(1));
      addScore(newScore, '流动性管理', -2);
      break;
    }
    case 'non_standard': {
      const amt = params.amount;
      newMetrics.cash = parseFloat((newMetrics.cash + amt).toFixed(2));
      newMetrics.financingCost = parseFloat((newMetrics.financingCost + 0.8).toFixed(2));
      addScore(newScore, '合规指数', -8);
      addScore(newScore, '融资成本控制', -5);
      break;
    }
    case 'pre_funding': {
      const amt = params.amount;
      newMetrics.cash = parseFloat((newMetrics.cash + amt * 0.6).toFixed(2));
      newMetrics.opCostRate = parseFloat((newMetrics.opCostRate + 0.1).toFixed(2));
      addScore(newScore, '流动性管理', 3);
      break;
    }
  }

  return {
    ...state,
    metrics: newMetrics,
    score: newScore,
    policyValue: newPolicyValue,
    actionsUsed: (state.actionsUsed || 0) + 1,
  };
}

function downgradeCollateral(level) {
  if (level === 'high') return 'medium';
  if (level === 'medium') return 'low';
  return 'low';
}

function addScore(score, dim, delta) {
  score[dim] = (score[dim] || 0) + delta;
}
