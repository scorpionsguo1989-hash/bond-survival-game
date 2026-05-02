/* global React */
const { useState } = React;

// ===== 三角色数据 ===========================================================
const ROLE_DATA = {
  cfo: {
    role: "cfo",
    badgeEN: "CFO",
    badgeZH: "城投财务总监",
    name: "压舱石",
    nameQuote: "// codename · ballast",
    org: "玄武国控",
    seedId: "SEED-2022-A7F3",
    tags: [
      { kind: "k", k: "区域", v: "西部地级市" },
      { kind: "k", k: "业务", v: "公用事业为主" },
      { kind: "warn", v: "承压" },
      { kind: "danger", v: "隐债重灾区" },
    ],
    challenges: [
      "开局即面临大额到期，现金不足以单独覆盖，必须立即行动",
      "隐债核查压力大，非标融资被监管叫停，灰色补血渠道堵死",
      "区域财力有限，转移支付占比高，自给率低",
    ],
    goal: { text: "存活", q: 12, suffix: "季度，期末现金不归零" },
    risks: [
      { text: "现金归零", meta: "→ 资金链断裂", danger: true },
      { text: "Q5–Q7 是债券到期高峰", meta: "提前备弹药很重要" },
      { text: "初始现金紧张", meta: "Q1–Q2 不能大手大脚" },
    ],
    tip: {
      pre: "第一回合先",
      hl: "申请银行续贷",
      post: "预留 1–2 亿子弹",
    },
  },

  im: {
    role: "im",
    badgeEN: "PM",
    badgeZH: "债券基金经理",
    name: "踏浪人",
    nameQuote: "// codename · surfer",
    org: "金穗资管 · 稳健 06 号",
    seedId: "SEED-2022-B2C9",
    tags: [
      { kind: "k", k: "策略", v: "信用挖票息" },
      { kind: "k", k: "规模", v: "120 亿" },
      { kind: "warn", v: "杠杆偏高" },
      { kind: "danger", v: "AA 集中" },
    ],
    challenges: [
      "组合 AA 及以下占比过半，理财赎回潮一来净值首当其冲",
      "杠杆已贴近合规上限，回购续作风险高，加仓空间有限",
      "客户结构以银行委外为主，赎回触发线敏感，容错率低",
    ],
    goal: { text: "守住", q: 0.95, suffix: "净值，12 季度不破刚兑线" },
    risks: [
      { text: "净值跌破 0.95", meta: "→ 触发集中赎回", danger: true },
      { text: "Q4 理财净值化集中冲击", meta: "提前降低集中度" },
      { text: "AA- 持仓占比过高", meta: "需要分批换仓" },
    ],
    tip: {
      pre: "第一回合先",
      hl: "卖出 AA- 弱资质券",
      post: "腾出 5 个点流动性",
    },
  },

  gov: {
    role: "gov",
    badgeEN: "GOV",
    badgeZH: "地方政府官员",
    name: "走钢丝",
    nameQuote: "// codename · funambulist",
    org: "黄岩区财政局",
    seedId: "SEED-2022-C5E1",
    tags: [
      { kind: "k", k: "层级", v: "区县" },
      { kind: "k", k: "评级", v: "省级关注" },
      { kind: "warn", v: "化债考核" },
      { kind: "danger", v: "综合债务率 286%" },
    ],
    challenges: [
      "综合债务率超红线，省级要求年内压降，化债指标硬约束",
      "土地出让收入断崖下滑，财政自给率不足六成，缺口扩大",
      "辖内 3 家平台同时报送化债方案，专项债额度有限需要排序",
    ],
    goal: { text: "压降", q: 50, suffix: "个百分点债务率，并完成化债任务" },
    risks: [
      { text: "化债任务未完成", meta: "→ 政绩评分清零", danger: true },
      { text: "Q3 是专项债申报截止", meta: "错过等下一年度" },
      { text: "土地财政依赖度过高", meta: "需培育产业税源" },
    ],
    tip: {
      pre: "第一回合先",
      hl: "申报特殊再融资债",
      post: "争取置换 8–10 亿存量",
    },
  },
};

// ===== 组件本体 =============================================================
function FateCard({ role = "cfo", variant = "desktop" }) {
  const d = ROLE_DATA[role];
  return (
    <div className={`fate ${variant}`} data-role={role}>
      {/* —— 页头 —— */}
      <header className="fate-head">
        <div className="brand">
          债市生存游戏 <span className="dot">●</span> SURVIVE THE BOND MARKET
        </div>
        <h1>
          <span className="lead"></span>
          命运由你改写
        </h1>
        <div className="seed">
          <b>{d.seedId}</b> · 2022 Q1 — 2024 Q4 · 12 QUARTERS
        </div>
      </header>

      {/* —— 主体 —— */}
      <div className="fate-body">
        {/* 身份卡 */}
        <section className="id-card">
          <div className="id-row">
            <div className="role-badge">
              <span className="glyph"></span>
              <span>{d.badgeEN}</span>
              <span className="sep">·</span>
              <span className="zh">{d.badgeZH}</span>
            </div>
            <div className="seed-mini">
              <b>{d.seedId.split("-")[2]}</b> / DIFFICULTY · 困难
            </div>
          </div>

          <div className="id-name">
            <span className="name">{d.name}</span>
            <span className="quote">{d.nameQuote}</span>
          </div>
          <div className="id-org">
            <span className="label">PLATFORM</span>
            {d.org}
          </div>

          <div className="tags">
            {d.tags.map((t, i) => (
              <span key={i} className={`tag ${t.kind === "k" ? "" : t.kind}`}>
                {t.kind === "k" && <span className="k">{t.k}</span>}
                <span>{t.v}</span>
              </span>
            ))}
          </div>

          <div className="challenges">
            <div className="challenges-head">
              <span className="ax">⨯</span>
              <span>你这局的三大挑战</span>
            </div>
            {d.challenges.map((c, i) => (
              <div key={i} className="challenge-item">
                <span className="num">0{i + 1}</span>
                <span className="rail" aria-hidden="true"></span>
                <span className="text">{c}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Onboarding 卡 */}
        <section className="onboard">
          <div className="onboard-head">
            <span>BRIEFING · 任务简报</span>
            <span className="live">
              <span className="dot"></span>
              <span>LIVE</span>
            </span>
          </div>

          <div className="onboard-grid">
            <div className="onboard-cell">
              <div className="label">
                <span className="icon tgt">▶</span>
                <span>本局目标</span>
              </div>
              <div className="goal-text">
                {d.goal.text}
                <span className="num"> {d.goal.q} </span>
                {d.goal.suffix}
              </div>
            </div>

            <div className="onboard-cell">
              <div className="label">
                <span className="icon tip">!</span>
                <span>推荐首操作</span>
              </div>
              <div className="tip-text">
                {d.tip.pre}
                <span className="hl"> {d.tip.hl} </span>
                {d.tip.post}
              </div>
            </div>

            <div className="onboard-cell full">
              <div className="label">
                <span className="icon rsk">×</span>
                <span>致命风险</span>
              </div>
              <ul className="risks">
                {d.risks.map((r, i) => (
                  <li key={i}>
                    <span className="bullet">▍</span>
                    <span>{r.text}</span>
                    <span className="meta">
                      {r.danger ? <b>{r.meta}</b> : r.meta}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>

      {/* —— CTA —— */}
      <footer className="fate-foot">
        <button className="cta">
          <span>接受命运，开始游戏</span>
          <span className="arrow">→</span>
        </button>
        <div className="cta-sub">
          首次进入 ·
          <a href="#leaderboard">查看全球排行榜</a>
        </div>
      </footer>
    </div>
  );
}

window.FateCard = FateCard;
window.ROLE_DATA = ROLE_DATA;
