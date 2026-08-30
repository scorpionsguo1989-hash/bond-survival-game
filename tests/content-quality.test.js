// tests/content-quality.test.js
// 内容质量护栏。这里的阈值是"当前欠账水位"，只允许往下走，不允许往上涨。
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const readJson = (p) => JSON.parse(readFileSync(new URL(`../content/${p}`, import.meta.url), 'utf8'));
const asArray = (d) => (Array.isArray(d) ? d : d.events || []);
const FILES = ['mainEvents', 'randomEvents', 'randomEventsIM', 'randomEventsGOV', 'seasonalEvents',
  'targetedEvents', 'sagaEvents', 'blackSwans', 'blackSwansV2', 'historicalSagas', 'openingEvents'];

const METRIC_KEYS = {
  cfo: new Set(['cash', 'creditUsed', 'creditTotal', 'financingCost', 'leverageRatio', 'collateralRoom', 'projectGap', 'opCostRate']),
  im: new Set(['nav', 'aum', 'cashRatio', 'duration', 'concentration', 'creditExposure', 'redemptionPressure', 'leverage']),
  gov: new Set(['fiscalRevenue', 'landRevenue', 'debtRatio', 'hiddenDebtRisk', 'industryIndex', 'politicalScore', 'specialBondQuota', 'transferPayment', 'cash']),
};
const DIMS = new Set(['liquidity', 'costControl', 'projectProgress', 'compliance', 'crisisResponse', 'development']);

function everyChoice(fn) {
  for (const f of FILES) {
    for (const e of asArray(readJson(`${f}.json`))) {
      const blocks = e.roles || ('choices' in e ? { [e.role || 'cfo']: e } : {});
      for (const [role, rv] of Object.entries(blocks)) {
        for (const c of (rv.choices || [])) fn({ file: f, event: e, role, choice: c, effects: c.effects || {} });
      }
    }
  }
}

describe('内容质量', () => {
  it('所有 score.* 前缀写的都是引擎认识的维度', () => {
    const bad = [];
    everyChoice(({ event, effects }) => {
      for (const k of Object.keys(effects)) {
        if (k.startsWith('score.') && !DIMS.has(k.slice(6))) bad.push(`${event.id}:${k}`);
      }
    });
    expect(bad).toEqual([]);
  });

  it('不确定选项的成功率都在 0-1 之间', () => {
    const bad = [];
    everyChoice(({ event, effects }) => {
      const u = effects._uncertainty;
      if (u !== undefined && !(typeof u === 'number' && u > 0 && u <= 1)) bad.push(`${event.id}: _uncertainty=${u}`);
    });
    expect(bad).toEqual([]);
  });

  // 欠账：这些选项"赌赢了"也不改任何经营指标，只给分数。
  // 叙事上说不通（比如"争取到政策性银行专项额度"成功后现金一分不动），
  // 需要逐条补数值。阈值只能往下调，不许往上涨。
  it('赌赢了却不动任何指标的选项不超过当前水位', () => {
    let uncertain = 0, noMetric = 0;
    everyChoice(({ role, effects }) => {
      if (effects._uncertainty === undefined) return;
      uncertain += 1;
      const mk = METRIC_KEYS[role] || new Set();
      if (!Object.keys(effects).some(k => mk.has(k))) noMetric += 1;
    });
    expect(uncertain).toBeGreaterThan(0);
    expect(noMetric, `当前 ${noMetric}/${uncertain} 条不确定选项成功后不动指标；这个数只能减少`)
      .toBeLessThanOrEqual(115);
  });
});
