import { describe, it, expect } from 'vitest';
import { computeFinalScore, getScoreGrade } from '../js/score.js';

describe('computeFinalScore', () => {
  it('returns six dimensions', () => {
    const state = {
      score: { '流动性管理': 30, '融资成本控制': 20, '项目推进': 25, '合规指数': 35, '危机应对': 28, '综合发展': 22 },
      metrics: { cash: 5, leverageRatio: 65, financingCost: 5.5, collateralRoom: 'medium' },
      survived: true,
      quartersPassed: 12,
    };
    const result = computeFinalScore(state);
    expect(Object.keys(result.dimensions)).toHaveLength(6);
    expect(result.total).toBeGreaterThan(0);
    expect(result.total).toBeLessThanOrEqual(100);
  });

  it('penalizes failed run', () => {
    const failed = { score: {}, metrics: { cash: 0, leverageRatio: 90, financingCost: 8, collateralRoom: 'low' }, survived: false, quartersPassed: 5 };
    const result = computeFinalScore(failed);
    expect(result.total).toBeLessThan(40);
  });
});

describe('getScoreGrade', () => {
  it('maps total to grade', () => {
    expect(getScoreGrade(95).grade).toBe('S');
    expect(getScoreGrade(80).grade).toBe('A');
    expect(getScoreGrade(65).grade).toBe('B');
    expect(getScoreGrade(50).grade).toBe('C');
    expect(getScoreGrade(30).grade).toBe('D');
  });
});
