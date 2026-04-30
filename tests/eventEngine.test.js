import { describe, it, expect } from 'vitest';
import { findMainEvent, sampleRandomEvents, getPolicyDirection } from '../js/eventEngine.js';

const mainEvents = [
  { id: 'main_2022_q1', trigger: { year: 2022, quarter: 1 }, title: 'A' },
  { id: 'main_2022_q3', trigger: { year: 2022, quarter: 3 }, title: 'B' },
];

const randomEvents = [
  { id: 'r1', type: '市场', weight: { tight: 2, stable: 1, loose: 0.5 } },
  { id: 'r2', type: '机遇', weight: { tight: 0.5, stable: 1, loose: 2 } },
  { id: 'r3', type: '经营', weight: { tight: 1, stable: 1, loose: 1 } },
];

describe('findMainEvent', () => {
  it('finds main event for current quarter', () => {
    expect(findMainEvent(mainEvents, 2022, 1).id).toBe('main_2022_q1');
    expect(findMainEvent(mainEvents, 2022, 3).id).toBe('main_2022_q3');
  });

  it('returns null when no main event', () => {
    expect(findMainEvent(mainEvents, 2022, 2)).toBeNull();
  });
});

describe('sampleRandomEvents', () => {
  it('returns array within max bound', () => {
    const result = sampleRandomEvents(randomEvents, 'tight', { min: 0, max: 2 });
    expect(result.length).toBeLessThanOrEqual(2);
  });

  it('does not duplicate events in same sample', () => {
    const result = sampleRandomEvents(randomEvents, 'tight', { min: 2, max: 2 });
    const ids = result.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('getPolicyDirection', () => {
  it('returns tight/stable/loose based on axis value', () => {
    expect(getPolicyDirection(-3)).toBe('tight');
    expect(getPolicyDirection(0)).toBe('stable');
    expect(getPolicyDirection(2)).toBe('loose');
  });
});
