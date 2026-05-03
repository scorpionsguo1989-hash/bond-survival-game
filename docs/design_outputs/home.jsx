// 债市生存游戏 — Round 6 Home (Landing)
// 启动门面：单 Hero + 主 CTA。无角色介绍 / 无玩法步骤 / 无战绩。
// 落地参考：cc 直接复用本组件结构。

const { useEffect, useState } = React;

function HomeScreen() {
  // 顶栏右侧的"实时"时间戳（启动序列的味道）
  const [now, setNow] = useState(() => formatStamp(new Date()));
  useEffect(() => {
    const t = setInterval(() => setNow(formatStamp(new Date())), 1000);
    return () => clearInterval(t);
  }, []);

  // 回车启动游戏（DEMO：仅打 console，cc 落地时替换为路由跳转）
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        startGame();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="hm-root" data-role="im">
      {/* —— 顶栏 —— */}
      <header className="hm-top">
        <span className="hm-brand">
          <span className="dot" aria-hidden="true"></span>
          <b>搞债</b>
          <span className="sep">/</span>
          <span>SURVIVE</span>
        </span>
        <span className="hm-time">
          <span>{now.date}</span>
          <span>{now.time}</span>
          <span className="tm-blink" aria-hidden="true"></span>
        </span>
      </header>

      {/* —— 主舞台 —— */}
      <main className="hm-stage">
        <div className="hm-hero">

          {/* meta runner */}
          <div className="hm-meta">
            <span className="bar" aria-hidden="true"></span>
            <span>YEAR 2022 — Q4</span>
            <span className="dim">·</span>
            <b>ALPHA BUILD</b>
            <span className="bar" aria-hidden="true"></span>
          </div>

          {/* 巨型字标 */}
          <div className="hm-mark" aria-label="搞债">
            <span className="gao">搞</span>
            <span className="gap" aria-hidden="true"></span>
            <span className="zhai">债</span>
          </div>

          <div className="hm-mark-sub">
            <span>BOND MARKET</span>
            <span className="glyph" aria-hidden="true">／</span>
            <span>SURVIVAL GAME</span>
          </div>

          {/* 标语 */}
          <h1 className="hm-tag">在 12 季度里活下来</h1>

          {/* 描述 */}
          <p className="hm-blurb">
            你将随机扮演下面三种角色之一：
            <span className="role cfo">城投 CFO</span>{" "}
            <span className="role im">基金经理</span>{" "}
            <span className="role gov">地方官员</span>。
            <br />
            从 <b>2022 Q1</b> 到 <b>2024 Q4</b>，每季度一次决策，共十二步棋。
          </p>

          {/* 角色色彩横线 */}
          <div className="hm-role-rule" aria-hidden="true">
            <i className="cfo"></i>
            <i className="im"></i>
            <i className="gov"></i>
          </div>

          {/* 启动序列日志 */}
          <div className="hm-boot" role="status" aria-live="polite">
            <div className="row">
              <span className="ts">[00:00.12]</span>
              <span className="glyph">✓</span>
              <span className="msg">载入市场数据 · <b>72 期月度面板</b></span>
            </div>
            <div className="row">
              <span className="ts">[00:00.31]</span>
              <span className="glyph">✓</span>
              <span className="msg">同步 <b>城投 / 基金 / 财政</b> 三方资产负债表</span>
            </div>
            <div className="row">
              <span className="ts">[00:00.48]</span>
              <span className="glyph warn">▶</span>
              <span className="msg">命运卡引擎就绪 · 等待玩家入场…</span>
            </div>
          </div>

          {/* 主 CTA */}
          <div className="hm-cta-wrap">
            <a
              className="hm-cta"
              href="#start"
              onClick={(e) => { e.preventDefault(); startGame(); }}
            >
              <span className="play" aria-hidden="true">▶</span>
              <span>开始游戏</span>
              <span className="arrow" aria-hidden="true">→</span>
              <span className="kbd">⏎</span>
            </a>

            {/* 数据条 */}
            <div className="hm-stats">
              <span className="stat"><b>3</b> 角色</span>
              <span className="sep">·</span>
              <span className="stat"><b>12</b> 季度</span>
              <span className="sep">·</span>
              <span className="stat"><b>36</b> 张命运卡</span>
              <span className="sep">·</span>
              <span className="stat gold"><b>S–D</b> 终局评级</span>
            </div>

            {/* 次级动作 */}
            <nav className="hm-sub-actions" aria-label="次级动作">
              <a href="#leaderboard">
                <span className="ic">▤</span>
                <span>排行榜</span>
              </a>
              <a href="#about">
                <span className="ic">⌘</span>
                <span>关于「搞债」公众号</span>
              </a>
            </nav>
          </div>

        </div>
      </main>

      {/* —— 底栏 meta —— */}
      <footer className="hm-bot">
        <span className="hm-bot-l">
          <span>v0.1.0 · ALPHA</span>
          <span className="sep">·</span>
          <span>SEED 2022—2024</span>
        </span>
        <span className="hm-bot-r">
          <span>RNG 4 4 5 6 7</span>
          <span className="sep">·</span>
          <span>CURRENT 4496</span>
          <span className="sep">·</span>
          <span>UPTIME 03:12</span>
        </span>
      </footer>
    </div>
  );
}

function startGame() {
  // 落地时由 cc 替换成路由：navigate('/game/fate')
  // DEMO：仅控制台
  // eslint-disable-next-line no-console
  console.log("[home] start game");
}

function formatStamp(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return {
    date: `${yyyy}.${mm}.${dd}`,
    time: `${hh}:${mi}`,
  };
}

Object.assign(window, { HomeScreen });
