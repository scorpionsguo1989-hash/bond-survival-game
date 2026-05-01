import { describe, it, expect } from 'vitest';
import { checkDeath } from '../js/engine.js';
import { getRole } from '../js/roles/index.js';
import { ROLE_IM } from '../js/roles/im.js';
import { imApplyAction, imIsActionAvailable } from '../js/actions/im.js';

function baseState(overrides = {}) {
  return {
    policyValue: 0,
    metrics: ROLE_IM.getInitialMetrics({ scale: 'medium', healthLevel: 'medium', tag: 'fresh_product' }),
    score: {},
    actionsUsed: 0,
    role: ROLE_IM,
    ...overrides,
  };
}

describe('IM role definition', () => {
  it('has 8 metrics including leverage', () => {
    expect(ROLE_IM.metrics).toContain('leverage');
    expect(ROLE_IM.metrics).toHaveLength(8);
  });

  it('has 5 actions', () => {
    expect(ROLE_IM.actions).toHaveLength(5);
  });

  it('has 4 death conditions (incl. liquidity squeeze)', () => {
    expect(ROLE_IM.deathConditions).toHaveLength(4);
    expect(ROLE_IM.deathConditions.map(d => d.metric)).toContain('cashRatio');
  });

  it('uses IM-specific dimension labels', () => {
    expect(ROLE_IM.dimensionLabels.costControl).toBe('收益管理');
    expect(ROLE_IM.dimensionLabels.projectProgress).toBe('信用筛选');
    expect(ROLE_IM.dimensionLabels.development).toBe('AUM 稳定性');
  });

  it('is registered in role registry', () => {
    expect(getRole('im')).toBe(ROLE_IM);
  });
});

describe('IM getInitialMetrics', () => {
  it('produces nav=1.0 and leverage=100 for normal profiles', () => {
    const m = ROLE_IM.getInitialMetrics({ scale: 'medium', healthLevel: 'medium', tag: 'fresh_product' });
    expect(m.nav).toBe(1.0);
    expect(m.leverage).toBe(100);
    expect(m.cashRatio).toBeGreaterThanOrEqual(8);
  });

  it('applies weak profile NAV buffer and higher credit exposure', () => {
    const m = ROLE_IM.getInitialMetrics({ scale: 'small', healthLevel: 'weak', tag: 'pending_redemption' });
    expect(m.nav).toBe(0.985);  // weak buffer -0.015 (post integration tuning)
    expect(m.creditExposure).toBe(49);  // softened from 50 to give weak ~30% chance
    expect(m.redemptionPressure).toBe(35);
  });
});

describe('IM advanceTurn', () => {
  it('NAV decays under tight policy + high credit exposure', () => {
    const state = baseState({
      policyValue: -3,
      metrics: ROLE_IM.getInitialMetrics({ scale: 'medium', healthLevel: 'weak', tag: 'fresh_product' }),
    });
    const { metrics } = ROLE_IM.advanceTurn(state);
    expect(metrics.nav).toBeLessThan(1.0);
  });

  it('NAV grows under loose policy', () => {
    const state = baseState({
      policyValue: 3,
      metrics: ROLE_IM.getInitialMetrics({ scale: 'medium', healthLevel: 'good', tag: 'fresh_product' }),
    });
    const { metrics } = ROLE_IM.advanceTurn(state);
    expect(metrics.nav).toBeGreaterThan(1.0);
  });

  it('redemption pressure rises when NAV drops', () => {
    const state = baseState({
      policyValue: -3,
      metrics: {
        ...ROLE_IM.getInitialMetrics({ scale: 'medium', healthLevel: 'weak', tag: 'fresh_product' }),
        redemptionPressure: 10,
      },
    });
    const { metrics } = ROLE_IM.advanceTurn(state);
    expect(metrics.redemptionPressure).toBeGreaterThan(10);
  });

  it('leverage decays by 2 each turn but not below 100', () => {
    const state = baseState({ metrics: { ...baseState().metrics, leverage: 120 } });
    expect(ROLE_IM.advanceTurn(state).metrics.leverage).toBe(118);

    const minState = baseState({ metrics: { ...baseState().metrics, leverage: 100 } });
    expect(ROLE_IM.advanceTurn(minState).metrics.leverage).toBe(100);
  });

  it('triggers partial redemption when pressure >= 60 (post-tuning threshold)', () => {
    const state = baseState({ metrics: { ...baseState().metrics, redemptionPressure: 70, aum: 200, cashRatio: 20 } });
    const { metrics } = ROLE_IM.advanceTurn(state);
    expect(metrics.aum).toBeLessThan(200);
    expect(metrics.cashRatio).toBeLessThan(20);
  });
});

describe('IM actions', () => {
  it('buy_bond increases aum and decreases cashRatio', () => {
    const state = baseState();
    const next = imApplyAction(state, 'buy_bond', { amount: 5, durationTilt: 1, creditTilt: -1 });
    expect(next.metrics.aum).toBeGreaterThan(state.metrics.aum);
    expect(next.metrics.cashRatio).toBeLessThan(state.metrics.cashRatio);
    expect(next.metrics.duration).toBeGreaterThan(state.metrics.duration);
    expect(next.metrics.creditExposure).toBeLessThan(state.metrics.creditExposure);
  });

  it('repo_leverage allows leverage above 140 but caps hard at 160 with compliance penalty', () => {
    const state = baseState({ metrics: { ...baseState().metrics, leverage: 135 } });
    const next = imApplyAction(state, 'repo_leverage', { amount: 20 });
    expect(next.metrics.leverage).toBe(155);
    expect(next.score.compliance).toBeLessThan(0);
  });

  it('repo_leverage is unavailable at 140', () => {
    const state = baseState({ metrics: { ...baseState().metrics, leverage: 140 } });
    expect(imIsActionAvailable(state, 'repo_leverage').available).toBe(false);
  });

  it('manage_expectation reduces redemptionPressure', () => {
    const state = baseState({ metrics: { ...baseState().metrics, redemptionPressure: 50 } });
    const next = imApplyAction(state, 'manage_expectation', { intensity: 2 });
    expect(next.metrics.redemptionPressure).toBe(34);
    expect(next.score.crisisResponse).toBeGreaterThan(0);
  });

  it('sell_bond increases cashRatio after market haircut', () => {
    const state = baseState({ policyValue: -3 });
    const next = imApplyAction(state, 'sell_bond', { amount: 5 });
    expect(next.metrics.aum).toBeLessThan(state.metrics.aum);
    expect(next.metrics.cashRatio).toBeGreaterThan(state.metrics.cashRatio);
  });
});

describe('IM death and crisis', () => {
  it('detects nav death condition', () => {
    const result = checkDeath(baseState({ metrics: { ...baseState().metrics, nav: 0.85 } }));
    expect(result.dead).toBe(true);
    expect(result.reason).toContain('净值');
  });

  it('detects concentration death condition', () => {
    const result = checkDeath(baseState({ metrics: { ...baseState().metrics, concentration: 26 } }));
    expect(result.dead).toBe(true);
    expect(result.reason).toContain('集中度');
  });

  it('detects redemption crisis at pressure >= 80', () => {
    const crisis = ROLE_IM.detectCrisis(baseState({ metrics: { ...baseState().metrics, redemptionPressure: 82 } }));
    expect(crisis.type).toBe('redemption_run');
    expect(crisis.options).toHaveLength(3);
  });
});
