// js/roles.js

export const ROLE_CFO = {
  id: 'cfo',
  name: '城投财务总监',
  shortName: '财务总监',
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
};

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

export function getInitialMetrics(profile) {
  const r = REGION_MODIFIERS[profile.regionTier];
  const h = HEALTH_MODIFIERS[profile.healthLevel];
  return {
    cash: parseFloat((3.0 * r.cashMult * h.cashMult).toFixed(2)),       // 单位：亿
    creditTotal: r.creditBase,                                           // 总授信（亿）
    creditUsed: parseFloat((r.creditBase * 0.55).toFixed(2)),
    creditUsage: 55,                                                     // %
    leverageRatio: r.leverageBase + h.leverageDelta,                    // %
    financingCost: parseFloat((r.costBase + h.costDelta).toFixed(2)),  // %
    collateralRoom: profile.healthLevel === 'good' ? 'high' : (profile.healthLevel === 'medium' ? 'medium' : 'low'),
    opCostRate: 0.6,                                                     // 每季度运营成本（亿）
    projectGap: 2.1,                                                     // 每季度项目投资缺口（亿）
    debtMaturity: generateDebtSchedule(r.cashMult, h.cashMult),          // 12季度到期表
  };
}

function generateDebtSchedule(rMult, hMult) {
  // 总债务规模随财务健康度变化，分布在12季度
  const totalDebt = 50 / (rMult * hMult);
  const distribution = [0.17, 0.20, 0.12, 0.18, 0.07, 0.08, 0.13, 0.05, 0, 0, 0, 0];
  return distribution.map(p => parseFloat((totalDebt * p).toFixed(2)));
}
