// js/policy.js
import { GAME_CONFIG, POLICY_LEVELS } from './config.js';

export function driftPolicy(currentValue, direction) {
  const delta = direction === 'tight' ? -1 : (direction === 'loose' ? 1 : 0);
  return clamp(currentValue + delta);
}

// 死区半径：|policyValue| <= 1 时不做自然回归。
// 事件的 policyShift 通常是 ±1，留出死区才能让玩家/事件对政策环境的推动
// 存续一季以上，否则下一季就被回归抹平，政策轴变成纯剧本读数。
const DRIFT_DEADBAND = 1;

/**
 * 政策轴向中性（0）自然回归一步。极端位置回归，死区内保持不动。
 * 每季的最终政策 = naturalDrift(当前值) + 当前幕的 policyDrift，
 * 于是「幕」决定方向和均衡位，回归决定不会无限跑到边界。
 */
export function naturalDrift(currentValue) {
  if (Math.abs(currentValue) <= DRIFT_DEADBAND) return clamp(currentValue);
  return clamp(currentValue + (currentValue < 0 ? 1 : -1));
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
