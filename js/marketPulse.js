// js/marketPulse.js
// 「市场脉冲」面板的数据层。抽成纯模块是为了能被测试，也为了把口径写清楚：
//
// 这里的数字全部是本局政策轴 + 玩家自身指标推出来的情景值，不是任何真实行情源。
// 面板里出现「10Y 国债收益率」「AA 信用利差」这类术语，受众又是债圈从业者，
// 所以必须自报家门，见 PULSE_DISCLAIMER。

export const PULSE_DISCLAIMER = '情景推演 · 非真实行情';

// 每行的规格：
//   calc(ctx)   → 数值（ctx = { tighten, noise, m } ）
//   fmt(v)      → 展示串
//   dfmt(d)     → 变动展示串（不含符号，符号统一由 signed() 加）
//   worseWhen   → 'higher' | 'lower'，决定风险色的方向
//   warn/danger → 阈值（按 worseWhen 方向比较）
//   self        → 这一行读的是玩家自己的盘子，不是大盘
const ROLE_SPECS = {
  cfo: {
    sub: '本地城投融资环境',
    rows: [
      { k: 'AA 城投信用利差', worseWhen: 'higher', warn: 175, danger: 205,
        calc: c => 150 + c.tighten * 12 + c.noise(0) * 10,
        fmt: v => `${Math.round(v)} bp`, dfmt: d => `${Math.round(Math.abs(d))} bp` },
      { k: '本省取消发行', worseWhen: 'higher', warn: 4, danger: 6,
        calc: c => Math.max(0, 2 + c.tighten * 0.7 + c.noise(2) * 1.5),
        fmt: v => `${Math.round(v)} / 周`, dfmt: d => `${Math.round(Math.abs(d))}` },
      { k: '银行授信审批', worseWhen: 'higher', warn: 18, danger: 22,
        calc: c => 12 + c.tighten * 2.5 + c.noise(4) * 3,
        fmt: v => `T+${Math.round(v)} 天`, dfmt: d => `${Math.round(Math.abs(d))} 天` },
      { k: '你的成本 vs 同档', self: true, worseWhen: 'higher', warn: 40, danger: 90,
        // 同档基准随政策松紧走；玩家自己的综合融资成本减基准，单位 bp
        calc: c => ((c.m.financingCost ?? 6) - (5.6 + c.tighten * 0.18)) * 100,
        fmt: v => `${v >= 0 ? '+' : ''}${Math.round(v)} bp`, dfmt: d => `${Math.round(Math.abs(d))} bp` },
    ],
  },
  im: {
    sub: '公募债基行业',
    rows: [
      { k: '10Y 国债收益率', worseWhen: 'higher', warn: 2.72, danger: 2.82,
        calc: c => 2.5 + c.tighten * 0.05 + c.noise(6) * 0.08,
        fmt: v => `${v.toFixed(2)}%`, dfmt: d => `${Math.round(Math.abs(d) * 100)} bp` },
      { k: 'AA 信用利差', worseWhen: 'higher', warn: 175, danger: 205,
        calc: c => 150 + c.tighten * 12 + c.noise(0) * 10,
        fmt: v => `${Math.round(v)} bp`, dfmt: d => `${Math.round(Math.abs(d))} bp` },
      { k: '行业平均赎回率', worseWhen: 'higher', warn: 7, danger: 8.2,
        calc: c => 5.5 + c.tighten * 0.6 + c.noise(8) * 0.5,
        fmt: v => `${v.toFixed(1)}%`, dfmt: d => `${Math.abs(d).toFixed(1)} pp` },
      { k: '你的赎回压力 vs 行业', self: true, worseWhen: 'higher', warn: 15, danger: 35,
        // 玩家赎回压力指数 vs 行业情景基准（行业赎回率 ×5 折算到同一量纲）
        calc: c => (c.m.redemptionPressure ?? 10) - (5.5 + c.tighten * 0.6) * 5,
        fmt: v => `${v >= 0 ? '+' : ''}${Math.round(v)}`, dfmt: d => `${Math.round(Math.abs(d))}` },
    ],
  },
  gov: {
    sub: '政策与同侪',
    rows: [
      { k: '全国特殊再融资额度', worseWhen: 'lower', warn: 1.35, danger: 1.2,
        calc: c => 1.4 - c.tighten * 0.05 + c.noise(6) * 0.1,
        fmt: v => `${v.toFixed(1)} 万亿`, dfmt: d => `${Math.abs(d).toFixed(2)} 万亿` },
      { k: '省级转移支付增速', worseWhen: 'lower', warn: 2.6, danger: 2.0,
        calc: c => 3.2 - c.tighten * 0.4 + c.noise(9) * 0.4,
        fmt: v => `+${v.toFixed(1)}%`, dfmt: d => `${Math.abs(d).toFixed(1)} pp` },
      { k: '土地出让流拍率', worseWhen: 'higher', warn: 45, danger: 52,
        calc: c => 38 - c.tighten * -3 + c.noise(11) * 5,
        fmt: v => `${Math.round(v)}%`, dfmt: d => `${Math.round(Math.abs(d))} pp` },
      { k: '你的债务率 vs 同档', self: true, worseWhen: 'higher', warn: 15, danger: 40,
        // 同档区县均债务率随政策收紧上行；玩家自己的债务率减基准，单位 pp
        calc: c => (c.m.debtRatio ?? 248) - (248 + c.tighten * 4),
        fmt: v => `${v >= 0 ? '+' : ''}${Math.round(v)} pp`, dfmt: d => `${Math.round(Math.abs(d))} pp` },
    ],
  },
};

function hash32(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function levelOf(spec, v) {
  const worseHigher = spec.worseWhen === 'higher';
  if (worseHigher ? v >= spec.danger : v <= spec.danger) return 'danger';
  if (worseHigher ? v >= spec.warn : v <= spec.warn) return 'warn';
  return 'ok';
}

/**
 * 算出本季面板的行数据。
 * 变动值取「本季 vs 上季」的真实差，开局没有上季就返回 null（不编造 delta）。
 */
export function computePulseRows(state) {
  const roleId = state?.role?.id || 'cfo';
  const spec = ROLE_SPECS[roleId] || ROLE_SPECS.cfo;
  const m = state?.metrics || {};

  const seed = hash32(`${state?.year}${state?.quarter}${state?.origin?.platformName || ''}`);
  const noise = (idx) => ((seed >> (idx % 24)) & 0xff) / 255 - 0.5;

  const prev = state?.history?.[state.history.length - 1];
  const prevPolicy = typeof prev?.policyValue === 'number' ? prev.policyValue : null;

  const ctx = { tighten: -(state?.policyValue || 0), noise, m };
  const prevCtx = prevPolicy === null ? null : { tighten: -prevPolicy, noise, m };

  const rows = spec.rows.map(r => {
    const v = r.calc(ctx);
    const deltaValue = prevCtx === null ? null : v - r.calc(prevCtx);
    let delta = null;
    if (deltaValue !== null) {
      const sign = deltaValue > 0 ? '+' : (deltaValue < 0 ? '-' : '');
      delta = sign + r.dfmt(deltaValue);
    }
    return { k: r.k, v: r.fmt(v), lvl: levelOf(r, v), self: !!r.self, deltaValue, delta };
  });

  return { sub: spec.sub, disclaimer: PULSE_DISCLAIMER, rows };
}
