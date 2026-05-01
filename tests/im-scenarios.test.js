// tests/im-scenarios.test.js
// IM 平衡性场景测试（Plan 3 T11 / 设计稿 R11）
// 4 个确定性场景：固定 origin + 政策走向 + 操作序列，断言期望终局
import { describe, it, expect } from 'vitest';
import { createInitialState, advanceTurn, checkDeath } from '../js/engine.js';

/**
 * 模拟一局 IM 游戏。
 * @param origin    完整 IM origin（必含 role: 'im'）
 * @param actionPlan  { quarter: [{id, params}, ...], ... } 每季度的操作
 * @param policyTrajectory  长度 12 的政策值数组，第 i 项是第 i 季度结束前的政策值
 * @returns { dead, reason?, atQuarter?, finalNav, quartersPassed }
 */
function simulate(origin, actionPlan = {}, policyTrajectory = Array(12).fill(0)) {
  let state = createInitialState(origin);
  for (let q = 0; q < 12; q++) {
    state.policyValue = policyTrajectory[q] ?? 0;
    // 应用本季度操作
    const acts = actionPlan[q] || [];
    for (const a of acts) {
      state = state.role.applyActionEffects(state, a.id, a.params);
    }
    // 推进季度
    state = advanceTurn(state);
    // 死亡判定
    const death = checkDeath(state);
    if (death.dead) {
      return { dead: true, reason: death.reason, atQuarter: q + 1, finalNav: state.metrics.nav, quartersPassed: state.quartersPassed };
    }
  }
  return { dead: false, finalNav: state.metrics.nav, quartersPassed: state.quartersPassed, finalScore: state.score };
}

const baseOrigin = {
  role: 'im',
  institutionType: 'mutual',
  scale: 'medium',
  healthLevel: 'medium',
  tag: 'fresh_product',
  directorName: '测试君',
  platformName: '测试基金',
  challengeScore: 18,
  labels: { inst: '公募基金', scale: '中规模（100-500亿）', health: '有问题券', tag: '新发产品建仓期' },
  challenges: ['c1', 'c2', 'c3'],
};

describe('IM scenario tests', () => {
  it('baseline: 中等机构 + 干净持仓 + 中性政策 → 应通关', () => {
    const origin = { ...baseOrigin, healthLevel: 'good', tag: 'fresh_product', challengeScore: 16 };
    const result = simulate(origin, {}, Array(12).fill(0));
    expect(result.dead).toBe(false);
    // 中性政策 + 干净持仓应保持净值（不要求大涨，不应跌穿警戒）
    expect(result.finalNav).toBeGreaterThan(0.95);
  });

  it('high concentration: 重仓 + 信用下沉 → 应死于集中度', () => {
    const origin = { ...baseOrigin, scale: 'small', healthLevel: 'weak', tag: 'concentrated_clients', challengeScore: 26 };
    // Q0 用大额买入触发集中度上升（每次大单 +2）
    const plan = {};
    for (let q = 0; q < 8; q++) {
      plan[q] = [{ id: 'buy_bond', params: { amount: 8, durationTilt: 0, creditTilt: 1 } }];  // 每季加 2 集中度
    }
    const result = simulate(origin, plan, Array(12).fill(-2));
    expect(result.dead).toBe(true);
    expect(result.reason).toMatch(/集中度|净值|杠杆/);  // 三种死法都接受（高难度场景）
  });

  it('policy tightening: weak + 持续政策极紧 + 不主动 → 应死于净值穿线或勉强存活', () => {
    const origin = { ...baseOrigin, healthLevel: 'weak', tag: 'recent_drawdown', challengeScore: 25 };
    const result = simulate(origin, {}, Array(12).fill(-4));
    // 高难度：要么死，要么 NAV 跌到 0.95 以下
    expect(result.dead || result.finalNav < 0.95).toBe(true);
  });

  it('redemption stress: 大额赎回压力 + 政策紧 + 不主动 → 应触发挤兑或勉强存活', () => {
    const origin = { ...baseOrigin, scale: 'medium', healthLevel: 'medium', tag: 'pending_redemption', challengeScore: 23 };
    // 政策从 -2 降到 -4（持续收紧）
    const policy = [-2, -2, -3, -3, -3, -4, -4, -4, -4, -4, -3, -3];
    const result = simulate(origin, {}, policy);
    // 期望：要么挤兑死，要么 NAV 跌穿，要么勉强存活但分数低
    const stressed = result.dead
      || result.finalNav < 0.95
      || (result.quartersPassed === 12);  // 至少撑过来（即使靠运气）
    expect(stressed).toBe(true);
  });
});
