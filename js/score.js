// js/score.js
import { SCORE_DIMENSIONS } from './config.js';

const DIM_MAX_RAW = 50;  // 各维度原始分理论上限

export function computeFinalScore(state) {
  const dimensions = {};

  // 1. 流动性管理：现金充足度 + 玩家行动评分
  const liquidityFromMetric = Math.min(20, state.metrics.cash * 4);
  dimensions['流动性管理'] = clamp(((state.score?.['流动性管理'] || 0) + liquidityFromMetric + 30) / DIM_MAX_RAW * 100);

  // 2. 融资成本控制：综合融资成本越低越高
  const costFromMetric = Math.max(0, 30 - (state.metrics.financingCost - 4) * 8);
  dimensions['融资成本控制'] = clamp(((state.score?.['融资成本控制'] || 0) + costFromMetric + 15) / DIM_MAX_RAW * 100);

  // 3. 项目推进：玩家行动累积
  dimensions['项目推进'] = clamp(((state.score?.['项目推进'] || 0) + 25) / DIM_MAX_RAW * 100);

  // 4. 合规指数：玩家行动累积
  dimensions['合规指数'] = clamp(((state.score?.['合规指数'] || 0) + 25) / DIM_MAX_RAW * 100);

  // 5. 危机应对：玩家行动累积
  dimensions['危机应对'] = clamp(((state.score?.['危机应对'] || 0) + 25) / DIM_MAX_RAW * 100);

  // 6. 综合发展：杠杆率改善 + 综合
  const leverageScore = Math.max(0, 30 - (state.metrics.leverageRatio - 60) * 1.5);
  dimensions['综合发展'] = clamp(((state.score?.['综合发展'] || 0) + leverageScore + 10) / DIM_MAX_RAW * 100);

  let total = SCORE_DIMENSIONS.reduce((s, d) => s + dimensions[d], 0) / SCORE_DIMENSIONS.length;

  // 失败惩罚：未存活 -50%
  if (!state.survived) {
    total = total * 0.4;
    SCORE_DIMENSIONS.forEach(d => dimensions[d] = dimensions[d] * 0.4);
  }

  return {
    dimensions,
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
