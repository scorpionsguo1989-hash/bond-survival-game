// js/score.js
// 评分维度 key 全部用内部 English（Plan 3 T3）
// UI 渲染时由 state.role.dimensionLabels 翻译为角色专属中文标签

const DIM_MAX_RAW = 50;  // 各维度原始分理论上限

// 内部维度 key（6 个）
const DIM_KEYS = ['liquidity', 'costControl', 'projectProgress', 'compliance', 'crisisResponse', 'development'];

export function computeFinalScore(state) {
  const dimensions = {};

  // CFO 公式（基于 cash/financingCost/leverageRatio）
  // IM 角色在 T6 实装时引擎会用 state.role 钩子覆盖；此处保留 CFO 公式做兼容默认
  const m = state.metrics;
  const isCfo = !!m.cash && !!m.financingCost;  // 简单判定（CFO 才有这两个指标）

  // 1. 流动性
  const liquidityFromMetric = isCfo ? Math.min(20, m.cash * 4) : 0;
  dimensions.liquidity = clamp(((state.score?.liquidity || 0) + liquidityFromMetric + 30) / DIM_MAX_RAW * 100);

  // 2. 融资成本（IM 时复用为"收益管理"）
  const costFromMetric = isCfo ? Math.max(0, 30 - (m.financingCost - 4) * 8) : 0;
  dimensions.costControl = clamp(((state.score?.costControl || 0) + costFromMetric + 15) / DIM_MAX_RAW * 100);

  // 3. 项目推进（IM 时复用为"信用筛选"）
  dimensions.projectProgress = clamp(((state.score?.projectProgress || 0) + 25) / DIM_MAX_RAW * 100);

  // 4. 合规指数
  dimensions.compliance = clamp(((state.score?.compliance || 0) + 25) / DIM_MAX_RAW * 100);

  // 5. 危机应对
  dimensions.crisisResponse = clamp(((state.score?.crisisResponse || 0) + 25) / DIM_MAX_RAW * 100);

  // 6. 综合发展（IM 时复用为"AUM 稳定性"）
  const leverageScore = isCfo ? Math.max(0, 30 - (m.leverageRatio - 60) * 1.5) : 0;
  dimensions.development = clamp(((state.score?.development || 0) + leverageScore + 10) / DIM_MAX_RAW * 100);

  // 加权求和（角色提供 scoreWeights；缺失时按 1.0 算）
  const weights = state.role?.scoreWeights || Object.fromEntries(DIM_KEYS.map(k => [k, 1.0]));
  const totalWeight = DIM_KEYS.reduce((s, k) => s + (weights[k] || 1), 0);
  let total = DIM_KEYS.reduce((s, k) => s + dimensions[k] * (weights[k] || 1), 0) / totalWeight;

  // 失败惩罚：未存活 -60%
  if (!state.survived) {
    total = total * 0.4;
    DIM_KEYS.forEach(k => dimensions[k] = dimensions[k] * 0.4);
  }

  // UI 友好：把内部 English key 翻译为角色中文标签
  const labels = state.role?.dimensionLabels || {
    liquidity: '流动性管理', costControl: '融资成本控制', projectProgress: '项目推进',
    compliance: '合规指数', crisisResponse: '危机应对', development: '综合发展',
  };
  const labeledDimensions = {};
  DIM_KEYS.forEach(k => labeledDimensions[labels[k]] = dimensions[k]);

  return {
    dimensions: labeledDimensions,
    dimensionsRaw: dimensions,           // 内部 English key 版本（测试用）
    total: Math.round(total),
    grade: getScoreGrade(Math.round(total)),
    survived: state.survived,
    quartersPassed: state.quartersPassed,
  };
}

function clamp(v) { return Math.max(0, Math.min(100, v)); }

export function getScoreGrade(total) {
  if (total >= 90) return { grade: 'S', label: '传奇' };
  if (total >= 75) return { grade: 'A', label: '优秀' };
  if (total >= 60) return { grade: 'B', label: '及格' };
  if (total >= 40) return { grade: 'C', label: '勉强' };
  return { grade: 'D', label: '失败' };
}
