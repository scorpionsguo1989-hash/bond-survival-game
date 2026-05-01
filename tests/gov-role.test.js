// tests/gov-role.test.js
// Plan 4 T1: GOV 角色单元测试
import { describe, it, expect } from 'vitest';
import { checkDeath } from '../js/engine.js';
import { getRole } from '../js/roles/index.js';
import { ROLE_GOV } from '../js/roles/gov.js';
import { govApplyAction, govIsActionAvailable } from '../js/actions/gov.js';

function baseState(overrides = {}) {
  return {
    policyValue: 0,
    metrics: ROLE_GOV.getInitialMetrics({ cityTier: 'prefecture', fiscalStatus: 'self_sufficient', tag: 'central_partner' }),
    score: {},
    actionsUsed: 0,
    role: ROLE_GOV,
    ...overrides,
  };
}

describe('GOV role definition', () => {
  it('has 8 metrics', () => {
    expect(ROLE_GOV.metrics).toHaveLength(8);
    expect(ROLE_GOV.metrics).toContain('debtRatio');
    expect(ROLE_GOV.metrics).toContain('hiddenDebtRisk');
    expect(ROLE_GOV.metrics).toContain('politicalScore');
  });

  it('has 5 actions', () => {
    expect(ROLE_GOV.actions).toHaveLength(5);
  });

  it('has 2 death conditions (debtRatio + politicalScore)', () => {
    expect(ROLE_GOV.deathConditions).toHaveLength(2);
  });

  it('uses GOV-specific dimension labels', () => {
    expect(ROLE_GOV.dimensionLabels.liquidity).toBe('财政平衡');
    expect(ROLE_GOV.dimensionLabels.costControl).toBe('化债执行');
    expect(ROLE_GOV.dimensionLabels.compliance).toBe('政绩合规');
  });

  it('is registered in role registry', () => {
    expect(getRole('gov')).toBe(ROLE_GOV);
  });
});

describe('GOV getInitialMetrics', () => {
  it('strong capital + self_sufficient → low debtRatio + high specialBondQuota', () => {
    const m = ROLE_GOV.getInitialMetrics({ cityTier: 'strong_capital', fiscalStatus: 'self_sufficient', tag: 'central_partner' });
    expect(m.debtRatio).toBeLessThan(220);
    expect(m.specialBondQuota).toBeGreaterThanOrEqual(28);
  });

  it('debt_zone tag pushes hiddenDebtRisk and debtRatio up', () => {
    const a = ROLE_GOV.getInitialMetrics({ cityTier: 'county', fiscalStatus: 'transfer_dep', tag: 'central_partner' });
    const b = ROLE_GOV.getInitialMetrics({ cityTier: 'county', fiscalStatus: 'transfer_dep', tag: 'debt_zone' });
    expect(b.hiddenDebtRisk).toBeGreaterThan(a.hiddenDebtRisk);
    expect(b.debtRatio).toBeGreaterThan(a.debtRatio);
  });
});

describe('GOV advanceTurn', () => {
  it('cash gets quarterly fiscal income + transfer + land revenue', () => {
    const state = baseState();
    const initialCash = state.metrics.cash;
    const { metrics } = ROLE_GOV.advanceTurn(state);
    // 季度入账 + 转移 + 土地 - 运营 - 化债 ≈ 净增正值（中性政策 + 中等政绩）
    expect(metrics.cash).toBeGreaterThan(initialCash);
  });

  it('hiddenDebtRisk decreases when cash >= debtServiceTarget', () => {
    const state = baseState({
      metrics: { ...baseState().metrics, hiddenDebtRisk: 100, cash: 10 },
    });
    const { metrics } = ROLE_GOV.advanceTurn(state);
    expect(metrics.hiddenDebtRisk).toBeLessThan(100);
  });

  it('hiddenDebtRisk grows when cash < debtServiceTarget', () => {
    const state = baseState({
      metrics: { ...baseState().metrics, hiddenDebtRisk: 50, cash: 0.5, fiscalRevenue: 0, landRevenue: 0, transferPayment: 0 },
    });
    const { metrics } = ROLE_GOV.advanceTurn(state);
    expect(metrics.hiddenDebtRisk).toBeGreaterThan(50);
    expect(metrics.politicalScore).toBeLessThan(state.metrics.politicalScore);
  });

  it('industryIndex decays naturally', () => {
    const state = baseState({ metrics: { ...baseState().metrics, industryIndex: 60 } });
    const { metrics } = ROLE_GOV.advanceTurn(state);
    expect(metrics.industryIndex).toBeLessThan(60);
  });

  it('land revenue takes haircut under tight policy', () => {
    const tight = baseState({ policyValue: -4 });
    const neutral = baseState({ policyValue: 0 });
    const tightAfter = ROLE_GOV.advanceTurn(tight).metrics.cash;
    const neutralAfter = ROLE_GOV.advanceTurn(neutral).metrics.cash;
    expect(tightAfter).toBeLessThan(neutralAfter);
  });
});

describe('GOV actions', () => {
  it('attract_investment costs cash, gains industryIndex + political', () => {
    const state = baseState();
    const next = govApplyAction(state, 'attract_investment', { amount: 2 });
    expect(next.metrics.cash).toBeLessThan(state.metrics.cash);
    expect(next.metrics.industryIndex).toBeGreaterThan(state.metrics.industryIndex);
    expect(next.metrics.politicalScore).toBeGreaterThan(state.metrics.politicalScore);
  });

  it('issue_special_bond consumes quota, increases cash + debtRatio', () => {
    const state = baseState();
    const initialQuota = state.metrics.specialBondQuota;
    const next = govApplyAction(state, 'issue_special_bond', { amount: 5 });
    expect(next.metrics.specialBondQuota).toBeLessThan(initialQuota);
    expect(next.metrics.cash).toBeGreaterThan(state.metrics.cash);
    expect(next.metrics.debtRatio).toBeGreaterThan(state.metrics.debtRatio);
  });

  it('hidden_debt_swap reduces hiddenDebtRisk and debtRatio', () => {
    const state = baseState({ metrics: { ...baseState().metrics, hiddenDebtRisk: 100 } });
    const next = govApplyAction(state, 'hidden_debt_swap', { amount: 5 });
    expect(next.metrics.hiddenDebtRisk).toBeLessThan(100);
    expect(next.metrics.specialBondQuota).toBeLessThan(state.metrics.specialBondQuota);
    expect(next.score.compliance).toBeGreaterThan(0);
  });

  it('issue_special_bond unavailable when quota = 0', () => {
    const state = baseState({ metrics: { ...baseState().metrics, specialBondQuota: 0 } });
    expect(govIsActionAvailable(state, 'issue_special_bond').available).toBe(false);
  });

  it('hidden_debt_swap unavailable when quota < 3', () => {
    const state = baseState({ metrics: { ...baseState().metrics, specialBondQuota: 2 } });
    expect(govIsActionAvailable(state, 'hidden_debt_swap').available).toBe(false);
  });
});

describe('GOV death and crisis', () => {
  it('detects debtRatio death (>300)', () => {
    const result = checkDeath(baseState({ metrics: { ...baseState().metrics, debtRatio: 305 } }));
    expect(result.dead).toBe(true);
    expect(result.reason).toMatch(/债务率/);
  });

  it('detects political score death (<20)', () => {
    const result = checkDeath(baseState({ metrics: { ...baseState().metrics, politicalScore: 15 } }));
    expect(result.dead).toBe(true);
    expect(result.reason).toMatch(/政绩|免职/);
  });

  it('detects hidden debt burst crisis (>200)', () => {
    const crisis = ROLE_GOV.detectCrisis(baseState({ metrics: { ...baseState().metrics, hiddenDebtRisk: 220 } }));
    expect(crisis.type).toBe('hidden_debt_burst');
    expect(crisis.options).toHaveLength(3);
  });
});
