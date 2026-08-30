// tests/gov-scenarios.test.js
// GOV 平衡性场景测试（Plan 4 T6）
// 4 个确定性场景：固定 origin + 政策走向 + 操作序列，断言期望终局
import { describe, it, expect, vi } from 'vitest';
import { createInitialState, advanceTurn, checkDeath, detectCrisis } from '../js/engine.js';

// 掷骰已从 Math.random 搬到 rng.js 的种子流（服务端要能重放复算），
// 所以这里改成 mock 种子流；roll=null 时走真实实现。
const rngStub = vi.hoisted(() => ({ roll: null }));
vi.mock('../js/rng.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, gameRandom: () => (rngStub.roll === null ? actual.gameRandom() : rngStub.roll) };
});

function simulate(origin, actionPlan = {}, policyTrajectory = Array(12).fill(0), randomValue = 0.1) {
  rngStub.roll = randomValue;
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
    rngStub.roll = null;
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

    // 最好的出身 + 最松的政策，但完全不操作 → 政绩一路滑到免职线。
    // 这是刻意的设计目标：为官不为也要出局，"躺着就能通关"才是设计事故。
    const passive = simulate(origin, {}, Array(12).fill(0));
    expect(passive.dead, '最好的出身完全不操作也不该通关').toBe(true);
    expect(passive.reason).toMatch(/政绩|免职/);

    // 只要每季管一次政绩（招商引资），同样的出身就能稳定通关，且债务率无忧。
    const minding = Object.fromEntries(
      Array.from({ length: 12 }, (_, q) => [q, [{ id: 'attract_investment', params: { amount: 3 } }]]),
    );
    const result = simulate(origin, minding, Array(12).fill(0));
    expect(result.dead, '最好的出身 + 每季管政绩，应该稳定通关').toBe(false);
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

    // 政策取中性：分母效应（土地缩水推高债务率）归零，才能把"死于政绩"这条路
    // 单独隔离出来。紧政策下债务率会先杀死玩家，那是另一条死亡路径（见上一个用例）。
    const result = simulate(origin, failedAppeals, Array(12).fill(0), 0.99);

    expect(result.dead).toBe(true);
    expect(result.reason).toMatch(/政绩|免职/);
    expect(result.atQuarter).toBeLessThanOrEqual(10);
    expect(result.finalMetrics.politicalScore).toBeLessThan(20);
  });

  it('fiscal stress: 土地纠纷县 + 土地依赖 + 紧政策 -> 躺着必死，主动置换才活得下来', () => {
    const origin = {
      ...baseOrigin,
      cityTier: 'county',
      fiscalStatus: 'land_dep',
      tag: 'land_dispute',
      challengeScore: 23,
    };

    // 政策轨迹取真实引擎能产生的最紧一档：前松后紧、末段到 -4。
    // 早先这里写的是「连续 12 季 -4」，但政策轴有自然回归，那种轨迹在真实对局里
    // 根本不会出现，用它当基准会把难度校准带偏。
    const tightening = [-1, -1, -2, -2, -2, -3, -3, -3, -4, -4, -4, -4];

    // 完全不操作：土地出让被打没 → 分母缩水推高债务率 + 政绩滑向免职线 → 出局
    const passive = simulate(origin, {}, tightening);
    expect(passive.dead, '最惨出身 + 收紧政策 + 完全不操作，不该还能通关').toBe(true);

    // 置换隐债 + 招商出政绩：同一局面能救回来。
    // 这条是"专业判断值钱"的最小证明——难度和技能杠杆必须同时成立。
    const competent = Object.fromEntries(
      Array.from({ length: 12 }, (_, q) => [q, [
        { id: 'hidden_debt_swap', params: { amount: 15 } },
        { id: 'attract_investment', params: { amount: 3 } },
      ]]),
    );
    const active = simulate(origin, competent, tightening);
    expect(active.dead, '同一局面下置换隐债 + 招商应该能活下来').toBe(false);
    expect(active.finalMetrics.debtRatio).toBeLessThan(passive.finalMetrics.debtRatio);
  });
});
