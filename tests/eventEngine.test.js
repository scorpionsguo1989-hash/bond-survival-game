import { describe, it, expect } from 'vitest';
import { findMainEvent, sampleRandomEvents, getPolicyDirection } from '../js/eventEngine.js';

// Plan 3 T3: 事件 schema 升级为 roles 嵌套
const mainEvents = [
  {
    id: 'main_2022_q1', trigger: { year: 2022, quarter: 1 }, title: 'A', policyShift: 0,
    roles: {
      cfo: { body: 'CFO Q1 body', choices: [{ label: 'A1', effects: {} }] },
      im:  { body: 'IM Q1 body',  choices: [{ label: 'A2', effects: {} }] },
    },
  },
  {
    id: 'main_2022_q3', trigger: { year: 2022, quarter: 3 }, title: 'B', policyShift: 0,
    roles: {
      cfo: { body: 'CFO Q3 body', choices: [{ label: 'B1', effects: {} }] },
    },
  },
];

const randomEvents = [
  { id: 'r1', type: '市场', weight: { tight: 2, stable: 1, loose: 0.5 }, roles: { cfo: { body: '', choices: [] }, im: { body: '', choices: [] } } },
  { id: 'r2', type: '机遇', weight: { tight: 0.5, stable: 1, loose: 2 }, roles: { cfo: { body: '', choices: [] } } },
  { id: 'r3', type: '经营', weight: { tight: 1, stable: 1, loose: 1 }, roles: { cfo: { body: '', choices: [] }, im: { body: '', choices: [] } } },
];

describe('findMainEvent', () => {
  it('finds main event for current quarter (cfo default)', () => {
    expect(findMainEvent(mainEvents, 2022, 1).id).toBe('main_2022_q1');
    expect(findMainEvent(mainEvents, 2022, 3).id).toBe('main_2022_q3');
  });

  it('returns null when no main event', () => {
    expect(findMainEvent(mainEvents, 2022, 2)).toBeNull();
  });

  it('flattens body/choices for the requested role', () => {
    const cfo = findMainEvent(mainEvents, 2022, 1, 'cfo');
    expect(cfo.body).toBe('CFO Q1 body');
    const im = findMainEvent(mainEvents, 2022, 1, 'im');
    expect(im.body).toBe('IM Q1 body');
  });

  it('skips events without role data', () => {
    // 2022 Q3 event 只有 cfo，im 视角应找不到
    expect(findMainEvent(mainEvents, 2022, 3, 'im')).toBeNull();
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

  it('filters by role (im pool excludes cfo-only events)', () => {
    const result = sampleRandomEvents(randomEvents, 'stable', { min: 3, max: 3 }, 'im');
    // 只有 r1 和 r3 有 im 视角，最多抽 2 个
    expect(result.length).toBeLessThanOrEqual(2);
    expect(result.every(e => e.id !== 'r2')).toBe(true);
  });
});

describe('getPolicyDirection', () => {
  it('returns tight/stable/loose based on axis value', () => {
    expect(getPolicyDirection(-3)).toBe('tight');
    expect(getPolicyDirection(0)).toBe('stable');
    expect(getPolicyDirection(2)).toBe('loose');
  });
});
