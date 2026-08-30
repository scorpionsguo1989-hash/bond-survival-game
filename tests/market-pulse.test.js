// tests/market-pulse.test.js
import { describe, it, expect } from 'vitest';
import { computePulseRows, PULSE_DISCLAIMER } from '../js/marketPulse.js';
import { ROLE_CFO } from '../js/roles/cfo.js';
import { ROLE_IM } from '../js/roles/im.js';
import { ROLE_GOV } from '../js/roles/gov.js';

const base = (role, metrics, policyValue, prevPolicy) => ({
  role, metrics, policyValue,
  year: 2023, quarter: 2,
  origin: { platformName: '淮西市城投', scale: 'medium' },
  history: prevPolicy == null ? [] : [{ policyValue: prevPolicy }],
});

describe('市场脉冲面板', () => {
  it('必须自报是情景推演，不能冒充行情源', () => {
    // 面板里出现「10Y 国债收益率」「AA 信用利差」这类字样，受众是债圈从业者，
    // 不标注就等于用假数字冒充行情。
    expect(PULSE_DISCLAIMER).toMatch(/情景|推演|模拟/);
    const out = computePulseRows(base(ROLE_CFO, { financingCost: 6, cash: 5, leverageRatio: 70 }, -2, -1));
    expect(out.disclaimer).toBe(PULSE_DISCLAIMER);
  });

  it('政策收紧时利差走阔，delta 带正号', () => {
    const out = computePulseRows(base(ROLE_CFO, { financingCost: 6, cash: 5, leverageRatio: 70 }, -4, -1));
    const spread = out.rows.find(r => r.k.includes('利差'));
    expect(spread.deltaValue).toBeGreaterThan(0);
    expect(spread.delta.startsWith('+')).toBe(true);
  });

  it('政策转松时利差收窄，delta 带负号而不是「+-3」', () => {
    const out = computePulseRows(base(ROLE_CFO, { financingCost: 6, cash: 5, leverageRatio: 70 }, 2, -3));
    const spread = out.rows.find(r => r.k.includes('利差'));
    expect(spread.deltaValue).toBeLessThan(0);
    expect(spread.delta.startsWith('-')).toBe(true);
    expect(spread.delta).not.toContain('+-');
  });

  it('风险色由数值决定，不是写死的', () => {
    const tight = computePulseRows(base(ROLE_CFO, { financingCost: 6, cash: 5, leverageRatio: 70 }, -5, -5));
    const loose = computePulseRows(base(ROLE_CFO, { financingCost: 6, cash: 5, leverageRatio: 70 }, 5, 5));
    const lvlOf = (o) => o.rows.find(r => r.k.includes('利差')).lvl;
    expect(lvlOf(tight)).toBe('danger');
    expect(lvlOf(loose)).not.toBe('danger');
  });

  it('每个角色都有一行是拿玩家自己的指标跟同档比', () => {
    const cases = [
      [computePulseRows(base(ROLE_CFO, { financingCost: 8.5, cash: 3, leverageRatio: 78 }, -2, -2)),
       computePulseRows(base(ROLE_CFO, { financingCost: 4.5, cash: 9, leverageRatio: 60 }, -2, -2))],
      [computePulseRows(base(ROLE_IM, { nav: 0.88, aum: 120, cashRatio: 4, redemptionPressure: 70, duration: 3, concentration: 12, creditExposure: 40, leverage: 110 }, -2, -2)),
       computePulseRows(base(ROLE_IM, { nav: 1.12, aum: 240, cashRatio: 18, redemptionPressure: 8, duration: 2, concentration: 8, creditExposure: 12, leverage: 100 }, -2, -2))],
      [computePulseRows(base(ROLE_GOV, { debtRatio: 292, cash: 1, hiddenDebtRisk: 180, politicalScore: 30, industryIndex: 40 }, -2, -2)),
       computePulseRows(base(ROLE_GOV, { debtRatio: 205, cash: 9, hiddenDebtRisk: 40, politicalScore: 78, industryIndex: 70 }, -2, -2))],
    ];
    for (const [bad, good] of cases) {
      const b = bad.rows.find(r => r.self), g = good.rows.find(r => r.self);
      expect(b, '每个角色至少要有一行 self=true').toBeTruthy();
      // 同样的政策环境下，盘子差的那局这一行必须读数不同
      expect(b.v).not.toBe(g.v);
    }
  });

  it('开局第一季没有上季可比时不编造 delta', () => {
    const out = computePulseRows(base(ROLE_CFO, { financingCost: 6, cash: 5, leverageRatio: 70 }, -2, null));
    for (const r of out.rows) expect(r.delta).toBeNull();
  });
});
