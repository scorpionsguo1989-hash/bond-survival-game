import { describe, it, expect } from 'vitest';
import { CFO_ACTIONS, applyAction, isActionAvailable } from '../js/actions.js';

describe('CFO_ACTIONS', () => {
  it('has bank loan, bond issue, asset disposal, non-standard finance', () => {
    const ids = CFO_ACTIONS.map(a => a.id);
    expect(ids).toContain('bank_loan');
    expect(ids).toContain('bond_issue');
    expect(ids).toContain('asset_disposal');
    expect(ids).toContain('non_standard');
  });
});

describe('applyAction', () => {
  it('applies cash effect of bank loan', () => {
    const state = { metrics: { cash: 3.0, creditUsed: 5, creditTotal: 20, financingCost: 6.0 } };
    const newState = applyAction(state, 'bank_loan', { amount: 2.0 });
    expect(newState.metrics.cash).toBeCloseTo(5.0);
    expect(newState.metrics.creditUsed).toBe(7);
  });
});

describe('isActionAvailable', () => {
  it('disables bank_loan when credit fully used', () => {
    const state = { metrics: { creditUsed: 20, creditTotal: 20 }, policyValue: 0 };
    expect(isActionAvailable(state, 'bank_loan').available).toBe(false);
  });

  it('disables non_standard under tight policy', () => {
    const state = { metrics: { creditUsed: 5, creditTotal: 20 }, policyValue: -4 };
    expect(isActionAvailable(state, 'non_standard').available).toBe(false);
  });
});
