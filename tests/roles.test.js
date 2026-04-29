import { describe, it, expect } from 'vitest';
import { ROLE_CFO, getInitialMetrics } from '../js/roles.js';

describe('ROLE_CFO', () => {
  it('contains all required core metrics', () => {
    expect(ROLE_CFO.metrics).toContain('cash');
    expect(ROLE_CFO.metrics).toContain('debtMaturity');
    expect(ROLE_CFO.metrics).toContain('financingCost');
    expect(ROLE_CFO.metrics).toContain('creditUsage');
    expect(ROLE_CFO.metrics).toContain('leverageRatio');
    expect(ROLE_CFO.metrics).toContain('collateralRoom');
    expect(ROLE_CFO.metrics).toContain('projectGap');
  });

  it('getInitialMetrics returns object with all metrics initialized', () => {
    const m = getInitialMetrics({ regionTier: 'central_capital', businessType: 'infrastructure', healthLevel: 'medium' });
    expect(m.cash).toBeGreaterThan(0);
    expect(m.leverageRatio).toBeGreaterThan(0).toBeLessThan(100);
  });
});
