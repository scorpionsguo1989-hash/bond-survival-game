import { describe, it, expect } from 'vitest';
import { driftPolicy, getPolicyLabel, applyPolicyShift } from '../js/policy.js';

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
