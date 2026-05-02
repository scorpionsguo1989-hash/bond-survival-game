/* eslint-disable */
// Round 4 — Endgame: EndScreen / LeaderboardModal / ShareCard
// 静态形态，用于 design canvas 呈现

const { useMemo: egUseMemo } = React;

const IM_DIMS = ["流动性管理", "收益管理", "信用筛选", "合规指数", "危机应对", "AUM稳定性"];
const CFO_DIMS = ["现金管理", "融资能力", "成本控制", "合规指数", "危机应对", "信用维稳"];
const GOV_DIMS = ["化债进度", "财政健康", "项目执行", "合规指数", "危机应对", "民生评分"];

const GRADE_LABELS = {
  cfo: { S: "城投定海针", A: "稳健舵手", B: "及格财总", C: "勉强续命", D: "暴雷在即" },
  im:  { S: "流动性守夜人", A: "α 收割机", B: "中规中矩", C: "净值警戒线", D: "踩雷出局" },
  gov: { S: "化债铁腕", A: "稳健治理", B: "走一步看一步", C: "压力山大", D: "高风险地区" },
};

const GRADE_QUOTES = {
  S: "在所有人都恐慌时保持冷静，在所有人都贪婪时悄然撤退。",
  A: "稳，是这个市场最稀缺的品质。",
  B: "活下来已经赢过 60% 的同业。",
  C: "不要用脚踝赌命，下一局换条路走。",
  D: "复盘比情绪重要。每个雷都给后人留了路标。",
};

/* ---------- 顶栏 ---------- */
function EgTopBar({ role = "cfo", season = "2024Q4", elapsed = "11:42:03", mobile }) {
  const labels = { cfo: "CFO", im: "IM", gov: "GOV" };
  return (
    <div className="eg-topbar">
      <div className="l">
        <span className="brand">搞债 · <b>{labels[role]}</b> · 终局结算</span>
        {!mobile && <span className="sep">/</span>}
        {!mobile && <span>SAVE-2024-{role.toUpperCase()}-{season}</span>}
      </div>
      <div className="r">
        <span><span className="dot" />SESSION END</span>
        {!mobile && <span className="sep">/</span>}
        {!mobile && <span>耗时 {elapsed}</span>}
      </div>
    </div>
  );
}

/* ---------- Radar SVG ---------- */
function Radar({ scores, labels, role = "cfo", size = 360, mobile }) {
  // scores: 0..100, six values
  const cx = size / 2, cy = size / 2;
  const r = size * 0.30;
  const N = 6;
  const angle = (i) => (Math.PI * 2 * i) / N - Math.PI / 2;
  const point = (i, ratio) => {
    const a = angle(i);
    return [cx + Math.cos(a) * r * ratio, cy + Math.sin(a) * r * ratio];
  };
  const grid = [0.25, 0.5, 0.75, 1].map(ratio =>
    Array.from({ length: N }, (_, i) => point(i, ratio).join(",")).join(" ")
  );
  const dataPath = scores.map((s, i) => point(i, s / 100).join(",")).join(" ");
  const roleColor = role === "cfo" ? "#4fc3f7" : role === "im" ? "#ffd54f" : "#ef5350";
  const labelOffset = mobile ? 1.32 : 1.36;
  const padX = mobile ? 56 : 64;
  return (
    <svg viewBox={`${-padX} 0 ${size + padX * 2} ${size}`} aria-hidden
         preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id={`rg-${role}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={roleColor} stopOpacity="0.32" />
          <stop offset="100%" stopColor={roleColor} stopOpacity="0.06" />
        </radialGradient>
      </defs>
      {/* grid */}
      {grid.map((pts, i) => (
        <polygon key={i} points={pts}
                 fill="none"
                 stroke={i === 3 ? "rgba(120,140,200,0.30)" : "rgba(120,140,200,0.13)"}
                 strokeDasharray={i === 3 ? "0" : "2 3"} />
      ))}
      {/* axes */}
      {Array.from({ length: N }, (_, i) => {
        const [x, y] = point(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y}
                     stroke="rgba(120,140,200,0.16)" strokeDasharray="2 3" />;
      })}
      {/* data fill */}
      <polygon points={dataPath}
               fill={`url(#rg-${role})`}
               stroke={roleColor}
               strokeWidth="1.5"
               style={{ filter: `drop-shadow(0 0 6px ${roleColor}66)` }} />
      {/* dots */}
      {scores.map((s, i) => {
        const [x, y] = point(i, s / 100);
        return <circle key={i} cx={x} cy={y} r="3.2"
                       fill={roleColor}
                       stroke="#0a0e1a" strokeWidth="1.5" />;
      })}
      {/* labels */}
      {labels.map((lab, i) => {
        const [x, y] = point(i, labelOffset);
        const [vx, vy] = point(i, labelOffset - 0.16);
        const anchor = Math.abs(x - cx) < 8 ? "middle" : (x > cx ? "start" : "end");
        return (
          <g key={i}>
            <text x={x} y={y} textAnchor={anchor}
                  dominantBaseline="middle"
                  fontFamily='"PingFang SC", system-ui, sans-serif'
                  fontSize={mobile ? 11 : 12}
                  fill="#98a3bd"
                  letterSpacing="0.04em">{lab}</text>
            <text x={vx} y={vy} textAnchor={anchor}
                  dominantBaseline="middle"
                  fontFamily='"SF Mono", monospace'
                  fontSize={mobile ? 10 : 11}
                  fill={roleColor}
                  letterSpacing="0.04em"
                  fontWeight="600">{scores[i]}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ============================================================
   1) End Screen
============================================================ */
function EndScreen({
  mobile, role = "im", pass = true,
  grade = "S",
  totalScore = 92,
  rank = 5,
  rankOf = 1082,
  platform = "华夏稳健债券基金",
  charName = "周维城",
  survivedQ = 16,
  difficulty = "标准",
  failReason,
  scores,
}) {
  const labels = role === "cfo" ? CFO_DIMS : role === "im" ? IM_DIMS : GOV_DIMS;
  const _scores = scores || (pass
    ? [95, 88, 92, 86, 94, 90]
    : [42, 28, 38, 60, 22, 18]);
  const gradeLabel = GRADE_LABELS[role][grade];
  const quote = GRADE_QUOTES[grade];

  return (
    <div className={`eg-host ${pass ? 'pass' : 'fail'} ${mobile ? 'mobile' : ''}`} data-role={role}>
      <EgTopBar role={role} mobile={mobile} elapsed={pass ? "08:23:11" : "03:14:42"} />
      <div className="endscr">
        {/* 左列 */}
        <div className="col">
          <div className={`es-status ${pass ? 'pass' : 'fail'}`}>
            <span className="badge">{pass ? "✓ 成功通关" : "✕ 中途失败"}</span>
            <span className="reason">
              {pass
                ? <>第 <b>{survivedQ}</b> 季度任期届满 · 无重大违约</>
                : <>第 <b>{survivedQ}</b> 季度 · <em>{failReason || "客户大额赎回，T+1 现金缺口 6.3 亿，被迫清盘"}</em></>}
            </span>
          </div>

          <div className="es-grade-wrap">
            <div className="es-grade">{grade}</div>
            <div className="es-grade-side">
              <span className="es-grade-meta">FINAL GRADE</span>
              <span className="es-grade-label">{gradeLabel}</span>
              <div className="es-grade-quote">{quote}</div>
            </div>
          </div>

          <div className="es-score">
            <div>
              <div style={{fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-3)', letterSpacing:'0.22em', textTransform:'uppercase'}}>总分</div>
              <span className="v">{totalScore}<span className="max">/100</span></span>
            </div>
            <div className="rank">
              <span className="lbl">RANK</span>
              <span className="num">第 {rank} 名</span>
              <span className="of">/ {rankOf.toLocaleString()}</span>
            </div>
          </div>

          <div className="es-meta">
            <div className="cell">
              <span className="k">平台</span>
              <span className="v">{platform}</span>
            </div>
            <div className="cell">
              <span className="k">角色</span>
              <span className="v role">{charName}</span>
            </div>
            <div className="cell">
              <span className="k">存活季度</span>
              <span className="v">{survivedQ} / 16</span>
            </div>
            <div className="cell">
              <span className="k">难度</span>
              <span className="v">{difficulty}</span>
            </div>
          </div>

          <div className="es-ctas">
            <button className="es-cta primary">
              <span className="arr">▶</span> 再来一局 <span className="k">⏎</span>
            </button>
            <button className="es-cta">排行榜 <span className="k">L</span></button>
            <button className="es-cta">生成分享卡片 <span className="k">S</span></button>
          </div>
        </div>

        {/* 右列 */}
        <div className="col es-right">
          <div className="es-section-h">
            <span className="ax">▶ 六维能力评估</span>
            <span className="meta">基于 {survivedQ} 季度行为日志</span>
          </div>
          <div className="es-radar">
            <Radar scores={_scores} labels={labels} role={role}
                   size={mobile ? 320 : 380} mobile={mobile} />
          </div>

          <div className="es-section-h" style={{marginTop: 4}}>
            <span className="ax">▶ 维度评级</span>
            <span className="meta">满分 100</span>
          </div>
          <div className="es-dims">
            {labels.map((name, i) => {
              const v = _scores[i];
              const tier = v >= 85 ? "S" : v >= 70 ? "A" : v >= 55 ? "B" : v >= 40 ? "C" : "D";
              const tone = v < 40 ? "low" : v < 70 ? "mid" : "";
              return (
                <div key={i} className="es-dim">
                  <span className="name">{name}</span>
                  <span className="bar"><span className="fill" style={{width: v + "%"}} /></span>
                  <span className="v">{v}</span>
                  <span className={`g ${tone}`}>{tier}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   2) Leaderboard Modal
============================================================ */
const LB_DATA = [
  { rank: 1, role: "im",  nick: "海纳百川_2024", platform: "嘉实信用债 A",     diff: "地狱", grade: "S", score: 98, q: 16 },
  { rank: 2, role: "cfo", nick: "城投老法师",     platform: "西南某地市投",     diff: "地狱", grade: "S", score: 96, q: 16 },
  { rank: 3, role: "gov", nick: "化债办主任",     platform: "中部地级市",       diff: "地狱", grade: "S", score: 95, q: 16 },
  { rank: 4, role: "im",  nick: "FixedIncome",    platform: "易方达稳健回报",   diff: "标准", grade: "S", score: 93, q: 16 },
  { rank: 5, role: "im",  nick: "周维城",         platform: "华夏稳健债券",     diff: "标准", grade: "S", score: 92, q: 16, me: true },
  { rank: 6, role: "cfo", nick: "财务兽",         platform: "华东某园区平台",   diff: "标准", grade: "A", score: 90, q: 16 },
  { rank: 7, role: "gov", nick: "土地财政2.0",    platform: "东南沿海县级",     diff: "标准", grade: "A", score: 88, q: 16 },
  { rank: 8, role: "im",  nick: "duration",       platform: "南方多元收益",     diff: "标准", grade: "A", score: 87, q: 16 },
  { rank: 9, role: "cfo", nick: "续命大师",       platform: "西北某能源城投",   diff: "标准", grade: "A", score: 85, q: 14 },
  { rank: 10, role: "im", nick: "信评老兵",       platform: "广发信用债",       diff: "标准", grade: "A", score: 84, q: 16 },
  { rank: 11, role: "gov", nick: "GovOp",         platform: "西部地市",         diff: "新手", grade: "A", score: 82, q: 14 },
  { rank: 12, role: "cfo", nick: "短融续作",      platform: "东部产投集团",     diff: "标准", grade: "B", score: 79, q: 12 },
  { rank: 13, role: "im", nick: "alpha_seeker",   platform: "博时纯债",         diff: "标准", grade: "B", score: 77, q: 12 },
  { rank: 14, role: "cfo", nick: "AAA俱乐部",     platform: "省级国资平台",     diff: "新手", grade: "B", score: 75, q: 14 },
  { rank: 15, role: "gov", nick: "财政厅小李",    platform: "中部县级市",       diff: "标准", grade: "B", score: 73, q: 12 },
  { rank: 16, role: "im", nick: "barbell_strat",  platform: "招商产业债",       diff: "标准", grade: "B", score: 71, q: 11 },
  { rank: 17, role: "cfo", nick: "经开区小张",    platform: "东北某经开区",     diff: "新手", grade: "B", score: 68, q: 10 },
  { rank: 18, role: "im", nick: "非银交易员",     platform: "兴全可转债",       diff: "标准", grade: "C", score: 64, q: 9 },
  { rank: 19, role: "gov", nick: "新人区委",      platform: "西南区县",         diff: "新手", grade: "C", score: 60, q: 8 },
  { rank: 20, role: "cfo", nick: "陈总_AA-",      platform: "华南弱区域平台",   diff: "新手", grade: "C", score: 56, q: 7 },
];

function LeaderboardModal({ mobile, activeTab = "all", empty = false }) {
  const tabs = [
    { id: "all", label: "全部",     count: 1082, role: null },
    { id: "cfo", label: "财务总监", count: 312,  role: "cfo" },
    { id: "im",  label: "投资经理", count: 487,  role: "im" },
    { id: "gov", label: "地方官员", count: 283,  role: "gov" },
  ];
  const data = activeTab === "all" ? LB_DATA : LB_DATA.filter(d => d.role === activeTab);
  const roleLabel = { cfo: "财务总监", im: "投资经理", gov: "地方官员" };

  return (
    <div className="lb-host">
      <div className="scrim" />
      <div className={`lb-modal ${mobile ? 'mobile' : ''}`}>
        <div className="lb-rail" />
        <div className="lb-head">
          <div className="lt">
            <span className="lb-tag">LB · TOP-20</span>
            <span className="lb-title">排行榜 · Top 20</span>
            {!mobile && <span className="lb-id">2024-12-31 23:59 · S5 赛季</span>}
          </div>
          <button className="lb-x" aria-label="close">✕</button>
        </div>

        <div className="lb-tabs">
          {tabs.map(t => (
            <button key={t.id}
                    data-role={t.role || ''}
                    className={`lb-tab ${activeTab === t.id ? 'active' : ''}`}>
              {t.label} <span className="ct">{t.count}</span>
            </button>
          ))}
        </div>

        {empty ? (
          <div className="lb-empty">
            <div className="ascii">{`┌──────────────┐
│   ░░░░░░░░░  │
│   ░       ░  │
│   ░  ?    ░  │
│   ░░░░░░░░░  │
└──────────────┘`}</div>
            <div className="msg">暂无记录，等你来创造历史</div>
            <div className="sub">no entries · be the first</div>
            <button className="cta">▶ 立即开始一局</button>
          </div>
        ) : (
          <div className="lb-tablewrap">
            <table className="lb-table">
              <thead>
                <tr>
                  <th className="col-rank">排名</th>
                  <th className="col-role">角色</th>
                  <th className="col-nick">昵称</th>
                  <th className="col-plat">平台</th>
                  <th className="col-diff">难度</th>
                  <th className="col-grade">评级</th>
                  <th className="col-score">总分</th>
                  <th className="col-q">存活</th>
                </tr>
              </thead>
              <tbody>
                {data.map(row => {
                  const rankCls = row.rank === 1 ? "gold" : row.rank === 2 ? "silver" : row.rank === 3 ? "bronze" : "";
                  return (
                    <tr key={row.rank} className={row.me ? "me" : ""}>
                      <td>
                        <span className={`lb-rank-num ${rankCls}`}>
                          {row.rank === 1 ? "★ " : ""}
                          #{row.rank.toString().padStart(2, "0")}
                        </span>
                      </td>
                      <td>
                        <span className="lb-role-chip" data-r={row.role}>
                          <span className="dot" />
                          {roleLabel[row.role]}
                        </span>
                      </td>
                      <td className="col-nick">
                        {row.nick}
                        {row.me && <span className="me-tag">YOU</span>}
                      </td>
                      <td className="col-plat" style={{color:'var(--text-2)'}}>{row.platform}</td>
                      <td style={{color:'var(--text-2)'}}>{row.diff}</td>
                      <td><span className={`lb-grade-cell ${row.grade}`}>{row.grade}</span></td>
                      <td className="col-score">{row.score}</td>
                      <td className="col-q">
                        {row.q}/16
                        {row.q < 16 && <span className="lb-q-status fail">·失</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!empty && (
          <div className="lb-foot">
            <div className="l">
              <span>赛季 <b>S5</b></span>
              <span>·</span>
              <span>共 <b>1,082</b> 条记录</span>
              <span>·</span>
              <span>每周一 00:00 重置</span>
            </div>
            <div className="r">
              <span>你的最佳 <b>#5</b> · 本赛季</span>
              <span style={{color:'var(--gold)'}}>↑</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   3) Share Card — 750 x 1200
============================================================ */
function FakeQR() {
  // 决定性"伪"二维码：不是真的可扫，仅装饰
  const cells = [];
  const N = 21;
  // seeded pattern
  let seed = 9133;
  const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const inFinder = (r < 7 && c < 7) || (r < 7 && c > N-8) || (r > N-8 && c < 7);
      if (inFinder) continue;
      if (rand() > 0.55) cells.push({ r, c });
    }
  }
  const Finder = ({x, y}) => (
    <g transform={`translate(${x},${y})`}>
      <rect width="7" height="7" fill="#000" />
      <rect x="1" y="1" width="5" height="5" fill="#fff" />
      <rect x="2" y="2" width="3" height="3" fill="#000" />
    </g>
  );
  return (
    <svg viewBox="0 0 21 21">
      {cells.map(({r,c}, i) => <rect key={i} x={c} y={r} width="1" height="1" fill="#000" />)}
      <Finder x="0" y="0" />
      <Finder x="14" y="0" />
      <Finder x="0" y="14" />
    </svg>
  );
}

function ShareCard({
  role = "im",
  pass = true,
  grade = "S",
  totalScore = 92,
  platform = "华夏稳健债券基金",
  charName = "周维城",
  survivedQ = 16,
  scores,
}) {
  const labels = role === "cfo" ? CFO_DIMS : role === "im" ? IM_DIMS : GOV_DIMS;
  const _scores = scores || (pass
    ? [95, 88, 92, 86, 94, 90]
    : [42, 28, 38, 60, 22, 18]);
  const gradeLabel = GRADE_LABELS[role][grade];
  const quote = GRADE_QUOTES[grade];
  const subtitleByRole = { cfo: "财务总监模式", im: "投资经理模式", gov: "地方官员模式" };
  const glyphByRole = { cfo: "C", im: "I", gov: "G" };

  return (
    <div className={`sc-host ${pass ? 'pass' : 'fail'}`} data-role={role}>
      <div className="sc-top">
        <div className="sc-brand">
          <div className="sc-logo">
            <span className="glyph">{glyphByRole[role]}</span>
            <span>搞 债</span>
          </div>
          <div className="sc-sub">/ <b>{subtitleByRole[role]}</b> · S5</div>
        </div>
        <div className="sc-stamp">
          {pass
            ? <><span className="pass">PASS</span><br/>2024-12-31 23:59<br/>SAVE-{role.toUpperCase()}-Q{survivedQ}</>
            : <><span className="fail">FAILED</span><br/>2024-12-31 23:59<br/>SAVE-{role.toUpperCase()}-Q{survivedQ}</>}
        </div>
      </div>

      <div className="sc-grade-block">
        <div className="sc-grade">
          <span className="crosshair tl" />
          {grade}
          <span className="crosshair br" />
        </div>
        <div className="sc-grade-info">
          <div className="sc-grade-label">{gradeLabel}</div>
          <div className="sc-grade-quote">{quote}</div>
        </div>
      </div>

      <div className="sc-score">
        <div className="lt">
          <span className="lbl">总分（满分 100）</span>
          <span className="num">{totalScore}<span className="max">/100</span></span>
        </div>
        <div className="rt">
          <span className="sc-pill">
            <span className="role-dot" />
            <span><b>{charName}</b> · {platform}</span>
          </span>
          <span className="sc-pill gold">
            存活 <b>{survivedQ}/16</b> 季度 · {pass ? "通关" : "中途失败"}
          </span>
        </div>
      </div>

      <div className="sc-dims">
        {labels.map((name, i) => {
          const v = _scores[i];
          const tier = v >= 85 ? "S" : v >= 70 ? "A" : v >= 55 ? "B" : v >= 40 ? "C" : "D";
          const tone = v < 40 ? "low" : v < 70 ? "mid" : "";
          return (
            <div key={i} className="sc-dim">
              <div className="row1">
                <span className="name">{name}</span>
                <span className="v">{v}<span className="max">/100</span></span>
              </div>
              <div className="bar"><span className="fill" style={{width: v + "%"}} /></div>
              <div className="row2">
                <span>DIM-{(i+1).toString().padStart(2,"0")}</span>
                <span className={`g ${tone}`}>评级 {tier}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="sc-foot">
        <div className="sc-qr"><FakeQR /></div>
        <div className="sc-watermark">
          <div className="l1">搞债公众号 出品 · <b>BOND·SURVIVE</b></div>
          <div className="l2">长按识别二维码 · 打开游戏</div>
        </div>
        <div className="sc-stamp-box">
          ID · <b>{role.toUpperCase()}-2412-{(totalScore*7+13).toString(16).toUpperCase()}</b><br/>
          S5 · CHINA BOND<br/>
          v1.0.4
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  EndScreen,
  LeaderboardModal,
  ShareCard,
});
