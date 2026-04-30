// tests/engine.test.js
import { describe, it, expect } from 'vitest';
import { createInitialState, advanceTurn, applyEventChoice, checkDeath } from '../js/engine.js';

const sampleOrigin = {
  role: 'cfo', regionTier: 'central_capital', businessType: 'infrastructure',
  healthLevel: 'medium', tag: 'leadership_change',
  platformName: '淮西市城投', directorName: '张明远',
  labels: { region: '中部省会', business: '基础设施', health: '一般', tag: '领导班子刚换' },
  challenges: ['c1', 'c2', 'c3'],
};

describe('createInitialState', () => {
  it('initializes year/quarter/policy/metrics', () => {
    const s = createInitialState(sampleOrigin);
    expect(s.year).toBe(2022);
    expect(s.quarter).toBe(1);
    expect(s.policyValue).toBe(-2);
    expect(s.metrics.cash).toBeGreaterThan(0);
    expect(s.actionsUsed).toBe(0);
    expect(s.survived).toBe(true);
  });
});

describe('advanceTurn', () => {
  it('advances quarter', () => {
    const s = createInitialState(sampleOrigin);
    const next = advanceTurn(s);
    expect(next.quarter).toBe(2);
  });

  it('rolls year on Q4->Q1', () => {
    const s = { ...createInitialState(sampleOrigin), quarter: 4 };
    const next = advanceTurn(s);
    expect(next.quarter).toBe(1);
    expect(next.year).toBe(2023);
  });

  it('settles maturing debt and ops cost', () => {
    const s = createInitialState(sampleOrigin);
    s.metrics.cash = 100;
    s.metrics.debtMaturity = [5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const next = advanceTurn(s);
    expect(next.metrics.cash).toBeLessThan(100);
  });
});

describe('checkDeath', () => {
  it('marks dead when cash <= 0', () => {
    const s = { metrics: { cash: 0 }, year: 2023, quarter: 1 };
    const result = checkDeath(s);
    expect(result.dead).toBe(true);
    expect(result.reason).toContain('现金');
  });
});
