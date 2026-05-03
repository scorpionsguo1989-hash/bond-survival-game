// js/home.js — 游戏首页（启动门面）· Round 6 (Claude Design)
//
// 视觉：终端启动序列 + 巨型金色 "搞债" 字标 + 单一主 CTA + RNG 底栏
// HTML 结构 1:1 对齐 docs/design_outputs/home.jsx，类名前缀 .hm-*
//
// 用法：
//   import { renderHomePage } from './home.js';
//   renderHomePage({ onStart, onLeaderboard, onWeChat });

let _homeCleanup = null;  // 清理上一次首页留下的 setInterval / keydown listener

export function renderHomePage(callbacks) {
  // 离开旧首页（防热重载或回首页时累积监听）
  if (_homeCleanup) { try { _homeCleanup(); } catch (e) {} _homeCleanup = null; }

  const app = document.getElementById('app');
  const stamp0 = formatStamp(new Date());

  app.innerHTML = `
    <div class="hm-root" data-role="im">
      <!-- 顶栏：品牌 + 实时时间 -->
      <header class="hm-top">
        <span class="hm-brand">
          <span class="dot" aria-hidden="true"></span>
          <b>搞债</b>
          <span class="sep">/</span>
          <span>SURVIVE</span>
        </span>
        <span class="hm-time">
          <span data-tm-date>${stamp0.date}</span>
          <span data-tm-time>${stamp0.time}</span>
          <span class="tm-blink" aria-hidden="true"></span>
        </span>
      </header>

      <!-- 主舞台 -->
      <main class="hm-stage">
        <div class="hm-hero">

          <!-- meta runner -->
          <div class="hm-meta">
            <span class="bar" aria-hidden="true"></span>
            <span>YEAR 2022 — Q4</span>
            <span class="dim">·</span>
            <b>ALPHA BUILD</b>
            <span class="bar" aria-hidden="true"></span>
          </div>

          <!-- 巨型字标 -->
          <div class="hm-mark" aria-label="搞债">
            <span class="gao">搞</span>
            <span class="gap" aria-hidden="true"></span>
            <span class="zhai">债</span>
          </div>

          <div class="hm-mark-sub">
            <span>BOND MARKET</span>
            <span class="glyph" aria-hidden="true">／</span>
            <span>SURVIVAL GAME</span>
          </div>

          <!-- 标语 -->
          <h1 class="hm-tag">在 12 季度里活下来</h1>

          <!-- 描述 -->
          <p class="hm-blurb">
            你将随机扮演下面三种角色之一：
            <span class="role cfo">城投 CFO</span>
            <span class="role im">基金经理</span>
            <span class="role gov">地方官员</span>。
            <br>
            从 <b>2022 Q1</b> 到 <b>2024 Q4</b>，每季度一次决策，共十二步棋。
          </p>

          <!-- 三角色色块横线 -->
          <div class="hm-role-rule" aria-hidden="true">
            <i class="cfo"></i>
            <i class="im"></i>
            <i class="gov"></i>
          </div>

          <!-- 启动序列日志 -->
          <div class="hm-boot" role="status" aria-live="polite">
            <div class="row">
              <span class="ts">[00:00.12]</span>
              <span class="glyph">✓</span>
              <span class="msg">载入市场数据 · <b>72 期月度面板</b></span>
            </div>
            <div class="row">
              <span class="ts">[00:00.31]</span>
              <span class="glyph">✓</span>
              <span class="msg">同步 <b>城投 / 基金 / 财政</b> 三方资产负债表</span>
            </div>
            <div class="row">
              <span class="ts">[00:00.48]</span>
              <span class="glyph warn">▶</span>
              <span class="msg">命运卡引擎就绪 · 等待玩家入场…</span>
            </div>
          </div>

          <!-- 主 CTA + stats + 次级动作 -->
          <div class="hm-cta-wrap">
            <a class="hm-cta" href="#start" id="hm-cta-start">
              <span class="play" aria-hidden="true">▶</span>
              <span>开始游戏</span>
              <span class="arrow" aria-hidden="true">→</span>
              <span class="kbd">⏎</span>
            </a>

            <div class="hm-stats">
              <span class="stat"><b>3</b> 角色</span>
              <span class="sep">·</span>
              <span class="stat"><b>12</b> 季度</span>
              <span class="sep">·</span>
              <span class="stat"><b>30</b> 段历史复盘</span>
              <span class="sep">·</span>
              <span class="stat gold"><b>S–D</b> 终局评级</span>
            </div>

            <nav class="hm-sub-actions" aria-label="次级动作">
              <a href="#leaderboard" id="hm-link-leaderboard">
                <span class="ic">▤</span>
                <span>排行榜</span>
              </a>
              <a href="#about" id="hm-link-wechat">
                <span class="ic">⌘</span>
                <span>关于「搞债」公众号</span>
              </a>
            </nav>
          </div>

        </div>
      </main>

      <!-- 底栏 RNG -->
      <footer class="hm-bot">
        <span class="hm-bot-l">
          <span>v1.2 · CONTENT VAULT</span>
          <span class="sep">·</span>
          <span>SEED 2022—2024</span>
        </span>
        <span class="hm-bot-r">
          <span data-rng>RNG ${randomRng()}</span>
          <span class="sep">·</span>
          <span data-current>CURRENT ${randomCurrent()}</span>
          <span class="sep">·</span>
          <span data-uptime>UPTIME 00:00</span>
        </span>
      </footer>
    </div>
  `;

  // ─── 实时时钟（每秒刷新顶栏 + 底栏 uptime）───
  const startedAt = Date.now();
  const tick = () => {
    const now = new Date();
    const s = formatStamp(now);
    const dEl = app.querySelector('[data-tm-date]');
    const tEl = app.querySelector('[data-tm-time]');
    const upEl = app.querySelector('[data-uptime]');
    if (dEl) dEl.textContent = s.date;
    if (tEl) tEl.textContent = s.time;
    if (upEl) {
      const sec = Math.floor((Date.now() - startedAt) / 1000);
      const mm = String(Math.floor(sec / 60)).padStart(2, '0');
      const ss = String(sec % 60).padStart(2, '0');
      upEl.textContent = `UPTIME ${mm}:${ss}`;
    }
  };
  const tickTimer = setInterval(tick, 1000);

  // ─── 事件绑定 ───
  const onCta = (e) => { e.preventDefault(); cleanup(); callbacks?.onStart?.(); };
  const onLb  = (e) => { e.preventDefault(); callbacks?.onLeaderboard?.(); };
  const onWx  = (e) => { e.preventDefault(); (callbacks?.onWeChat || showWeChatHint)(); };
  const onKey = (e) => {
    if (e.target?.tagName === 'INPUT' || e.target?.tagName === 'TEXTAREA') return;
    if (e.key === 'Enter') { e.preventDefault(); document.getElementById('hm-cta-start')?.click(); }
    else if (e.key === 'l' || e.key === 'L') { e.preventDefault(); document.getElementById('hm-link-leaderboard')?.click(); }
  };

  document.getElementById('hm-cta-start')?.addEventListener('click', onCta);
  document.getElementById('hm-link-leaderboard')?.addEventListener('click', onLb);
  document.getElementById('hm-link-wechat')?.addEventListener('click', onWx);
  document.addEventListener('keydown', onKey);

  // ─── 清理函数（CTA 离开 / 重渲染时调用）───
  const cleanup = () => {
    clearInterval(tickTimer);
    document.removeEventListener('keydown', onKey);
  };
  _homeCleanup = cleanup;
}

// ─── 工具 ───────────────────────────────
function formatStamp(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return {
    date: `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}
function randomRng() {
  // 5 个 1-9 数字（看起来像 seed）
  return Array.from({ length: 5 }, () => 1 + Math.floor(Math.random() * 9)).join(' ');
}
function randomCurrent() {
  // 4 位数（伪随机 session counter）
  return Math.floor(1000 + Math.random() * 9000);
}

function showWeChatHint() {
  const existing = document.getElementById('hm-wechat-hint');
  if (existing) { existing.remove(); return; }
  const tip = document.createElement('div');
  tip.id = 'hm-wechat-hint';
  tip.style.cssText = `
    position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
    background: var(--bg-2, #10162a); color: var(--text-1, #e6ebf5);
    border: 1px solid var(--gold, #ffd54f);
    padding: 14px 22px; border-radius: 6px;
    font-family: var(--font-mono, "SF Mono", monospace);
    font-size: 13px; letter-spacing: 0.06em;
    box-shadow: 0 12px 32px rgba(0,0,0,0.4), 0 0 24px rgba(255,213,79,0.15);
    z-index: 99999; max-width: 90vw; text-align: center;
  `;
  tip.innerHTML = `
    微信搜索「<b style="color:var(--gold,#ffd54f)">搞债</b>」公众号
    <br><span style="color:var(--text-3,#5b667f);font-size:11px">游戏内分享卡片含真二维码可扫</span>
  `;
  document.body.appendChild(tip);
  setTimeout(() => { tip.style.transition = 'opacity .3s'; tip.style.opacity = '0'; }, 3500);
  setTimeout(() => tip.remove(), 4000);
}
