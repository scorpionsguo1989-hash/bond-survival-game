// tests/engine.test.js
import { describe, it, expect } from 'vitest';
import { createInitialState, advanceTurn, applyEventChoice, checkDeath, detectCrisis } from '../js/engine.js';

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
    const s = createInitialState(sampleOrigin);
    s.metrics.cash = 0;
    const result = checkDeath(s);
    expect(result.dead).toBe(true);
    expect(result.reason).toContain('现金');
  });
});

describe('applyEventChoice', () => {
  const baseState = () => ({
    ...createInitialState(sampleOrigin),
    metrics: { cash: 5, creditUsed: 5, creditTotal: 20, financingCost: 6, leverageRatio: 70, opCostRate: 0.6, projectGap: 2, debtMaturity: [0,0,0,0,0,0,0,0,0,0,0,0], collateralRoom: 'medium' },
  });

  it('adds to score with score.X effect key', () => {
    const event = { id: 'test_evt', choices: [{ effects: { 'score.合规指数': 5, 'score.项目推进': 3 } }] };
    const next = applyEventChoice(baseState(), event, 0);
    expect(next.score['合规指数']).toBe(5);
    expect(next.score['项目推进']).toBe(3);
  });

  it('skips _-prefixed keys (internal flags)', () => {
    // Note: _uncertainty is now an active probability gate (not dead), so use other _ flags here.
    const event = { id: 'test_evt', choices: [{ effects: { _delay: 1, _other: 'foo', cash: 1 } }] };
    const next = applyEventChoice(baseState(), event, 0);
    expect(next.metrics._delay).toBeUndefined();
    expect(next.metrics._other).toBeUndefined();
    expect(next.metrics.cash).toBeCloseTo(6);
  });

  it('downgrades collateralRoom and saturates at low', () => {
    const event = { id: 'test_evt', choices: [{ effects: { collateralRoom: 'downgrade' } }] };
    const s1 = applyEventChoice(baseState(), event, 0);
    expect(s1.metrics.collateralRoom).toBe('low');
    const s2 = applyEventChoice(s1, event, 0);
    expect(s2.metrics.collateralRoom).toBe('low');
  });

  it('upgrades collateralRoom and saturates at high', () => {
    const state = { ...baseState(), metrics: { ...baseState().metrics, collateralRoom: 'medium' } };
    const event = { id: 'test_evt', choices: [{ effects: { collateralRoom: 'upgrade' } }] };
    const s1 = applyEventChoice(state, event, 0);
    expect(s1.metrics.collateralRoom).toBe('high');
    const s2 = applyEventChoice(s1, event, 0);
    expect(s2.metrics.collateralRoom).toBe('high');
  });

  it('applies policyShift and appends eventLog', () => {
    const event = { id: 'test_evt', policyShift: 2, choices: [{ effects: {} }] };
    const next = applyEventChoice(baseState(), event, 0);
    expect(next.policyValue).toBe(0);  // -2 + 2 = 0
    expect(next.eventLog).toHaveLength(1);
    expect(next.eventLog[0]).toEqual({ eventId: 'test_evt', choiceIdx: 0, uncertainOutcome: null });
  });

  it('skips effects when uncertainty roll fails (Math.random returns 0.99)', () => {
    const origRandom = Math.random;
    Math.random = () => 0.99;  // force failure
    try {
      const event = { id: 'test_unc', choices: [{ effects: { cash: 5, _uncertainty: 0.4 } }] };
      const next = applyEventChoice(baseState(), event, 0);
      expect(next.metrics.cash).toBe(5);  // unchanged from baseState which had cash: 5
      expect(next.eventLog[0]).toEqual({ eventId: 'test_unc', choiceIdx: 0, uncertainOutcome: 'failed' });
    } finally {
      Math.random = origRandom;
    }
  });

  it('applies effects when uncertainty roll succeeds (Math.random returns 0.01)', () => {
    const origRandom = Math.random;
    Math.random = () => 0.01;  // force success
    try {
      const event = { id: 'test_unc', choices: [{ effects: { cash: 5, _uncertainty: 0.4 } }] };
      const next = applyEventChoice(baseState(), event, 0);
      expect(next.metrics.cash).toBe(10);  // 5 + 5
      expect(next.eventLog[0].uncertainOutcome).toBe('succeeded');
    } finally {
      Math.random = origRandom;
    }
  });
});

describe('detectCrisis', () => {
  it('detects cash crisis before final quarter', () => {
    const state = createInitialState(sampleOrigin);
    state.metrics.cash = 0.4;
    state.metrics.debtMaturity = [0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    state.quartersPassed = 1;
    const crisis = detectCrisis(state);
    expect(crisis.id).toBe('crisis_cash');
    expect(crisis.options).toHaveLength(3);
  });

  it('does not detect cash crisis near game end', () => {
    const state = createInitialState(sampleOrigin);
    state.metrics.cash = 0.4;
    state.quartersPassed = 11;
    expect(detectCrisis(state)).toBeNull();
  });
});

// ---- Plan 3 T2: role registry & role-driven engine ----
import { getRole, ROLE_REGISTRY } from '../js/roles/index.js';

describe('role registry', () => {
  it('exposes cfo role', () => {
    expect(getRole('cfo').id).toBe('cfo');
  });
  it('throws on unknown role', () => {
    expect(() => getRole('xxx')).toThrow();
  });
  it('CFO has all required hooks', () => {
    const cfo = getRole('cfo');
    expect(typeof cfo.getInitialMetrics).toBe('function');
    expect(typeof cfo.advanceTurn).toBe('function');
    expect(typeof cfo.detectCrisis).toBe('function');
    expect(typeof cfo.getOnboardingHints).toBe('function');
    expect(Array.isArray(cfo.deathConditions)).toBe(true);
  });
});

describe('createInitialState injects role', () => {
  it('attaches role object to state', () => {
    const s = createInitialState(sampleOrigin);
    expect(s.role).toBeDefined();
    expect(s.role.id).toBe('cfo');
  });
});

describe('checkDeath uses role.deathConditions', () => {
  it('detects death from role-defined condition', () => {
    const s = createInitialState(sampleOrigin);
    s.metrics.cash = 0;
    const d = checkDeath(s);
    expect(d.dead).toBe(true);
    expect(d.reason).toMatch(/现金归零/);
  });
});
