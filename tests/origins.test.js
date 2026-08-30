import { describe, it, expect } from 'vitest';
import { computeChallengeScore } from '../js/origins/cfoOrigin.js';
import { ROLE_CFO } from '../js/roles/cfo.js';
import { CFO_KIT_MODIFIERS } from '../js/starterKits.js';
import { generateOrigin, computeChallengeScore } from '../js/origins.js';

describe('generateOrigin', () => {
  it('returns object with all four dimensions', () => {
    const o = generateOrigin('cfo');
    expect(o.regionTier).toBeDefined();
    expect(o.businessType).toBeDefined();
    expect(o.healthLevel).toBeDefined();
    expect(o.tag).toBeDefined();
    expect(o.platformName).toBeDefined();
    expect(o.directorName).toBeDefined();
  });

  it('generates challenge score in target range (15-25)', () => {
    for (let i = 0; i < 50; i++) {
      const o = generateOrigin('cfo');
      const score = computeChallengeScore(o);
      expect(score).toBeGreaterThanOrEqual(15);
      expect(score).toBeLessThanOrEqual(25);
    }
  });

  it('generates challenges array with 3 items', () => {
    const o = generateOrigin('cfo');
    expect(o.challenges).toHaveLength(3);
  });
});

// ── 缺陷修复：CFO 出身的标称难度必须等于实际难度 ──
// 原实现 totalDebt = 8/(rMult*hMult) 而 cash = 5*rMult*hMult，两者反向相乘，
// 实测 798 个可发出身的「融资缺口」从 -3.2 亿（躺赢）到 30.9 亿，
// 与 computeChallengeScore 的相关系数只有 0.206——难度标签基本是随机的。
// IM / GOV 的梯度实测正常，这里只约束 CFO。
describe('CFO 出身难度梯度', () => {
  const REGIONS = ['east_core', 'central_capital', 'west_prefecture', 'northeast_old'];
  const BUSINESS = ['infrastructure', 'land_dev', 'industrial_park', 'public_utility'];
  const HEALTH = ['good', 'medium', 'weak'];
  const TAGS = ['star_platform', 'hidden_debt_zone', 'provincial_credit', 'leadership_change', 'restructuring', 'asset_injection'];
  const KITS = Object.keys(CFO_KIT_MODIFIERS);

  // generateOrigin 只会发 challengeScore 落在 15-25 的组合
  const reachable = [];
  for (const regionTier of REGIONS) for (const businessType of BUSINESS)
    for (const healthLevel of HEALTH) for (const tag of TAGS) for (const starterKit of KITS) {
      const origin = { role: 'cfo', regionTier, businessType, healthLevel, tag, starterKit };
      const cs = computeChallengeScore(origin);
      if (cs < 15 || cs > 25) continue;
      const m = ROLE_CFO.getInitialMetrics(origin);
      const debt = m.debtMaturity.reduce((a, b) => a + b, 0);
      const opNet = (2.5 - m.opCostRate - m.projectGap) * 12;   // 12 季经营净现金
      reachable.push({ origin, cs, metrics: m, gap: debt - m.cash - opNet });
    }

  it('可发出身数量没有被约束条件掐死', () => {
    expect(reachable.length).toBeGreaterThan(200);
  });

  it('没有躺赢局：每个出身都必须自己补上融资缺口', () => {
    const freebies = reachable.filter(r => r.gap <= 0);
    expect(freebies.map(r => `${r.origin.regionTier}/${r.origin.healthLevel} 缺口${r.gap.toFixed(1)}`)).toEqual([]);
  });

  it('融资缺口有界，最难与最易相差不超过 4 倍', () => {
    const gaps = reachable.map(r => r.gap);
    const lo = Math.min(...gaps), hi = Math.max(...gaps);
    // 绝对值跟着 config.DIFFICULTY.cfo 走（调难度会变），比例才是真正的不变量
    expect(lo, `最小缺口 ${lo.toFixed(1)} 亿`).toBeGreaterThanOrEqual(3);
    expect(hi, `最大缺口 ${hi.toFixed(1)} 亿`).toBeLessThanOrEqual(30);
    expect(hi / lo, `极差 ${(hi / lo).toFixed(1)} 倍`).toBeLessThanOrEqual(4);
  });

  it('challengeScore 与真实融资缺口强相关（标签说的是真话）', () => {
    const n = reachable.length;
    const mx = reachable.reduce((s, r) => s + r.cs, 0) / n;
    const my = reachable.reduce((s, r) => s + r.gap, 0) / n;
    const cov = reachable.reduce((s, r) => s + (r.cs - mx) * (r.gap - my), 0);
    const sx = Math.sqrt(reachable.reduce((s, r) => s + (r.cs - mx) ** 2, 0));
    const sy = Math.sqrt(reachable.reduce((s, r) => s + (r.gap - my) ** 2, 0));
    const r = cov / (sx * sy);
    expect(r, `相关系数 ${r.toFixed(3)}`).toBeGreaterThanOrEqual(0.9);
  });

  it('每个出身都撑得过第 1 季，玩家至少有一个完整回合反应', () => {
    const instantDeaths = reachable.filter(r => {
      const state = { metrics: { ...r.metrics }, score: {}, quartersPassed: 0 };
      const { metrics } = ROLE_CFO.advanceTurn(state);
      return metrics.cash <= 0;
    });
    expect(instantDeaths.map(r => `${r.origin.regionTier}/${r.origin.healthLevel}/${r.origin.starterKit}`)).toEqual([]);
  });
});
