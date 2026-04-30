import { describe, it, expect } from 'vitest';
import { generateOrigin, computeChallengeScore } from '../js/origins.js';

describe('generateOrigin', () => {
  it('returns object with all four dimensions', () => {
    const o = generateOrigin('cfo');
    expect(o.regionTier).toBeDefined();
    expect(o.businessType).toBeDefined();
    expect(o.healthLevel).toBeDefined();
    expect(o.tag).toBeDefined();
    expect(o.platformName).toBeDefined();
    expect(o.directorName).toBeDefined();
  });

  it('generates challenge score in target range (15-25)', () => {
    for (let i = 0; i < 50; i++) {
      const o = generateOrigin('cfo');
      const score = computeChallengeScore(o);
      expect(score).toBeGreaterThanOrEqual(15);
      expect(score).toBeLessThanOrEqual(25);
    }
  });

  it('generates challenges array with 3 items', () => {
    const o = generateOrigin('cfo');
    expect(o.challenges).toHaveLength(3);
  });
});
