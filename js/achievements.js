// js/achievements.js — 隐藏成就系统
//
// 设计：
//   1. 全部基于 state + finalScore + eventData 推断，不扩展 engine.js
//   2. localStorage 持久化，跨局共享（tri_role / resilience 等）
//   3. 22 个成就分 5 类：milestone / style / drama / event / easter
//   4. hidden=true 的成就在抽屉中显示为「???」直到解锁
//
// 集成：
//   - 终局时 main.js 调 checkAndUnlock(state, finalScore, eventData) → unlockedNew[]
//   - ui.js 收到 unlockedNew 后弹 Toast 并在终局页插「本局成就」区
//   - 状态栏「成就」按钮调 openAchievementsDrawer() 看全部

const STORAGE_KEY = 'bond-game-achievements-v1';

// ─────────────────────────────────────────────
// 1. 22 个成就定义
// ─────────────────────────────────────────────

export const ACHIEVEMENTS = [
  // —— 通关类 ——
  {
    id: 'first_clear',
    name: '初次通关',
    desc: '第一次完成 12 季存活',
    category: 'milestone',
    hidden: false,
    check: ({ state }) => state.survived === true && state.quartersPassed === 12,
  },
  {
    id: 'iron_cfo',
    name: '现金老炮 CFO',
    desc: 'CFO 模式通关，且全程现金从未跌破 3 亿',
    category: 'milestone',
    hidden: false,
    check: ({ state }) => {
      if (state.origin?.role !== 'cfo' || !state.survived) return false;
      const minCash = Math.min(...(state.history || []).map(h => h.cash ?? Infinity));
      return Number.isFinite(minCash) && minCash >= 3;
    },
  },
  {
    id: 'all_star_pm',
    name: '全垒打 PM',
    desc: 'IM 模式通关，终局 NAV ≥ 1.05',
    category: 'milestone',
    hidden: false,
    check: ({ state }) =>
      state.origin?.role === 'im' && state.survived && (state.metrics?.nav || 0) >= 1.05,
  },
  {
    id: 'debt_master',
    name: '化债大师',
    desc: 'GOV 模式通关，且综合债务率压降 50 个百分点以上',
    category: 'milestone',
    hidden: false,
    check: ({ state }) => {
      if (state.origin?.role !== 'gov' || !state.survived) return false;
      const startDR = state.history?.[0]?.debtRatio;
      const endDR = state.metrics?.debtRatio;
      return typeof startDR === 'number' && typeof endDR === 'number' && (startDR - endDR) >= 50;
    },
  },
  {
    id: 'tri_role',
    name: '三栖玩家',
    desc: 'CFO、IM、GOV 三个角色全部通关过',
    category: 'milestone',
    hidden: false,
    check: ({ stats }) => {
      const roles = new Set(stats?.survivedRoles || []);
      return roles.has('cfo') && roles.has('im') && roles.has('gov');
    },
  },

  // —— 风格类 ——
  {
    id: 'conservative',
    name: '保守派之极',
    desc: '通关全程，从未碰过任何不确定性选项',
    category: 'style',
    hidden: false,
    check: ({ state }) => {
      if (!state.survived) return false;
      return (state.eventLog || []).every(l => !l.uncertainOutcome);
    },
  },
  {
    id: 'gambler',
    name: '赌神',
    desc: '一局内不确定性选项连中三次',
    category: 'style',
    hidden: false,
    check: ({ state }) => {
      let chain = 0, max = 0;
      for (const l of (state.eventLog || [])) {
        if (l.uncertainOutcome === 'succeeded') { chain++; max = Math.max(max, chain); }
        else if (l.uncertainOutcome === 'failed') chain = 0;
        // outcome 为 null 不打断链（即没选不确定，链保持）
      }
      return max >= 3;
    },
  },
  {
    id: 'reverse_op',
    name: '逆风局',
    desc: '过半数季度政策环境为紧（≤ -1），仍拿到 80 分以上',
    category: 'style',
    hidden: false,
    check: ({ state, finalScore }) => {
      if (finalScore.total < 80) return false;
      const hist = state.history || [];
      if (hist.length < 6) return false;
      const tightCount = hist.filter(h => (h.policyValue ?? 0) <= -1).length;
      return tightCount > hist.length / 2;
    },
  },
  {
    id: 'ascetic',
    name: '苦行僧',
    desc: '通关 + 合规指数维度分 ≥ 80',
    category: 'style',
    hidden: false,
    check: ({ state, finalScore }) => {
      if (!state.survived) return false;
      const c = pickDim(finalScore.dimensions, '合规');
      return c != null && c >= 80;
    },
  },
  {
    id: 'balance_master',
    name: '六边形战士',
    desc: '通关 + 六维评分极差 ≤ 15',
    category: 'style',
    hidden: false,
    check: ({ state, finalScore }) => {
      if (!state.survived) return false;
      const vals = Object.values(finalScore.dimensions || {});
      if (vals.length < 6) return false;
      return Math.max(...vals) - Math.min(...vals) <= 15;
    },
  },

  // —— 戏剧类 ——
  {
    id: 'close_call',
    name: '千钧一发',
    desc: '通关，且终局核心指标距离死亡线极近',
    category: 'drama',
    hidden: false,
    check: ({ state }) => {
      if (!state.survived) return false;
      const m = state.metrics || {};
      const role = state.origin?.role;
      if (role === 'cfo') return typeof m.cash === 'number' && m.cash <= 1.5;
      if (role === 'im') return typeof m.nav === 'number' && m.nav <= 0.87;
      if (role === 'gov') return typeof m.debtRatio === 'number' && m.debtRatio >= 290;
      return false;
    },
  },
  {
    id: 'hero_failed',
    name: '失败的英雄',
    desc: '没活下来，但综合分仍达到 60 分以上',
    category: 'drama',
    hidden: false,
    check: ({ state, finalScore }) => !state.survived && finalScore.total >= 60,
  },
  {
    id: 'duke_short',
    name: '短命公爵',
    desc: '在前两季度就出局',
    category: 'drama',
    hidden: false,
    check: ({ state }) => !state.survived && (state.quartersPassed || 0) <= 2,
  },
  {
    id: 'cash_dry',
    name: '资金枯竭',
    desc: '因为现金/财政归零而出局',
    category: 'drama',
    hidden: false,
    check: ({ state }) => {
      if (state.survived) return false;
      const r = String(state.deathReason || '');
      return r.includes('现金') || r.includes('财政');
    },
  },
  {
    id: 'valuation_assassin',
    name: '估值刺客',
    desc: 'IM 模式通关，但中途某一季 NAV 单季下跌 5% 以上',
    category: 'drama',
    hidden: false,
    check: ({ state }) => {
      if (state.origin?.role !== 'im' || !state.survived) return false;
      const navHist = (state.history || []).map(h => h.nav).filter(v => typeof v === 'number');
      navHist.push(state.metrics?.nav);  // 加上终局
      for (let i = 1; i < navHist.length; i++) {
        if (typeof navHist[i] === 'number' && typeof navHist[i - 1] === 'number') {
          if (navHist[i - 1] - navHist[i] >= 0.05) return true;
        }
      }
      return false;
    },
  },

  // —— 事件类 ——
  {
    id: 'audit_regular',
    name: '审计常客',
    desc: '终局合规指数维度分 ≤ 30',
    category: 'event',
    hidden: false,
    check: ({ finalScore }) => {
      const c = pickDim(finalScore.dimensions, '合规');
      return c != null && c <= 30;
    },
  },
  {
    id: 'debt_pioneer',
    name: '化债先锋',
    desc: 'GOV 通关，并在化债类事件中至少成功一次（含不确定性选项）',
    category: 'event',
    hidden: false,
    check: ({ state, eventData }) => {
      if (state.origin?.role !== 'gov' || !state.survived) return false;
      const idx = buildEventIndex(eventData);
      for (const log of (state.eventLog || [])) {
        const ev = idx.get(log.eventId);
        if (!ev) continue;
        const title = String(ev.title || '');
        if (!title.includes('化债')) continue;
        // 命中化债事件：要么不是不确定（直接成功），要么 succeeded
        if (log.uncertainOutcome === 'failed') continue;
        return true;
      }
      return false;
    },
  },
  {
    id: 'bank_friend',
    name: '银企老友',
    desc: '一局内连续 3 次或以上选择银行 / 授信 / 协调路线',
    category: 'event',
    hidden: false,
    check: ({ state, eventData }) => {
      const idx = buildEventIndex(eventData);
      let chain = 0, max = 0;
      const KW = ['银行', '授信', '协调', '续贷', '银企'];
      for (const log of (state.eventLog || [])) {
        const ev = idx.get(log.eventId);
        const choice = ev?.roles?.[state.origin?.role]?.choices?.[log.choiceIdx]
                    || ev?.choices?.[log.choiceIdx];
        const label = String(choice?.label || '');
        if (KW.some(k => label.includes(k))) { chain++; max = Math.max(max, chain); }
        else chain = 0;
      }
      return max >= 3;
    },
  },
  {
    id: 'redline_dancer',
    name: '红线舞者',
    desc: '某一季同时触碰 3 项以上红线指标，且当季存活',
    category: 'event',
    hidden: true,
    hint: '同时把多项指标推到悬崖边，但活了下来',
    check: ({ state }) => {
      // 红线判定：cash<2, leverageRatio>=75, nav<0.88, debtRatio>=280, redemptionPressure>=70
      // 任一季度同时触发 ≥3 个 → unlock
      const role = state.origin?.role;
      const all = [...(state.history || [])];
      // history 是回合开始前快照，最后追加终局 metrics
      if (state.metrics) all.push({
        cash: state.metrics.cash,
        leverageRatio: state.metrics.leverageRatio,
        nav: state.metrics.nav,
        debtRatio: state.metrics.debtRatio,
        redemptionPressure: state.metrics.redemptionPressure,
      });
      for (const h of all) {
        let n = 0;
        if (typeof h.cash === 'number' && h.cash < 2) n++;
        if (typeof h.leverageRatio === 'number' && h.leverageRatio >= 75) n++;
        if (typeof h.nav === 'number' && h.nav < 0.88) n++;
        if (typeof h.debtRatio === 'number' && h.debtRatio >= 280) n++;
        if (typeof h.redemptionPressure === 'number' && h.redemptionPressure >= 70) n++;
        if (n >= 3 && state.survived) return true;
      }
      return false;
    },
  },
  {
    id: 'regional_chosen',
    name: '区域天选',
    desc: '财务承压 + 偏远地区起手，仍然通关',
    category: 'event',
    hidden: false,
    check: ({ state }) => {
      if (!state.survived) return false;
      const o = state.origin || {};
      return o.healthLevel === 'weak'
        && (o.regionTier === 'west_prefecture' || o.regionTier === 'northeast_old');
    },
  },

  // —— 彩蛋类 ——
  {
    id: 'perfectionist',
    name: '完美主义',
    desc: '综合得分达到 95 分以上',
    category: 'easter',
    hidden: false,
    check: ({ finalScore }) => finalScore.total >= 95,
  },
  {
    id: 'resilience',
    name: '不破不立',
    desc: '上一局失败，本局通关',
    category: 'easter',
    hidden: true,
    hint: '从失败的灰烬里站起来',
    check: ({ state, stats }) => state.survived && stats?.lastWasFailure === true,
  },
];

// ─────────────────────────────────────────────
// 2. helpers
// ─────────────────────────────────────────────

function pickDim(dims, keyword) {
  if (!dims) return null;
  for (const [k, v] of Object.entries(dims)) {
    if (k.includes(keyword)) return v;
  }
  return null;
}

function buildEventIndex(eventData) {
  const idx = new Map();
  if (!eventData) return idx;
  const all = [
    ...(eventData.main || []),
    ...(eventData.random || []),
  ];
  for (const e of all) {
    if (e?.id) idx.set(e.id, e);
  }
  return idx;
}

// ─────────────────────────────────────────────
// 3. localStorage 持久化
// ─────────────────────────────────────────────

function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultStore();
    const parsed = JSON.parse(raw);
    return { ...defaultStore(), ...parsed };
  } catch (e) {
    console.warn('[achievements] loadStore failed:', e);
    return defaultStore();
  }
}

function saveStore(store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    console.warn('[achievements] saveStore failed:', e);
  }
}

function defaultStore() {
  return {
    unlocked: {},                  // { id: ISO timestamp }
    stats: {
      totalRuns: 0,
      totalSurvived: 0,
      survivedRoles: [],           // ['cfo','im','gov']
      lastWasFailure: false,       // 给 resilience 用
    },
  };
}

export function getUnlockedIds() {
  return Object.keys(loadStore().unlocked);
}

export function getStore() {
  return loadStore();
}

export function resetAllAchievements() {
  saveStore(defaultStore());
}

// ─────────────────────────────────────────────
// 4. 主入口：终局时调用，写存档 + 返回新解锁的成就
// ─────────────────────────────────────────────

export function checkAndUnlock({ state, finalScore, eventData }) {
  const store = loadStore();
  const ctx = {
    state,
    finalScore,
    eventData,
    stats: store.stats,
  };

  const newUnlocked = [];
  for (const ach of ACHIEVEMENTS) {
    if (store.unlocked[ach.id]) continue;
    let pass = false;
    try {
      pass = !!ach.check(ctx);
    } catch (e) {
      console.warn(`[achievements] check ${ach.id} threw:`, e);
    }
    if (pass) {
      store.unlocked[ach.id] = new Date().toISOString();
      newUnlocked.push(ach);
    }
  }

  // 更新 stats
  store.stats.totalRuns = (store.stats.totalRuns || 0) + 1;
  if (state.survived) {
    store.stats.totalSurvived = (store.stats.totalSurvived || 0) + 1;
    const role = state.origin?.role;
    if (role && !store.stats.survivedRoles.includes(role)) {
      store.stats.survivedRoles.push(role);
    }
  }
  store.stats.lastWasFailure = !state.survived;

  saveStore(store);
  return newUnlocked;
}

// ─────────────────────────────────────────────
// 5. UI：解锁 Toast + 全部成就抽屉
// ─────────────────────────────────────────────

const CATEGORY_ORDER = ['milestone', 'style', 'drama', 'event', 'easter'];
const CATEGORY_LABEL = { milestone: '通关', style: '风格', drama: '戏剧', event: '事件', easter: '彩蛋' };

let toastContainer = null;
let drawerEl = null;
let _attached = false;
let _toastQueue = [];
let _toastBusy = false;

function ensureToastContainer() {
  if (toastContainer) return toastContainer;
  toastContainer = document.createElement('div');
  toastContainer.className = 'ach-toast-container';
  document.body.appendChild(toastContainer);
  return toastContainer;
}

function escHtml(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// 队列式弹窗：连续解锁多个成就时一个一个显示
export function showAchievementToasts(achievements) {
  if (!Array.isArray(achievements) || achievements.length === 0) return;
  for (const ach of achievements) _toastQueue.push(ach);
  if (!_toastBusy) processToastQueue();
}

function processToastQueue() {
  if (_toastQueue.length === 0) {
    _toastBusy = false;
    return;
  }
  _toastBusy = true;
  const ach = _toastQueue.shift();
  showOneToast(ach);
  setTimeout(processToastQueue, 600);  // 每个 toast 间隔 600ms 出场
}

function showOneToast(ach) {
  const container = ensureToastContainer();
  const el = document.createElement('div');
  el.className = `ach-toast cat-${ach.category}`;
  el.innerHTML = `
    <div class="ach-toast-icon">◆</div>
    <div class="ach-toast-body">
      <div class="ach-toast-meta mono">成就解锁 · ${escHtml(CATEGORY_LABEL[ach.category] || ach.category)}</div>
      <div class="ach-toast-name">${escHtml(ach.name)}</div>
      <div class="ach-toast-desc">${escHtml(ach.desc)}</div>
    </div>
  `;
  container.appendChild(el);
  // trigger reflow then add .show for transition
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 400);
  }, 4200);
  el.addEventListener('click', () => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 200);
  });
}

// ─────────────────────────────────────────────
// 抽屉：查看全部成就
// ─────────────────────────────────────────────

function ensureDrawer() {
  if (drawerEl) return drawerEl;
  drawerEl = document.createElement('div');
  drawerEl.className = 'ach-drawer';
  drawerEl.innerHTML = `
    <div class="ach-drawer-mask"></div>
    <aside class="ach-drawer-panel" role="dialog" aria-label="成就">
      <header class="ach-drawer-head">
        <div class="ach-drawer-title">
          <h3>成就</h3>
          <span class="ach-drawer-count mono"></span>
        </div>
        <button class="ach-drawer-close" aria-label="关闭">×</button>
      </header>
      <div class="ach-drawer-stats mono"></div>
      <div class="ach-drawer-body"></div>
      <footer class="ach-drawer-foot">
        <button class="ach-reset mono" type="button">清空成就记录</button>
      </footer>
    </aside>
  `;
  document.body.appendChild(drawerEl);
  drawerEl.querySelector('.ach-drawer-mask').addEventListener('click', closeAchievementsDrawer);
  drawerEl.querySelector('.ach-drawer-close').addEventListener('click', closeAchievementsDrawer);
  drawerEl.querySelector('.ach-reset').addEventListener('click', () => {
    if (!confirm('确定清空所有成就记录？这个动作不可撤销。')) return;
    resetAllAchievements();
    renderDrawerContent();
  });
  return drawerEl;
}

export function openAchievementsDrawer(focusId = null) {
  const d = ensureDrawer();
  renderDrawerContent();
  d.classList.add('show');
  document.body.style.overflow = 'hidden';
  if (focusId) {
    requestAnimationFrame(() => {
      const item = d.querySelector(`[data-ach-id="${focusId}"]`);
      if (item) {
        item.scrollIntoView({ block: 'center', behavior: 'smooth' });
        item.classList.add('flash');
        setTimeout(() => item.classList.remove('flash'), 1600);
      }
    });
  }
}

export function closeAchievementsDrawer() {
  if (drawerEl) drawerEl.classList.remove('show');
  document.body.style.overflow = '';
}

function renderDrawerContent() {
  if (!drawerEl) return;
  const { groups, total, unlocked, stats } = getAchievementsForUI();
  drawerEl.querySelector('.ach-drawer-count').textContent = `${unlocked} / ${total}`;
  drawerEl.querySelector('.ach-drawer-stats').innerHTML = `
    总对局 ${stats.totalRuns} · 通关 ${stats.totalSurvived}
    · 三栖 ${(stats.survivedRoles || []).join('/') || '—'}
  `;
  const body = drawerEl.querySelector('.ach-drawer-body');
  body.innerHTML = CATEGORY_ORDER.map(cat => {
    const g = groups[cat];
    if (!g || g.items.length === 0) return '';
    const unlockedInGroup = g.items.filter(a => a.unlocked).length;
    return `
      <section class="ach-group">
        <div class="ach-cat mono">${escHtml(g.label)} · ${unlockedInGroup}/${g.items.length}</div>
        ${g.items.map(a => renderAchItem(a)).join('')}
      </section>
    `;
  }).join('');
}

function renderAchItem(a) {
  const showHidden = a.hidden && !a.unlocked;
  const name = showHidden ? '???' : a.name;
  const desc = showHidden ? (a.hint || '满足某个隐藏条件后揭晓') : a.desc;
  return `
    <article class="ach-item ${a.unlocked ? 'unlocked' : 'locked'} cat-${a.category}" data-ach-id="${escHtml(a.id)}">
      <div class="ach-item-icon">${a.unlocked ? '◆' : '◇'}</div>
      <div class="ach-item-body">
        <div class="ach-item-name">${escHtml(name)}</div>
        <div class="ach-item-desc">${escHtml(desc)}</div>
        ${a.unlocked && a.unlockedAt ? `<div class="ach-item-when mono">${formatWhen(a.unlockedAt)}</div>` : ''}
      </div>
    </article>
  `;
}

function formatWhen(iso) {
  try {
    const d = new Date(iso);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `解锁于 ${yyyy}-${mm}-${dd}`;
  } catch (e) {
    return '';
  }
}

// 全局键盘监听（Esc 关）—— 幂等
export function attachAchievementsListeners() {
  if (_attached) return;
  _attached = true;
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawerEl?.classList.contains('show')) {
      closeAchievementsDrawer();
    }
  });
}

// ─────────────────────────────────────────────
// 6. 数据查询导出
// ─────────────────────────────────────────────

// 获取按分类组织的全部成就（含锁定状态）
export function getAchievementsForUI() {
  const store = loadStore();
  const list = ACHIEVEMENTS.map(ach => ({
    ...ach,
    unlocked: !!store.unlocked[ach.id],
    unlockedAt: store.unlocked[ach.id] || null,
  }));
  // 按分类分组
  const groups = {
    milestone: { label: '通关', items: [] },
    style: { label: '风格', items: [] },
    drama: { label: '戏剧', items: [] },
    event: { label: '事件', items: [] },
    easter: { label: '彩蛋', items: [] },
  };
  for (const ach of list) {
    (groups[ach.category] || (groups.easter)).items.push(ach);
  }
  const total = ACHIEVEMENTS.length;
  const unlocked = list.filter(a => a.unlocked).length;
  return { groups, total, unlocked, stats: store.stats };
}
