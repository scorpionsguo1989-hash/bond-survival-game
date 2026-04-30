// js/policy.js
import { GAME_CONFIG, POLICY_LEVELS } from './config.js';

export function driftPolicy(currentValue, direction) {
  const delta = direction === 'tight' ? -1 : (direction === 'loose' ? 1 : 0);
  return clamp(currentValue + delta);
}

export function applyPolicyShift(currentValue, shift) {
  return clamp(currentValue + shift);
}

export function getPolicyLabel(value) {
  return POLICY_LEVELS.find(l => value >= l.range[0] && value <= l.range[1]) || POLICY_LEVELS[2];
}

function clamp(value) {
  const { min, max } = GAME_CONFIG.policyAxisRange;
  return Math.max(min, Math.min(max, value));
}

export function getPolicyDirection(currentValue, lastValue) {
  if (currentValue > lastValue) return 'loose';
  if (currentValue < lastValue) return 'tight';
  return 'stable';
}
