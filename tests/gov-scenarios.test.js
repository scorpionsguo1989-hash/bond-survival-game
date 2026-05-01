// tests/gov-scenarios.test.js
// GOV 平衡性场景测试（Plan 4 T6）
// 4 个确定性场景：固定 origin + 政策走向 + 操作序列，断言期望终局
import { describe, it, expect } from 'vitest';
import { createInitialState, advanceTurn, checkDeath, detectCrisis } from '../js/engine.js';

function simulate(origin, actionPlan = {}, policyTrajectory = Array(12).fill(0), randomValue = 0.1) {
  const originalRandom = Math.random;
  Math.random = () => randomValue;
  try {
    let state = createInitialState(origin);
    for (let q = 0; q < 12; q++) {
      state.policyValue = policyTrajectory[q] ?? 0;
      for (const action of actionPlan[q] || []) {
        state = state.role.applyActionEffects(state, action.id, action.params);
      }

      state = advanceTurn(state);
      const death = checkDeath(state);
      if (death.dead) {
        return {
          dead: true,
          reason: death.reason,
          atQuarter: q + 1,
          finalMetrics: state.metrics,
          crisis: detectCrisis(state),
        };
      }
    }

    return {
      dead: false,
      finalMetrics: state.metrics,
      crisis: detectCrisis(state),
      quartersPassed: state.quartersPassed,
    };
  } finally {
    Math.random = originalRandom;
  }
}

const baseOrigin = {
  role: 'gov',
  cityTier: 'prefecture',
  fiscalStatus: 'transfer_dep',
  tag: 'central_partner',
  directorName: '测试官',
  platformName: '测试市',
  challengeScore: 18,
  labels: { city: '地级市', fiscal: '转移支付依赖', tag: '央企合作基础' },
  challenges: ['财政平衡', '隐债化解', '政绩考核'],
};

describe('GOV scenario tests', () => {
  it('baseline: 强省会 + 财政自给 + 中性政策 -> 应稳定通关', () => {
    const origin = {
      ...baseOrigin,
      cityTier: 'strong_capital',
      fiscalStatus: 'self_sufficient',
      tag: 'central_partner',
      challengeScore: 14,
    };

    const result = simulate(origin, {}, Array(12).fill(0));

    expect(result.dead).toBe(false);
    expect(result.quartersPassed).toBe(12);
    expect(result.finalMetrics.debtRatio).toBeLessThan(230);
    expect(result.finalMetrics.politicalScore).toBeGreaterThan(50);
    expect(result.crisis).toBeNull();
  });

  it('debt overload: 债务重点县 + 土地依赖 + 持续紧政策 + 不化债 -> 应死于债务率', () => {
    const origin = {
      ...baseOrigin,
      cityTier: 'county',
      fiscalStatus: 'land_dep',
      tag: 'debt_zone',
      challengeScore: 28,
    };

    const result = simulate(origin, {}, Array(12).fill(-4));

    expect(result.dead).toBe(true);
    expect(result.reason).toMatch(/债务率|约谈/);
    expect(result.atQuarter).toBeLessThanOrEqual(10);
    expect(result.finalMetrics.debtRatio).toBeGreaterThan(300);
  });

  it('political crisis: 连续向上争取失败且不招商不化债 -> 应死于政绩', () => {
    const origin = {
      ...baseOrigin,
      cityTier: 'county',
      fiscalStatus: 'transfer_dep',
      tag: 'debt_zone',
      challengeScore: 27,
    };
    const failedAppeals = Object.fromEntries(
      Array.from({ length: 12 }, (_, q) => [
        q,
        [{ id: 'transfer_appeal', params: { amount: 10 } }],
      ])
    );

    const result = simulate(origin, failedAppeals, Array(12).fill(-3), 0.99);

    expect(result.dead).toBe(true);
    expect(result.reason).toMatch(/政绩|免职/);
    expect(result.atQuarter).toBeLessThanOrEqual(10);
    expect(result.finalMetrics.politicalScore).toBeLessThan(20);
  });

  it('fiscal stress: 土地纠纷县 + 土地依赖 + 紧政策 -> 应显著承压但可勉强过关', () => {
    const origin = {
      ...baseOrigin,
      cityTier: 'county',
      fiscalStatus: 'land_dep',
      tag: 'land_dispute',
      challengeScore: 23,
    };

    const result = simulate(origin, {}, Array(12).fill(-4));

    expect(result.dead).toBe(false);
    expect(result.finalMetrics.debtRatio).toBeGreaterThan(275);
    expect(result.finalMetrics.debtRatio).toBeLessThan(300);
    expect(result.finalMetrics.politicalScore).toBeLessThan(45);
    expect(result.finalMetrics.cash).toBeGreaterThan(0);
  });
});
