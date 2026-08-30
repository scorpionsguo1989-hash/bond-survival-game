import { describe, it, expect } from 'vitest';
import { CFO_ACTIONS, applyAction, isActionAvailable } from '../js/actions.js';
import { canTakeAction } from '../js/engine.js';

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

// ── 缺陷修复：每回合行动次数上限必须真的拦住 ──
// 原实现 ui.js 只把「0/2 剩余」画出来，按钮 disabled 只看资源门槛，
// main.js 也不校验 → 可以无限次操作，刷 pre_funding 就能无限拿现金。
describe('canTakeAction（回合行动预算）', () => {
  it('用满 actionsPerTurn 后不再允许行动', () => {
    const base = { metrics: { cash: 5, creditUsed: 5, creditTotal: 20 }, policyValue: 0 };
    expect(canTakeAction({ ...base, actionsUsed: 0 }).allowed).toBe(true);
    expect(canTakeAction({ ...base, actionsUsed: 1 }).allowed).toBe(true);
    expect(canTakeAction({ ...base, actionsUsed: 2 }).allowed).toBe(false);
    expect(canTakeAction({ ...base, actionsUsed: 5 }).allowed).toBe(false);
  });

  it('额度用尽时 isActionAvailable 也要关掉按钮，UI 不能只做展示', () => {
    const spent = { metrics: { cash: 5, creditUsed: 5, creditTotal: 20, collateralRoom: 'high' }, policyValue: 0, actionsUsed: 2 };
    expect(isActionAvailable(spent, 'pre_funding').available).toBe(false);
    expect(isActionAvailable(spent, 'bank_loan').available).toBe(false);
  });
});
