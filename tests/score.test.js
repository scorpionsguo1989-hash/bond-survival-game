import { describe, it, expect } from 'vitest';
import { computeFinalScore, getScoreGrade } from '../js/score.js';
import { ROLE_CFO } from '../js/roles/cfo.js';
import { ROLE_IM } from '../js/roles/im.js';
import { ROLE_GOV } from '../js/roles/gov.js';
import { CFO_ACTIONS, applyAction } from '../js/actions.js';

// Plan 3 T3: state.score 用 English key 存（与事件 effects 对齐）
// computeFinalScore 输出的 dimensions 用 dimensionLabels 中文标签
describe('computeFinalScore', () => {
  it('returns six dimensions', () => {
    const state = {
      score: { liquidity: 30, costControl: 20, projectProgress: 25, compliance: 35, crisisResponse: 28, development: 22 },
      metrics: { cash: 5, leverageRatio: 65, financingCost: 5.5, collateralRoom: 'medium' },
      survived: true,
      quartersPassed: 12,
    };
    const result = computeFinalScore(state);
    expect(Object.keys(result.dimensions)).toHaveLength(6);
    expect(result.total).toBeGreaterThan(0);
    expect(result.total).toBeLessThanOrEqual(100);
    // 默认 fallback 标签是中文
    expect(result.dimensions['流动性管理']).toBeDefined();
  });

  it('penalizes failed run', () => {
    const failed = { score: {}, metrics: { cash: 0, leverageRatio: 90, financingCost: 8, collateralRoom: 'low' }, survived: false, quartersPassed: 5 };
    const result = computeFinalScore(failed);
    expect(result.total).toBeLessThan(40);
  });
});

describe('getScoreGrade', () => {
  it('maps total to grade', () => {
    expect(getScoreGrade(95).grade).toBe('S');
    expect(getScoreGrade(80).grade).toBe('A');
    expect(getScoreGrade(65).grade).toBe('B');
    expect(getScoreGrade(50).grade).toBe('C');
    expect(getScoreGrade(30).grade).toBe('D');
  });
});

// ── 缺陷修复：六维评分与实际经营指标挂钩 ──
// 原实现用 `isCfo = !!m.cash && !!m.financingCost` 判定角色，
// 只有 CFO 的 liquidity / costControl / development 挂 metrics；
// IM 与 GOV 三个维度恒为常数，实测「净值 1.15 规模 260」和
// 「净值 0.86 规模 40」最终分同为 44。
describe('各角色评分都要吃自己的指标', () => {
  const run = (role, metrics, origin) => computeFinalScore({
    role, metrics, origin, score: {}, survived: true, quartersPassed: 12,
  });

  it('IM：净值/规模/现金比例好的局，分数必须更高', () => {
    const good = run(ROLE_IM,
      { nav: 1.15, aum: 260, cashRatio: 20, duration: 2, concentration: 8, creditExposure: 10, redemptionPressure: 5, leverage: 100 },
      { scale: 'medium' });
    const bad = run(ROLE_IM,
      { nav: 0.86, aum: 40, cashRatio: 1, duration: 6, concentration: 24, creditExposure: 80, redemptionPressure: 95, leverage: 138 },
      { scale: 'medium' });
    expect(good.total).toBeGreaterThan(bad.total + 10);
  });

  it('GOV：债务率/隐债/现金好的局，分数必须更高', () => {
    const good = run(ROLE_GOV,
      { cash: 12, debtRatio: 200, hiddenDebtRisk: 30, industryIndex: 75, politicalScore: 80 }, {});
    const bad = run(ROLE_GOV,
      { cash: 0.5, debtRatio: 295, hiddenDebtRisk: 210, industryIndex: 35, politicalScore: 25 }, {});
    expect(good.total).toBeGreaterThan(bad.total + 10);
  });

  it('CFO：现金恰好归零时不应掉进兜底分支（分数要连续）', () => {
    const atZero = run(ROLE_CFO, { cash: 0, financingCost: 6, leverageRatio: 70 }, {});
    const justAbove = run(ROLE_CFO, { cash: 0.01, financingCost: 6, leverageRatio: 70 }, {});
    expect(Math.abs(atZero.total - justAbove.total)).toBeLessThanOrEqual(1);
  });
});

// ── 缺陷修复：写 state.score 的 key 必须是引擎认识的英文维度 ──
// 原实现 actions.js 写中文 key（'流动性管理' 等），score.js 读英文 key，
// CFO 五个主动操作 + 危机弹窗的加分全部丢失；IM/GOV 用的是英文，只有 CFO 中招。
describe('score key 白名单', () => {
  const DIMS = ['liquidity', 'costControl', 'projectProgress', 'compliance', 'crisisResponse', 'development'];

  it('CFO 全部主动操作写出的 score key 都在白名单内', () => {
    const base = {
      metrics: { cash: 5, creditUsed: 5, creditTotal: 20, financingCost: 6, collateralRoom: 'high', leverageRatio: 70, opCostRate: 0.6 },
      score: {}, policyValue: 0, actionsUsed: 0,
    };
    for (const action of CFO_ACTIONS) {
      const next = applyAction(base, action.id, { amount: 2 });
      for (const key of Object.keys(next.score)) {
        expect(DIMS, `${action.id} 写出了引擎读不到的维度 key「${key}」`).toContain(key);
      }
    }
  });

  it('三个角色危机弹窗选项的 score.* 前缀 key 都在白名单内', () => {
    const crises = [
      ROLE_CFO.detectCrisis({ metrics: { cash: 0.2, debtMaturity: [1, 1, 1] }, quartersPassed: 2 }),
      ROLE_IM.detectCrisis({ metrics: { redemptionPressure: 85, cashRatio: 2, nav: 0.9 } }),
      ROLE_GOV.detectCrisis({ metrics: { hiddenDebtRisk: 250, cash: 1, politicalScore: 40 } }),
    ];
    for (const crisis of crises) {
      expect(crisis).toBeTruthy();
      for (const opt of crisis.options) {
        for (const key of Object.keys(opt.effects)) {
          if (!key.startsWith('score.')) continue;
          expect(DIMS, `${crisis.title}：选项「${opt.label}」写出了无效维度「${key}」`).toContain(key.slice(6));
        }
      }
    }
  });
});
