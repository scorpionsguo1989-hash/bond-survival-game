// js/score.js
// 评分维度 key 全部用内部 English（Plan 3 T3）
// UI 渲染时由 state.role.dimensionLabels 翻译为角色专属中文标签

const DIM_MAX_RAW = 50;  // 各维度原始分理论上限

// 内部维度 key（6 个）
const DIM_KEYS = ['liquidity', 'costControl', 'projectProgress', 'compliance', 'crisisResponse', 'development'];

// 各维度的保底基数：一局什么都没做也能拿到的分，决定"零分局"的落点
const DIM_BASE = {
  liquidity: 30, costControl: 15, projectProgress: 25,
  compliance: 25, crisisResponse: 25, development: 10,
};

export function computeFinalScore(state) {
  const dimensions = {};

  // 指标贡献由角色自己提供（role.scoreContributions），每个角色挂 3 个维度到自己的核心指标上。
  // 原实现靠 `!!m.cash && !!m.financingCost` 猜角色，导致 IM/GOV 的三个维度恒为常数、
  // 与实际经营完全脱钩，并且 CFO 现金恰好归零时会误判成非 CFO。
  const contributions = state.role?.scoreContributions?.(state) || {};

  DIM_KEYS.forEach(key => {
    const fromEvents = state.score?.[key] || 0;
    const fromMetrics = contributions[key] || 0;
    dimensions[key] = clamp((fromEvents + fromMetrics + DIM_BASE[key]) / DIM_MAX_RAW * 100);
  });

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
