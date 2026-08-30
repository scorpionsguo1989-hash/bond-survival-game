import { describe, it, expect } from 'vitest';
import { driftPolicy, getPolicyLabel, applyPolicyShift, naturalDrift } from '../js/policy.js';

describe('driftPolicy', () => {
  it('drifts toward direction by 1', () => {
    expect(driftPolicy(-2, 'tight')).toBe(-3);
    expect(driftPolicy(0, 'loose')).toBe(1);
  });

  it('clamps at min/max', () => {
    expect(driftPolicy(-5, 'tight')).toBe(-5);
    expect(driftPolicy(5, 'loose')).toBe(5);
  });
});

describe('getPolicyLabel', () => {
  it('returns correct label for value', () => {
    expect(getPolicyLabel(-4).label).toBe('严格');
    expect(getPolicyLabel(-1).label).toBe('偏紧');
    expect(getPolicyLabel(0).label).toBe('中性');
    expect(getPolicyLabel(2).label).toBe('偏松');
    expect(getPolicyLabel(4).label).toBe('宽松');
  });
});

describe('applyPolicyShift', () => {
  it('jumps and clamps', () => {
    expect(applyPolicyShift(-2, 4)).toBe(2);
    expect(applyPolicyShift(3, 5)).toBe(5);
  });
});

// ── 缺陷修复：政策轴应向中性回归，而不是发散到边界 ──
// 原实现 engine.js 用 `value<0 → tight / value>0 → loose`，越紧越紧，
// 实测「温水煮青蛙」12 季里有 10 季钉死在 -5。
describe('naturalDrift（政策轴自然回归）', () => {
  it('极端值向 0 回归一步', () => {
    expect(naturalDrift(-5)).toBe(-4);
    expect(naturalDrift(-2)).toBe(-1);
    expect(naturalDrift(4)).toBe(3);
    expect(naturalDrift(2)).toBe(1);
  });

  it('死区内（|v| <= 1）保持不动，让事件推动能留存一季以上', () => {
    expect(naturalDrift(-1)).toBe(-1);
    expect(naturalDrift(0)).toBe(0);
    expect(naturalDrift(1)).toBe(1);
  });
});
