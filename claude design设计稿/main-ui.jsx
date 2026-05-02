/* 主界面 — 债市生存游戏
   3 角色共用骨架（topbar / 左指标+操作 / 中事件 / 右图表 / 底状态）
   桌面 1440×900 / 移动 375×自适应 */

const ROLE = {
  cfo: {
    name: "城投财务总监",
    short: "CFO",
    quarter: "2023 Q2",
    actions: 4,
    actionsTotal: 6,
    policy: -2, // -5..+5
    policyLabel: "偏紧",
    metrics: [
      { k: "现金 (亿)", v: "8.4", delta: "−1.2", deltaCls: "down", lvl: "warn", barPct: 28 },
      { k: "本季到期 (亿)", v: "12.6", delta: "+0.8", deltaCls: "down", lvl: "danger", barPct: 86 },
      { k: "资产负债率", v: "72.4", unit: "%", delta: "+1.8", deltaCls: "down", lvl: "warn", barPct: 72 },
      { k: "授信使用率", v: "91", unit: "%", delta: "+5", deltaCls: "down", lvl: "danger", barPct: 91 },
      { k: "综合融资成本", v: "7.85", unit: "%", delta: "+0.42", deltaCls: "down", lvl: "warn", barPct: 64 },
      { k: "可抵押物 (亿)", v: "3.1", delta: "−0.4", deltaCls: "down", lvl: "warn" },
      { k: "项目缺口 (亿)", v: "5.7", delta: "+0.6", deltaCls: "down", lvl: "danger" },
    ],
    actionsList: [
      { tag: "A1", label: "申请银行续贷", desc: "12 家银行，授信余额 1.4 亿", k: "1" },
      { tag: "A2", label: "发行城投债", desc: "AA 级，市场窗口偏紧", k: "2" },
      { tag: "A3", label: "处置抵押资产", desc: "土地评估折价 35%", k: "3" },
      { tag: "A4", label: "申请省级转贷", desc: "需省财政厅审批", k: "4" },
      { tag: "A5", label: "暂缓项目支出", desc: "民生项目不可压降", k: "5", locked: true },
    ],
    event: {
      id: "EV-203",
      sev: "high",
      sevLabel: "高危",
      src: "市场",
      time: "T+0 · 09:32",
      title: "主承销商通知：本期 8 亿城投债发行延期",
      body: <>债券市场情绪急转，<em>同省 3 家城投连续两日取消发行</em>。承销团建议利率上浮 60bp 重启或暂缓。<span className="danger-word">本期到期资金缺口 4.2 亿，距 T+5 还款日仅 7 天</span>。</>,
      options: [
        { key: "B", title: "利率上浮 60bp 重启发行", cost: "成本 +52 万/年", predLabel: "Predicted",
          pred: <>融资成本<b className="neg">↑0.6%</b>，但<b>现金缺口可补 4 亿</b>，债务到期压力下降。</> },
        { key: "C", title: "改用银行短融过渡", cost: "占用授信 5 亿", predLabel: "Predicted",
          pred: <>授信使用率<b className="neg">↑5%</b> → 96%（红线），<b>下季再融资难度极高</b>。</> },
        { key: "D", title: "申请省级专项纾困资金", cost: "审批周期 30 天", predLabel: "Predicted",
          pred: <>本期 <b className="neg">90% 概率违约</b>，但成功后利率<b className="pos">↓1.2%</b>。</> },
      ],
      log: "EV-201 通过：抵押 1.5 亿土地获 8000 万短贷 · 现金 +0.8 → 8.4",
    },
    charts: [
      { kind: "waterfall", title: "债务到期瀑布", meta: <>未来 4 季 · 合计 <b>38.4</b> 亿</>,
        data: { labels:["Q3","Q4","Q1","Q2"], vals:[12.6, 8.2, 11.4, 6.2], cash:[8.4, 0.2, 0, 0] },
        legend: [{c:"var(--danger)", t:"到期"},{c:"var(--info)", t:"现金"}] },
      { kind: "line", title: "现金趋势", meta: <>近 6 季 · 当前 <b>8.4</b> 亿</>,
        data: { vals:[14.2, 12.6, 11.0, 10.2, 9.6, 8.4], danger: 5, dangerLabel: "止血线 5.0" },
        legend: [{c:"var(--info)", t:"现金"},{c:"var(--danger)", t:"止血线"}] },
    ],
  },

  im: {
    name: "债券基金经理",
    short: "PM",
    quarter: "2022 Q4",
    actions: 3,
    actionsTotal: 6,
    policy: 1,
    policyLabel: "中性",
    metrics: [
      { k: "净值 (NAV)", v: "0.952", delta: "−0.024", deltaCls: "down", lvl: "danger", barPct: 38 },
      { k: "组合久期", v: "3.8", unit: "Y", delta: "−0.2", deltaCls: "flat", lvl: "" },
      { k: "AA 及以下占比", v: "56", unit: "%", delta: "+3", deltaCls: "down", lvl: "danger", barPct: 56 },
      { k: "持仓集中度 TOP10", v: "42", unit: "%", delta: "+2", deltaCls: "down", lvl: "warn", barPct: 42 },
      { k: "杠杆率", v: "118", unit: "%", delta: "+4", deltaCls: "down", lvl: "warn", barPct: 92 },
      { k: "流动性资产 (亿)", v: "2.4", delta: "−0.8", deltaCls: "down", lvl: "danger" },
    ],
    redeem: {
      level: 78, // 0-100
      expected: "8.6",
      cash: "2.4",
      gap: "6.2",
      delta: "+24 vs 上季",
    },
    actionsList: [
      { tag: "A1", label: "卖出 AA- 弱资质券", desc: "折价 1.2-2.5%，腾流动性", k: "1" },
      { tag: "A2", label: "续作回购", desc: "成本 2.85%，杠杆已偏高", k: "2" },
      { tag: "A3", label: "申报特殊再融资债置换", desc: "争取置换 8-10 亿", k: "3" },
      { tag: "A4", label: "暂停大额申购/赎回", desc: "需上报监管，影响声誉", k: "4" },
      { tag: "A5", label: "动用流动性储备", desc: "仅剩 2.4 亿", k: "5" },
    ],
    event: {
      id: "EV-318",
      sev: "high",
      sevLabel: "挤兑预警",
      src: "渠道",
      time: "T+0 · 14:08",
      title: "下周一预计净赎回 8.6 亿，缺口 6.2 亿",
      body: <>三家代销渠道反馈：<em>客户经理被要求重点排查 AA 持仓基金</em>。本基金 AA 及以下占比 56%，<span className="danger-word">单日净赎回上限或被触发</span>。卖券折价或扩大至 2-3%。</>,
      options: [
        { key: "B", title: "提前抛 5 亿 AA-", cost: "折价 -2.1%", predLabel: "Predicted",
          pred: <>流动性<b className="pos">+5.0 亿</b>，但 NAV<b className="neg">↓1.8%</b>，可能加速赎回。</> },
        { key: "C", title: "回购续作 + 卖国债置换", cost: "杠杆 +4%", predLabel: "Predicted",
          pred: <>流动性<b className="pos">+3.2 亿</b>，杠杆<b className="neg">→122%</b>（监管线 140）。</> },
        { key: "D", title: "上报特殊再融资置换", cost: "周期 21 天", predLabel: "Predicted",
          pred: <>本周缺口仍 <b className="neg">−3.0 亿</b>，但远期 AA 风险<b className="pos">↓18%</b>。</> },
      ],
      log: "EV-316 通过：续作回购 5 亿 · 杠杆 114 → 118",
    },
    charts: [
      { kind: "navline", title: "净值曲线", meta: <>近 12 周 · 当前 <b>0.952</b></>,
        data: { vals:[1.001, 1.005, 1.008, 1.002, 0.998, 0.992, 0.985, 0.978, 0.971, 0.965, 0.958, 0.952], danger: 0.85, dangerLabel: "0.85 死亡线" },
        legend: [{c:"var(--gold)", t:"NAV"},{c:"var(--danger)", t:"死亡线"}] },
      { kind: "donut", title: "持仓评级", meta: <>AA 及以下 <b>56%</b></>,
        data: [
          {label:"AAA", v:18, c:"var(--info)"},
          {label:"AA+", v:26, c:"var(--ok)"},
          {label:"AA", v:34, c:"var(--warn)"},
          {label:"AA-", v:18, c:"#ff8a3d"},
          {label:"<AA", v:4, c:"var(--danger)"},
        ],
        legend: [{c:"var(--ok)", t:"AA+ 及以上"},{c:"var(--warn)", t:"AA"},{c:"var(--danger)", t:"AA- 及以下"}] },
    ],
    alert: { tag: "REDEEM-78", msg: <>赎回压力 <b>78</b>（红区）— 下周一预计净赎回 <b>8.6 亿</b>，现金 2.4 亿，<b>缺口 6.2 亿</b>。建议：T+1 前抛 AA- 或申报置换。</>, meta: "T+0 14:08 · 渠道渗透率 92%" },
  },

  gov: {
    name: "地方政府官员",
    short: "GOV",
    quarter: "2024 Q1",
    actions: 5,
    actionsTotal: 6,
    policy: -3,
    policyLabel: "严格",
    metrics: [
      { k: "财政现金 (亿)", v: "24.6", delta: "−3.2", deltaCls: "down", lvl: "warn", barPct: 42 },
      { k: "综合债务率", v: "286", unit: "%", delta: "+12", deltaCls: "down", lvl: "danger", barPct: 95 },
      { k: "隐性债务敞口 (亿)", v: "188", delta: "+6", deltaCls: "down", lvl: "danger", barPct: 88 },
      { k: "政绩评分", v: "62", unit: "/100", delta: "−4", deltaCls: "down", lvl: "warn", barPct: 62 },
      { k: "专项债额度 (亿)", v: "14", delta: "−6", deltaCls: "down", lvl: "warn" },
      { k: "产业指数", v: "0.84", delta: "−0.03", deltaCls: "down", lvl: "warn" },
      { k: "本季财政收入 (亿)", v: "9.8", delta: "−2.1", deltaCls: "down", lvl: "danger" },
    ],
    actionsList: [
      { tag: "A1", label: "申报特殊再融资债", desc: "Q3 是最后窗口", k: "1" },
      { tag: "A2", label: "土地出让 (3 宗)", desc: "底价 12 亿，预期流拍率 40%", k: "2" },
      { tag: "A3", label: "向上汇报+争取转移支付", desc: "需省级批复", k: "3" },
      { tag: "A4", label: "压降基建项目", desc: "影响政绩与就业", k: "4" },
      { tag: "A5", label: "国企股权划转", desc: "需走 12 周流程", k: "5", locked: true },
    ],
    event: {
      id: "EV-441",
      sev: "high",
      sevLabel: "省级督查",
      src: "省财政厅",
      time: "T+0 · 10:00",
      title: "省厅反馈：辖内 3 平台同时上报化债方案，额度仅够 1 家",
      body: <>邻县率先报送，<em>额度优先按"债务率/财政收入比"排序</em>。本辖区当前 286%，<span className="danger-word">若 Q3 错过此次窗口，下次需等 18 个月</span>。同时省督导组下周到访，要求展示"压降路径"。</>,
      options: [
        { key: "B", title: "全力报送特殊再融资 8 亿", cost: "需 6 周 · 排序竞争", predLabel: "Predicted",
          pred: <>命中率约 <b className="pos">55%</b>，成功后债务率<b className="pos">↓18%</b>。</> },
        { key: "C", title: "土地出让兜底 + 国企融资替代", cost: "现金 -3 亿", predLabel: "Predicted",
          pred: <>本季现金<b className="pos">+9 亿</b>，但隐债<b className="neg">↑12 亿</b>，未来更难化解。</> },
        { key: "D", title: "压降基建保支付", cost: "政绩 -8", predLabel: "Predicted",
          pred: <>债务率<b className="pos">↓6%</b>，政绩评分<b className="neg">→54</b>，影响晋升通道。</> },
      ],
      log: "EV-439 通过：与平台债权人召开恳谈会 · 暂缓催收 1.2 亿",
    },
    charts: [
      { kind: "barpair", title: "财政收支", meta: <>本季差额 <b>−4.6</b> 亿</>,
        data: {
          labels:["Q2","Q3","Q4","Q1","Q2"],
          income:[12.4, 11.2, 10.6, 9.8, 9.8],
          expense:[13.0, 13.4, 14.0, 14.2, 14.4],
        },
        legend: [{c:"var(--ok)", t:"收入"},{c:"var(--danger)", t:"支出"}] },
      { kind: "line", title: "综合债务率", meta: <>当前 <b>286%</b> · 红线 300%</>,
        data: { vals:[238, 246, 258, 268, 274, 286], danger: 300, dangerLabel: "300% 红线" },
        legend: [{c:"var(--danger)", t:"债务率"},{c:"var(--danger)", t:"红线"}] },
    ],
  },
};

/* ============ helpers ============ */

function PolicyAxis({ value, label }) {
  // -5..+5 → 0..100%
  const pct = ((value + 5) / 10) * 100;
  const labels = ["严格","偏紧","中性","偏松","宽松"];
  return (
    <div className="policy-axis">
      <div className="policy-axis-head">
        <span>政策环境</span>
        <span className="now">当前 · <b>{label}</b> · {value > 0 ? "+" : ""}{value}</span>
      </div>
      <div className="policy-track">
        <div className="policy-ticks">
          <span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span>
        </div>
        <div className="policy-thumb" style={{ left: pct + "%" }}></div>
      </div>
      <div className="policy-labels">
        {labels.map((l,i) => <span key={i} className={label === l ? "active" : ""}>{l}</span>)}
      </div>
    </div>
  );
}

function Metric({ m }) {
  const cls = ["metric", m.lvl].filter(Boolean).join(" ");
  return (
    <div className={cls}>
      <span className="k">{m.k}</span>
      <span className="v">{m.v}{m.unit && <span className="unit">{m.unit}</span>}</span>
      {m.delta && <span className={"delta " + m.deltaCls}>{m.delta}</span>}
      {m.barPct != null && <div className="bar"><i style={{ width: m.barPct + "%" }}></i></div>}
    </div>
  );
}

function ActionBtn({ a, compact }) {
  return (
    <button className={"action-btn" + (a.locked ? " locked" : "") + (compact ? " compact" : "")}>
      <span className="tag mono">{a.tag}</span>
      <span className="label">
        {a.label}
        <span className="desc">{a.desc}</span>
      </span>
      <span className="kbd">{a.k}</span>
    </button>
  );
}

/* ============ Charts (SVG) ============ */

function ChartWaterfall({ data }) {
  // 4 quarters, bars stacked: due (red) + cash overlay (info)
  const W = 248, H = 100, P = 18;
  const max = Math.max(...data.vals) * 1.15;
  const bw = (W - P*2) / data.vals.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      {[0.25, 0.5, 0.75].map(y => (
        <line key={y} className="grid-line" x1={P} x2={W-P} y1={P + (H-P*2)*y} y2={P + (H-P*2)*y} />
      ))}
      {data.vals.map((v, i) => {
        const x = P + bw*i + 4;
        const w = bw - 8;
        const h = (v/max) * (H - P*2);
        const y = H - P - h;
        const ch = (data.cash[i] / max) * (H - P*2);
        return (
          <g key={i}>
            <rect x={x} y={y} width={w} height={h} fill="var(--danger)" opacity="0.85" rx="1" />
            {data.cash[i] > 0 && <rect x={x} y={H - P - ch} width={w} height={ch} fill="var(--info)" opacity="0.55" rx="1" />}
            <text x={x + w/2} y={y - 3} className="axis-text" textAnchor="middle" fill="var(--text-2)">{v}</text>
            <text x={x + w/2} y={H - 4} className="axis-text" textAnchor="middle">{data.labels[i]}</text>
          </g>
        );
      })}
    </svg>
  );
}

function ChartLine({ data }) {
  const W = 248, H = 100, P = 18;
  const vals = data.vals;
  const min = Math.min(...vals, data.danger != null ? data.danger : Infinity) * 0.95;
  const max = Math.max(...vals, data.danger != null ? data.danger : -Infinity) * 1.05;
  const sx = i => P + (i / (vals.length-1)) * (W - P*2);
  const sy = v => P + (1 - (v - min) / (max - min)) * (H - P*2);
  const path = vals.map((v,i) => (i?"L":"M") + sx(i) + " " + sy(v)).join(" ");
  const dy = data.danger != null ? sy(data.danger) : null;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      {[0.25, 0.5, 0.75].map(y => (
        <line key={y} className="grid-line" x1={P} x2={W-P} y1={P + (H-P*2)*y} y2={P + (H-P*2)*y} />
      ))}
      {dy != null && <>
        <line className="danger-line" x1={P} x2={W-P} y1={dy} y2={dy} />
        <text x={W-P} y={dy - 3} textAnchor="end" className="danger-line-text">{data.dangerLabel}</text>
      </>}
      <path d={path} fill="none" stroke="var(--info)" strokeWidth="1.6" />
      {vals.map((v,i) => <circle key={i} cx={sx(i)} cy={sy(v)} r="2" fill="var(--info)" />)}
      <text x={W-P} y={sy(vals[vals.length-1]) - 6} textAnchor="end" className="axis-text" fill="var(--text-1)">{vals[vals.length-1]}</text>
    </svg>
  );
}

function ChartNavLine({ data }) {
  const W = 248, H = 100, P = 18;
  const vals = data.vals;
  const min = data.danger * 0.97;
  const max = Math.max(...vals) * 1.005;
  const sx = i => P + (i / (vals.length-1)) * (W - P*2);
  const sy = v => P + (1 - (v - min) / (max - min)) * (H - P*2);
  const path = vals.map((v,i) => (i?"L":"M") + sx(i) + " " + sy(v)).join(" ");
  const fillPath = path + ` L ${sx(vals.length-1)} ${H-P} L ${sx(0)} ${H-P} Z`;
  const dy = sy(data.danger);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <line className="grid-line" x1={P} x2={W-P} y1={sy(1.0)} y2={sy(1.0)} />
      <text x={P} y={sy(1.0) - 2} className="axis-text">1.000</text>
      <path d={fillPath} fill="var(--gold)" opacity="0.08" />
      <line className="danger-line" x1={P} x2={W-P} y1={dy} y2={dy} />
      <text x={W-P} y={dy + 10} textAnchor="end" className="danger-line-text">{data.dangerLabel}</text>
      <path d={path} fill="none" stroke="var(--gold)" strokeWidth="1.6" />
      <circle cx={sx(vals.length-1)} cy={sy(vals[vals.length-1])} r="2.5" fill="var(--gold)" />
      <text x={sx(vals.length-1) - 4} y={sy(vals[vals.length-1]) - 4} textAnchor="end" className="axis-text" fill="var(--text-1)">{vals[vals.length-1].toFixed(3)}</text>
    </svg>
  );
}

function ChartDonut({ data }) {
  const total = data.reduce((s,d)=>s+d.v, 0);
  const R = 48, r = 32, cx = 56, cy = 52;
  let a0 = -Math.PI/2;
  const arcs = data.map(d => {
    const a1 = a0 + (d.v/total) * Math.PI*2;
    const big = (a1-a0) > Math.PI ? 1 : 0;
    const x0 = cx + R*Math.cos(a0), y0 = cy + R*Math.sin(a0);
    const x1 = cx + R*Math.cos(a1), y1 = cy + R*Math.sin(a1);
    const xi0 = cx + r*Math.cos(a0), yi0 = cy + r*Math.sin(a0);
    const xi1 = cx + r*Math.cos(a1), yi1 = cy + r*Math.sin(a1);
    const path = `M ${x0} ${y0} A ${R} ${R} 0 ${big} 1 ${x1} ${y1} L ${xi1} ${yi1} A ${r} ${r} 0 ${big} 0 ${xi0} ${yi0} Z`;
    a0 = a1;
    return { d, path };
  });
  return (
    <svg viewBox="0 0 248 108" preserveAspectRatio="xMinYMid meet">
      {arcs.map((a,i) => <path key={i} d={a.path} fill={a.d.c} />)}
      <text x={cx} y={cy - 1} textAnchor="middle" fill="var(--text-3)" style={{fontSize:"7.5px", letterSpacing:"0.1em", fontFamily:"var(--font-mono)"}}>TOTAL</text>
      <text x={cx} y={cy + 11} textAnchor="middle" fill="var(--text-1)" style={{fontSize:"15px", fontFamily:"var(--font-mono)", fontWeight:600}}>{total}%</text>
      {data.map((d,i) => (
        <g key={i}>
          <rect x={120} y={14 + i*16} width="7" height="7" fill={d.c} rx="1" />
          <text x={132} y={20 + i*16} fill="var(--text-2)" style={{fontSize:"10px", fontFamily:"var(--font-mono)", letterSpacing:"0.04em"}}>{d.label}</text>
          <text x={236} y={20 + i*16} textAnchor="end" fill="var(--text-1)" style={{fontSize:"10.5px", fontFamily:"var(--font-mono)", fontVariantNumeric:"tabular-nums"}}>{d.v}%</text>
        </g>
      ))}
    </svg>
  );
}

function ChartBarPair({ data }) {
  const W = 248, H = 100, P = 18;
  const max = Math.max(...data.income, ...data.expense) * 1.15;
  const bw = (W - P*2) / data.labels.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      {[0.25, 0.5, 0.75].map(y => (
        <line key={y} className="grid-line" x1={P} x2={W-P} y1={P + (H-P*2)*y} y2={P + (H-P*2)*y} />
      ))}
      {data.labels.map((lbl, i) => {
        const x = P + bw*i + 4;
        const w = (bw - 10) / 2;
        const hi = (data.income[i]/max) * (H - P*2);
        const he = (data.expense[i]/max) * (H - P*2);
        return (
          <g key={i}>
            <rect x={x} y={H - P - hi} width={w} height={hi} fill="var(--ok)" opacity="0.85" rx="1" />
            <rect x={x + w + 2} y={H - P - he} width={w} height={he} fill="var(--danger)" opacity="0.85" rx="1" />
            <text x={x + w + 1} y={H - 4} className="axis-text" textAnchor="middle">{lbl}</text>
          </g>
        );
      })}
    </svg>
  );
}

function ChartPanel({ chart, size = "md" }) {
  const sz = chart.kind === "donut" ? "tall" : size;
  return (
    <div className={"chart-panel size-" + sz}>
      <div className="chart-head">
        <span>{chart.title}</span>
        <span className="v">{chart.meta}</span>
      </div>
      <div className="chart-body">
        {chart.kind === "waterfall" && <ChartWaterfall data={chart.data} />}
        {chart.kind === "line" && <ChartLine data={chart.data} />}
        {chart.kind === "navline" && <ChartNavLine data={chart.data} />}
        {chart.kind === "donut" && <ChartDonut data={chart.data} />}
        {chart.kind === "barpair" && <ChartBarPair data={chart.data} />}
      </div>
      <div className="chart-foot">
        {(chart.legend || []).map((l,i) => (
          <span key={i} className="legend"><i style={{background:l.c}}></i>{l.t}</span>
        ))}
      </div>
    </div>
  );
}

/* ============ IM 赎回压力卡 ============ */

function RedeemCard({ r }) {
  const lvl = r.level;
  let cls = "lvl-green";
  if (lvl >= 70) cls = "lvl-red";
  else if (lvl >= 50) cls = "lvl-orange";
  else if (lvl >= 30) cls = "lvl-yellow";
  const danger = lvl >= 70;
  return (
    <div className={"redeem" + (danger ? " danger" : "")}>
      <div className="redeem-head">
        <span><span className="ax">⨯</span> 赎回压力</span>
        <span className="stat">vs 上季 <b className="up">{r.delta}</b></span>
      </div>
      <div className="redeem-num">
        <span className="big">{lvl}</span>
        <span className="unit">/ 100</span>
        <span className="delta">{danger ? "红区 · 触发预警" : "中性"}</span>
      </div>
      <div className={"redeem-bar " + cls}>
        <i style={{ width: lvl + "%" }}></i>
      </div>
      <div className="redeem-marks">
        <span style={{left:"15%"}}>30</span>
        <span style={{left:"50%"}}>50</span>
        <span style={{left:"70%"}}>70</span>
      </div>
      <div className="redeem-grid">
        <div className="cell">
          <span className="k">下季预期赎回</span>
          <span className="v">{r.expected} 亿</span>
        </div>
        <div className="cell">
          <span className="k">当前现金</span>
          <span className="v">{r.cash} 亿</span>
        </div>
        <div className="cell gap">
          <span className="k">缺口</span>
          <span className="v">−{r.gap} 亿</span>
        </div>
      </div>
    </div>
  );
}

/* ============ 中栏底部：预演 + 日志 ============ */

function ImpactPanel({ role, d }) {
  // 三角色给一组关键风险指标的预演条（show current → projected if no action）
  const projections = {
    cfo: [
      { k: "现金", from: "8.4 亿", to: "4.2 亿", dir: "down", danger: true, note: "T+5 还款日" },
      { k: "授信使用率", from: "91%", to: "96%", dir: "down", danger: true, note: "逼近 100% 红线" },
      { k: "本季利润", from: "+0.6 亿", to: "−0.3 亿", dir: "down", danger: false, note: "首次转亏" },
    ],
    im: [
      { k: "净值 NAV", from: "0.952", to: "0.918", dir: "down", danger: true, note: "距死亡线 +0.07" },
      { k: "流动性资产", from: "2.4 亿", to: "−3.8 亿", dir: "down", danger: true, note: "缺口 6.2" },
      { k: "AA- 占比", from: "18%", to: "22%", dir: "down", danger: false, note: "被动抬升" },
    ],
    gov: [
      { k: "综合债务率", from: "286%", to: "298%", dir: "down", danger: true, note: "逼近 300% 红线" },
      { k: "财政现金", from: "24.6 亿", to: "16.0 亿", dir: "down", danger: false, note: "工资刚性支出" },
      { k: "政绩评分", from: "62", to: "58", dir: "down", danger: false, note: "Q3 考核窗口" },
    ],
  };
  const rows = projections[role];
  return (
    <div className="impact">
      <div className="impact-head">
        <span><span className="ax">⟶</span> 不行动 · 季末预演</span>
        <span className="meta">PROJECTED · 仅供参考</span>
      </div>
      <div className="impact-rows">
        {rows.map((r, i) => (
          <div key={i} className={"impact-row" + (r.danger ? " danger" : "")}>
            <span className="k">{r.k}</span>
            <span className="from mono">{r.from}</span>
            <span className="arrow mono">→</span>
            <span className={"to mono " + r.dir}>{r.to}</span>
            <span className="note">{r.note}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DecisionLog({ d }) {
  // 用 event.log 作为最近一条；前面再编两条历史
  const ROLE_LOG = {
    cfo: [
      { q: "Q1", text: "EV-198 通过：续作银行贷款 2 亿 · 现金 9.6 → 11.6", impact: "+2.0 亿现金" },
      { q: "Q1", text: "EV-201 通过：抵押 1.5 亿土地获 8000 万短贷", impact: "现金 +0.8" },
      { q: "Q2", text: "EV-202 拒绝：暂缓项目支出 — 民生项目刚性", impact: "现金 −0" },
    ],
    im: [
      { q: "W3", text: "EV-310 通过：减仓城投 8% → 流动性 +2.4 亿", impact: "NAV −0.6%" },
      { q: "W4", text: "EV-314 拒绝：暂停大额申购 — 保留客户体验", impact: "声誉 0" },
      { q: "W5", text: "EV-316 通过：续作回购 5 亿", impact: "杠杆 114 → 118" },
    ],
    gov: [
      { q: "Q4", text: "EV-435 通过：协调银行展期 6 亿城投贷款", impact: "+6 亿展期" },
      { q: "Q4", text: "EV-437 通过：变现非主业国企股权 1.8 亿", impact: "+1.8 亿现金" },
      { q: "Q1", text: "EV-439 通过：与平台债权人恳谈会暂缓催收", impact: "+1.2 亿喘息" },
    ],
  };
  const role = d.short === "PM" ? "im" : d.short === "CFO" ? "cfo" : "gov";
  const items = ROLE_LOG[role];
  return (
    <div className="declog">
      <div className="declog-head">
        <span><span className="ax">▾</span> 决策日志</span>
        <span className="meta">{items.length} 条 · 本局</span>
      </div>
      <div className="declog-rows">
        {items.map((it, i) => (
          <div key={i} className="declog-row mono">
            <span className="q">{it.q}</span>
            <span className="t">{it.text}</span>
            <span className="im">{it.impact}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============ 右栏底部：目标进度 ============ */

function GoalCard({ role, d }) {
  const GOALS = {
    cfo: {
      title: "存活 12 季",
      sub: "且期末现金 ≥ 0",
      bars: [
        { k: "已存活回合", v: "3 / 12", pct: 25, lvl: "ok" },
        { k: "现金底线", v: "8.4 / 0 亿", pct: 84, lvl: "warn", note: "距底线 +8.4" },
        { k: "未触发违约", v: "0 次", pct: 100, lvl: "ok" },
      ],
      rank: { you: 1284, total: 8420, pct: 15 },
    },
    im: {
      title: "净值守 0.85",
      sub: "12 季不破死亡线",
      bars: [
        { k: "已存活回合", v: "5 / 12", pct: 42, lvl: "ok" },
        { k: "NAV 缓冲", v: "0.952 / 0.85", pct: 68, lvl: "warn", note: "缓冲 +0.102" },
        { k: "未触发清盘", v: "0 次", pct: 100, lvl: "ok" },
      ],
      rank: { you: 642, total: 5180, pct: 12 },
    },
    gov: {
      title: "压降 50pp 债务率",
      sub: "至 236% 以下",
      bars: [
        { k: "已存活回合", v: "8 / 12", pct: 67, lvl: "ok" },
        { k: "压降进度", v: "+12pp / -50pp", pct: 14, lvl: "danger", note: "方向相反" },
        { k: "政绩评分", v: "62 / 60", pct: 62, lvl: "warn" },
      ],
      rank: { you: 1820, total: 6240, pct: 29 },
    },
  };
  const g = GOALS[role];
  return (
    <div className="goal">
      <div className="goal-head">
        <span><span className="ax">◇</span> 本局目标</span>
        <span className="meta">GOAL</span>
      </div>
      <div className="goal-title">{g.title}</div>
      <div className="goal-sub">{g.sub}</div>
      <div className="goal-bars">
        {g.bars.map((b, i) => (
          <div key={i} className={"goal-bar lvl-" + b.lvl}>
            <div className="row">
              <span className="k">{b.k}</span>
              <span className="v mono">{b.v}</span>
            </div>
            <div className="track"><i style={{ width: b.pct + "%" }}></i></div>
            {b.note && <span className="note">{b.note}</span>}
          </div>
        ))}
      </div>
      <div className="goal-rank">
        <div className="row">
          <span className="k">全球排名</span>
          <span className="v mono">#{g.rank.you} / {g.rank.total}</span>
        </div>
        <div className="track"><i style={{ width: g.rank.pct + "%" }}></i></div>
        <span className="note">前 {g.rank.pct}% · 击败 {100 - g.rank.pct}%</span>
      </div>
    </div>
  );
}

/* ============ 右栏：市场脉冲 ============ */

function PulseSpark({ vals, lvl }) {
  const W = 56, H = 16;
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = (max - min) || 1;
  const sx = i => (i / (vals.length - 1)) * W;
  const sy = v => H - 2 - ((v - min) / span) * (H - 4);
  const path = vals.map((v, i) => (i ? "L" : "M") + sx(i).toFixed(1) + " " + sy(v).toFixed(1)).join(" ");
  const color = lvl === "danger" ? "var(--danger)" : lvl === "warn" ? "var(--warn)" : "var(--ok)";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="pulse-spark">
      <path d={path} fill="none" stroke={color} strokeWidth="1.2" />
      <circle cx={sx(vals.length - 1)} cy={sy(vals[vals.length - 1])} r="1.6" fill={color} />
    </svg>
  );
}

function PulseCard({ role }) {
  const PULSE = {
    cfo: {
      sub: "本地城投融资环境",
      rows: [
        { k: "AA 城投信用利差", v: "168 bp", delta: "+24", lvl: "danger", spark: [142,148,150,156,162,168] },
        { k: "本省取消发行", v: "3 / 周", delta: "+2", lvl: "warn", spark: [0,0,1,1,2,3] },
        { k: "银行授信审批", v: "T+18 天", delta: "+6", lvl: "warn", spark: [10,11,12,14,16,18] },
        { k: "土地拍卖溢价率", v: "−4.2%", delta: "−1.8", lvl: "warn", spark: [2,1,0,-2,-3,-4] },
      ],
    },
    im: {
      sub: "公募债基行业",
      rows: [
        { k: "10Y 国债收益率", v: "2.62%", delta: "+8 bp", lvl: "warn", spark: [2.48,2.52,2.55,2.56,2.60,2.62] },
        { k: "AA 信用利差", v: "182 bp", delta: "+18", lvl: "danger", spark: [158,164,168,172,178,182] },
        { k: "行业平均赎回率", v: "6.8%", delta: "+2.4", lvl: "danger", spark: [3.2,4.0,4.6,5.2,6.0,6.8] },
        { k: "回购加权利率", v: "2.85%", delta: "+22 bp", lvl: "warn", spark: [2.48,2.55,2.62,2.70,2.78,2.85] },
      ],
    },
    gov: {
      sub: "政策与同侪",
      rows: [
        { k: "全国特殊再融资额度", v: "1.4 万亿", delta: "Q3 截止", lvl: "warn", spark: [1.0,1.1,1.2,1.3,1.4,1.4] },
        { k: "同档区县均债务率", v: "248%", delta: "我 +38pp", lvl: "danger", spark: [232,236,240,244,246,248] },
        { k: "省级转移支付增速", v: "+3.2%", delta: "−1.8", lvl: "warn", spark: [6,5.5,5,4.4,3.8,3.2] },
        { k: "土地出让流拍率", v: "38%", delta: "+8", lvl: "danger", spark: [22,26,28,32,36,38] },
      ],
    },
  };
  const p = PULSE[role];
  return (
    <div className="pulse">
      <div className="pulse-head">
        <span><span className="ax">⏚</span> 市场脉冲</span>
        <span className="meta">{p.sub}</span>
      </div>
      <div className="pulse-rows">
        {p.rows.map((r, i) => (
          <div key={i} className={"pulse-row lvl-" + r.lvl}>
            <span className="k">{r.k}</span>
            <PulseSpark vals={r.spark} lvl={r.lvl} />
            <span className="v mono">{r.v}</span>
            <span className={"d mono lvl-" + r.lvl}>{r.delta}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============ 主组件 ============ */

function MainUI({ role = "cfo", variant = "desktop" }) {
  const d = ROLE[role];
  const isMobile = variant === "mobile";
  const showAlert = role === "im" && d.alert;
  const [tab, setTab] = React.useState("market");

  const Topbar = (
    <div className="topbar">
      <div className="tb-left">
        <span className="tb-role-dot"></span>
        <span className="tb-role-name mono">{d.short} · {d.name}</span>
        <span className="tb-sep"></span>
        <span className="tb-game-name">债市生存</span>
        <span className="tb-quarter mono">{d.quarter} · <b>第 {d.actionsTotal - d.actions + 1}/12 回合</b></span>
      </div>
      <PolicyAxis value={d.policy} label={d.policyLabel} />
      <div className="tb-right">
        <span className="actions-left">
          <span className="num">{d.actions}</span>
          <span style={{color:"var(--text-3)"}}>/{d.actionsTotal}</span>
          <span className="lbl">本季 · 剩余操作</span>
        </span>
        <button className="tb-icon-btn" title="日志">≡</button>
      </div>
    </div>
  );

  const LeftCol = (
    <div className="col col-l">
      <div className="panel">
        <div className="panel-head">
          <span><span className="ax">●</span> 我的指标</span>
          <span className="meta">{d.metrics.length} items</span>
        </div>
        <div className={"metric-grid" + (isMobile ? "" : " cols-2")}>
          {d.metrics.map((m,i) => <Metric key={i} m={m} />)}
        </div>
      </div>
      {role === "im" && (
        <div className="panel">
          <div className="panel-head">
            <span><span className="ax" style={{color:"var(--danger)"}}>!</span> 赎回压力</span>
            <span className="meta">live</span>
          </div>
          <RedeemCard r={d.redeem} />
        </div>
      )}
      <GoalCard role={role} d={d} />
    </div>
  );

  const ev = d.event;
  const CenterCol = (
    <div className="col col-c">
      <div className="event">
        <div className="event-head">
          <div className="event-meta">
            <span className="id mono">{ev.id}</span>
            <span className={"sev " + ev.sev}>{ev.sevLabel}</span>
            <span className="src">来源 · {ev.src}</span>
          </div>
          <span className="event-time">{ev.time}</span>
        </div>
        <div className="event-title">{ev.title}</div>
        <div className="event-body">{ev.body}</div>
        <div className="event-options">
          {ev.options.map((o,i) => (
            <button className="opt" key={i}>
              <div className="opt-head">
                <span className="opt-key mono">{o.key} ▸</span>
                <span className="opt-cost">{o.cost}</span>
              </div>
              <div className="opt-title">{o.title}</div>
              <div className="opt-foot">
                <span className="pred-label">{o.predLabel} · 预计</span>
                <span className="pred-text">{o.pred}</span>
              </div>
            </button>
          ))}
        </div>
        <div className="event-log">
          <span className="ax">⟶ LOG</span>
          <span>{ev.log}</span>
          <span className="more">查看全部 ›</span>
        </div>
      </div>
      <div className="actions-bar">
        <div className="actions-bar-head">
          <span><span className="ax">▸</span> 主动操作 · 可选加行动作</span>
          <span className="meta">{d.actions}/{d.actionsTotal} 剩余 · 不消耗事件回合</span>
        </div>
        <div className="actions-grid">
          {d.actionsList.map((a,i) => <ActionBtn key={i} a={a} compact />)}
        </div>
      </div>
      <div className="center-bot">
        <ImpactPanel role={role} d={d} />
        <DecisionLog d={d} />
      </div>
    </div>
  );

  const RightCol = (
    <div className="col col-r">
      {d.charts.map((c,i) => <ChartPanel key={i} chart={c} size="md" />)}
      <PulseCard role={role} />
    </div>
  );

  const Statusbar = (
    <div className="statusbar">
      <span className="sb-item"><span className="k">目标</span><b>{role === "cfo" ? "存活 12 季 · 期末现金 ≥ 0" : role === "im" ? "净值守住 0.95 · 12 季不破 0.85" : "压降 50 个百分点债务率"}</b></span>
      <span className="sb-item"><span className="k">回合</span><b>{d.actionsTotal - d.actions + 1} / 12</b></span>
      <span className="sb-item"><span className="k">政策</span><b>{d.policyLabel}</b></span>
      <span className="sb-spacer"></span>
      <span className="sb-pill">SEED-{role.toUpperCase()}-{d.short === "PM" ? "B2C9" : d.short === "GOV" ? "C5E1" : "A7F3"}</span>
      <span className="sb-pill">AUTOSAVE · {ev.time}</span>
    </div>
  );

  // 移动端：market = 事件 + 操作（合并）+ 预演
  const MobileMarketTab = (
    <div className="col col-c">
      <div className="event">
        <div className="event-head">
          <div className="event-meta">
            <span className="id mono">{ev.id}</span>
            <span className={"sev " + ev.sev}>{ev.sevLabel}</span>
            <span className="src">来源 · {ev.src}</span>
          </div>
          <span className="event-time">{ev.time}</span>
        </div>
        <div className="event-title">{ev.title}</div>
        <div className="event-body">{ev.body}</div>
        <div className="event-options">
          {ev.options.map((o,i) => (
            <button className="opt" key={i}>
              <div className="opt-head">
                <span className="opt-key mono">{o.key} ▸</span>
                <span className="opt-cost">{o.cost}</span>
              </div>
              <div className="opt-title">{o.title}</div>
              <div className="opt-foot">
                <span className="pred-label">{o.predLabel} · 预计</span>
                <span className="pred-text">{o.pred}</span>
              </div>
            </button>
          ))}
        </div>
        <div className="event-log">
          <span className="ax">⟶ LOG</span>
          <span>{ev.log}</span>
        </div>
      </div>
      <div className="actions-bar">
        <div className="actions-bar-head">
          <span><span className="ax">▸</span> 主动操作</span>
          <span className="meta">{d.actions}/{d.actionsTotal} 剩余</span>
        </div>
        <div className="actions-grid">
          {d.actionsList.map((a,i) => <ActionBtn key={i} a={a} compact />)}
        </div>
      </div>
      <ImpactPanel role={role} d={d} />
    </div>
  );

  // 移动端：操作 tab — 指标 + 决策日志 + 市场脉冲
  const MobileActionsTab = (
    <div className="col col-l">
      {role === "im" && (
        <div className="panel">
          <div className="panel-head">
            <span><span className="ax" style={{color:"var(--danger)"}}>!</span> 赎回压力</span>
            <span className="meta">live</span>
          </div>
          <RedeemCard r={d.redeem} />
        </div>
      )}
      <div className="panel">
        <div className="panel-head">
          <span><span className="ax">●</span> 我的指标</span>
          <span className="meta">{d.metrics.length} items</span>
        </div>
        <div className="metric-grid">
          {d.metrics.map((m,i) => <Metric key={i} m={m} />)}
        </div>
      </div>
      <PulseCard role={role} />
      <DecisionLog d={d} />
    </div>
  );

  // 移动端：目标 tab — GoalCard + 关键指标大卡 + 横滑次要指标
  const dangerMetrics = d.metrics.filter(m => m.lvl === "danger").slice(0, 2);
  const otherMetrics = d.metrics.filter(m => m.lvl !== "danger");
  const MobileGoalsTab = (
    <div className="col col-r">
      {role === "im" && (
        <div className="panel">
          <div className="panel-head">
            <span><span className="ax" style={{color:"var(--danger)"}}>!</span> 赎回压力</span>
            <span className="meta">live</span>
          </div>
          <RedeemCard r={d.redeem} />
        </div>
      )}
      <GoalCard role={role} d={d} />
      <div className="panel">
        <div className="panel-head">
          <span><span className="ax" style={{color:"var(--danger)"}}>!</span> 关键风险</span>
          <span className="meta">{dangerMetrics.length} items</span>
        </div>
        <div className="risk-cards">
          {dangerMetrics.map((m, i) => (
            <div key={i} className="risk-card">
              <div className="rk">{m.k}</div>
              <div className="rv mono"><span className="big">{m.v}</span>{m.unit && <span className="u">{m.unit}</span>}</div>
              <div className="rd mono down">{m.delta}</div>
              {m.barPct != null && <div className="rb"><i style={{ width: m.barPct + "%" }}></i></div>}
            </div>
          ))}
        </div>
      </div>
      <div className="panel">
        <div className="panel-head">
          <span><span className="ax">●</span> 其他指标</span>
          <span className="meta">← 滑动 →</span>
        </div>
        <div className="metric-strip">
          {otherMetrics.map((m, i) => (
            <div key={i} className="ms-card">
              <div className="msk">{m.k}</div>
              <div className="msv mono">{m.v}{m.unit && <span className="u">{m.unit}</span>}</div>
              {m.delta && <div className={"msd mono " + m.deltaCls}>{m.delta}</div>}
            </div>
          ))}
        </div>
      </div>
      <ChartPanel chart={d.charts[0]} size="md" />
    </div>
  );

  return (
    <div className={"ui" + (isMobile ? " mobile" : "")} data-role={role}>
      {Topbar}
      {showAlert && (
        <div className="alert-banner">
          <span className="ico">!</span>
          <span className="tag mono">{d.alert.tag}</span>
          <span className="msg">{d.alert.msg}</span>
          <span className="meta">{d.alert.meta}</span>
        </div>
      )}
      {isMobile && (
        <div className="seg-tabs">
          {[
            {k:"market", l:"事件 / 操作", s:"决策中心"},
            {k:"actions", l:"指标 / 日志", s:`${d.metrics.length} 项 · 本局`},
            {k:"goals", l:"目标 / 风险", s:"本局"},
          ].map(t => (
            <button key={t.k} className={"seg-tab" + (tab === t.k ? " active" : "")} onClick={() => setTab(t.k)}>
              <span className="seg-l">{t.l}</span>
              <span className="seg-s">{t.s}</span>
            </button>
          ))}
        </div>
      )}
      <div className="main">
        {!isMobile && LeftCol}
        {!isMobile && CenterCol}
        {!isMobile && RightCol}
        {isMobile && tab === "market" && MobileMarketTab}
        {isMobile && tab === "actions" && MobileActionsTab}
        {isMobile && tab === "goals" && MobileGoalsTab}
      </div>
      {Statusbar}
    </div>
  );
}

window.MainUI = MainUI;
