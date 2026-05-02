// js/npc-memory.js — NPC 实体 hover：扫文本里 NPC 名字加金色虚下划线，
// hover/tap 显示一张卡（type · region + tags + historic_event）
//
// 设计目标：
//   - 玩家在事件正文/选项里看到"豫北开投控股"四字时，能 hover 知道它的"档案"
//   - 跨事件多次出现的 NPC 形成"记忆"，强化"虚拟债市生态"的代入感
//
// 与 glossary.js 共存：
//   - 同样 DOM-aware 标注，但用不同 class（.gnpc vs .gterm）和 tooltip（.npc-tip vs .gtip）
//   - walkAndAnnotate 跳过 .gterm / .gnpc / button / a / code，避免双层包裹

let NPC_INDEX = null;   // Map<name, entry>
let NPC_BY_ID = null;   // Map<id, entry>
let NPC_BY_TYPE = null; // Map<type, entry[]>，按 type（lgfv/issuer/bank/wealth_mgmt）分组
let NPC_RE = null;      // RegExp
let tipEl = null;
let drawerEl = null;
let _attached = false;
// 当前局的 NPC 互动记录（main.js 在每次 enterMainScreen 时同步）
let _currentEncounters = {};

const TYPE_LABELS = {
  lgfv: '城投平台',
  issuer: '发行人',
  bank: '银行',
  wealth_mgmt: '理财',
};
const REGION_LABELS = {
  east_core: '东部核心',
  central_capital: '中部省会',
  west_prefecture: '西部地级市',
  northeast_old: '东北老工业区',
};
const HEALTH_LABELS = { good: '健康', medium: '一般', weak: '承压' };

// ─────────────────────────────────────────────
// 1. 初始化：从 npcLibrary 构索引 + regex
// ─────────────────────────────────────────────
export function initNpcLibrary(library) {
  if (!library || typeof library !== 'object') return;
  const groups = {
    lgfv: library.platforms || [],
    issuer: library.issuers || [],
    bank: library.banks || [],
    wealth_mgmt: library.wealth_mgmt || [],
  };
  NPC_INDEX = new Map();
  NPC_BY_ID = new Map();
  NPC_BY_TYPE = new Map();
  for (const [type, items] of Object.entries(groups)) {
    NPC_BY_TYPE.set(type, items);
    for (const npc of items) {
      if (!npc?.name) continue;
      NPC_INDEX.set(npc.name, npc);
      NPC_BY_ID.set(npc.id, npc);
    }
  }
  // 长名优先：让 "玄武郡投控" 抢在 "投控" 前面（如果有更短词）
  const names = [...NPC_INDEX.keys()].sort((a, b) => b.length - a.length);
  if (names.length) {
    NPC_RE = new RegExp(names.map(escapeRegex).join('|'), 'g');
  }
  console.log(`[npc-memory] indexed ${NPC_INDEX.size} NPCs`);
}

// main.js 在 enterMainScreen 前调用，把 state.npcEncounters 同步到模块
export function syncNpcEncounters(encounters) {
  _currentEncounters = encounters || {};
}

// 给状态栏按钮显示 N/41 用
export function getNpcMemoryStats() {
  const total = NPC_INDEX?.size || 0;
  const encountered = Object.keys(_currentEncounters).filter(id => _currentEncounters[id]?.count > 0).length;
  return { encountered, total };
}

// ─────────────────────────────────────────────
// 2. 标注：DOM-aware 把名字包成 .gnpc
//    可以套在 annotate(escapeHtml(text)) 之外
// ─────────────────────────────────────────────
export function annotateNpc(html) {
  if (html == null || html === '' || !NPC_RE) return html;
  const wrap = document.createElement('div');
  wrap.innerHTML = String(html);
  walkAndAnnotate(wrap);
  return wrap.innerHTML;
}

function walkAndAnnotate(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  const nodes = [];
  let n;
  while ((n = walker.nextNode())) {
    let p = n.parentNode;
    let skip = false;
    while (p && p !== root) {
      if (p.classList && (p.classList.contains('gnpc') || p.classList.contains('gterm'))) {
        skip = true; break;
      }
      const tag = p.tagName?.toLowerCase();
      if (tag === 'a' || tag === 'code') { skip = true; break; }
      p = p.parentNode;
    }
    if (!skip) nodes.push(n);
  }
  for (const node of nodes) annotateTextNode(node);
}

function annotateTextNode(textNode) {
  const text = textNode.nodeValue;
  if (!text || text.length < 2) return;
  NPC_RE.lastIndex = 0;
  let m, lastIdx = 0, frag = null;
  while ((m = NPC_RE.exec(text)) !== null) {
    if (!frag) frag = document.createDocumentFragment();
    if (m.index > lastIdx) {
      frag.appendChild(document.createTextNode(text.slice(lastIdx, m.index)));
    }
    const span = document.createElement('span');
    span.className = 'gnpc';
    span.setAttribute('data-npc', m[0]);
    span.setAttribute('tabindex', '0');
    span.textContent = m[0];
    frag.appendChild(span);
    lastIdx = m.index + m[0].length;
  }
  if (frag) {
    if (lastIdx < text.length) {
      frag.appendChild(document.createTextNode(text.slice(lastIdx)));
    }
    textNode.parentNode.replaceChild(frag, textNode);
  }
}

// ─────────────────────────────────────────────
// 3. Tooltip
// ─────────────────────────────────────────────
function ensureTip() {
  if (tipEl) return tipEl;
  tipEl = document.createElement('div');
  tipEl.className = 'npc-tip';
  tipEl.innerHTML = `
    <div class="npc-tip-head">
      <span class="npc-tip-name"></span>
      <span class="npc-tip-type mono"></span>
    </div>
    <div class="npc-tip-meta mono"></div>
    <div class="npc-tip-tags"></div>
    <div class="npc-tip-history"></div>
  `;
  document.body.appendChild(tipEl);
  // hover 在 tooltip 上不藏
  tipEl.addEventListener('mouseenter', () => clearTimeout(_hideTimer));
  tipEl.addEventListener('mouseleave', scheduleHide);
  return tipEl;
}

function showTipAt(el) {
  const name = el.getAttribute('data-npc');
  const npc = NPC_INDEX?.get(name);
  if (!npc) return;
  const tip = ensureTip();
  tip.querySelector('.npc-tip-name').textContent = npc.name;
  tip.querySelector('.npc-tip-type').textContent = TYPE_LABELS[npc.type] || npc.type || '';

  // meta：region + health（如果有）
  const metaParts = [];
  if (npc.region && REGION_LABELS[npc.region]) metaParts.push(REGION_LABELS[npc.region]);
  if (npc.health && HEALTH_LABELS[npc.health]) metaParts.push(HEALTH_LABELS[npc.health]);
  tip.querySelector('.npc-tip-meta').textContent = metaParts.join(' · ');
  tip.querySelector('.npc-tip-meta').style.display = metaParts.length ? '' : 'none';

  // tags
  const tags = npc.tags || [];
  tip.querySelector('.npc-tip-tags').innerHTML = tags
    .map(t => `<span class="npc-tag">${escHtml(t)}</span>`)
    .join('');
  tip.querySelector('.npc-tip-tags').style.display = tags.length ? '' : 'none';

  // historic_event
  const histEl = tip.querySelector('.npc-tip-history');
  if (npc.historic_event) {
    histEl.innerHTML = `<span class="npc-history-label mono">历史 · </span>${escHtml(npc.historic_event)}`;
    histEl.style.display = '';
  } else {
    histEl.style.display = 'none';
  }

  // 定位
  tip.classList.add('show');
  const r = el.getBoundingClientRect();
  const tipW = tip.offsetWidth;
  const tipH = tip.offsetHeight;
  let left = r.left + r.width / 2 - tipW / 2;
  let top = r.bottom + 10;
  left = Math.max(8, Math.min(window.innerWidth - tipW - 8, left));
  if (top + tipH > window.innerHeight - 8) {
    top = r.top - tipH - 10;
    if (top < 8) top = 8;
  }
  tip.style.left = left + 'px';
  tip.style.top = top + 'px';
}

let _hideTimer = null;
function scheduleHide() {
  clearTimeout(_hideTimer);
  _hideTimer = setTimeout(hideTip, 200);
}
function hideTip() {
  if (tipEl) tipEl.classList.remove('show');
}

// ─────────────────────────────────────────────
// 4. 全局事件委托（幂等）
// ─────────────────────────────────────────────
export function attachNpcListeners() {
  if (_attached) return;
  _attached = true;

  document.addEventListener('mouseover', (e) => {
    const el = e.target?.closest?.('.gnpc');
    if (!el) return;
    clearTimeout(_hideTimer);
    showTipAt(el);
  });
  document.addEventListener('mouseout', (e) => {
    const el = e.target?.closest?.('.gnpc');
    if (!el) return;
    const related = e.relatedTarget;
    if (related && tipEl && tipEl.contains(related)) return;
    scheduleHide();
  });
  // 移动端 tap
  document.addEventListener('click', (e) => {
    const el = e.target?.closest?.('.gnpc');
    if (el) {
      // 在按钮内不弹 tooltip（避免误操作）
      if (el.closest('button, .opt, .action-btn')) return;
      e.stopPropagation();
      showTipAt(el);
      return;
    }
    if (tipEl && tipEl.classList.contains('show') && !tipEl.contains(e.target)) {
      hideTip();
    }
  });
  // 键盘 a11y
  document.addEventListener('focusin', (e) => {
    const el = e.target?.closest?.('.gnpc');
    if (el) showTipAt(el);
  });
  document.addEventListener('focusout', (e) => {
    const el = e.target?.closest?.('.gnpc');
    if (el) scheduleHide();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideTip();
  });
}

// ─────────────────────────────────────────────
// 工具
// ─────────────────────────────────────────────
function escHtml(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─────────────────────────────────────────────
// 5. NPC 记忆抽屉
//    展示 41 个 NPC（已遇见的高亮 + 显示 count/lastQuarter/最近一次互动）
// ─────────────────────────────────────────────
const TYPE_ORDER = ['lgfv', 'issuer', 'bank', 'wealth_mgmt'];
const TYPE_HEAD = {
  lgfv: '城投平台',
  issuer: '发行人',
  bank: '银行',
  wealth_mgmt: '理财 / 资管',
};

function ensureDrawer() {
  if (drawerEl) return drawerEl;
  drawerEl = document.createElement('div');
  drawerEl.className = 'npc-drawer';
  drawerEl.innerHTML = `
    <div class="npc-drawer-mask"></div>
    <aside class="npc-drawer-panel" role="dialog" aria-label="NPC 记忆">
      <header class="npc-drawer-head">
        <div class="npc-drawer-title">
          <h3>NPC 记忆</h3>
          <span class="npc-drawer-count mono"></span>
        </div>
        <button class="npc-drawer-close" aria-label="关闭" type="button">×</button>
      </header>
      <div class="npc-drawer-stats mono"></div>
      <div class="npc-drawer-body"></div>
    </aside>
  `;
  document.body.appendChild(drawerEl);
  drawerEl.querySelector('.npc-drawer-mask').addEventListener('click', closeNpcDrawer);
  drawerEl.querySelector('.npc-drawer-close').addEventListener('click', closeNpcDrawer);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawerEl?.classList.contains('show')) closeNpcDrawer();
  });
  return drawerEl;
}

export function openNpcDrawer() {
  if (!NPC_BY_TYPE) return;
  const d = ensureDrawer();
  renderDrawerContent();
  d.classList.add('show');
  document.body.style.overflow = 'hidden';
  hideTip();
}

export function closeNpcDrawer() {
  if (drawerEl) drawerEl.classList.remove('show');
  document.body.style.overflow = '';
}

function renderDrawerContent() {
  if (!drawerEl) return;
  const stats = getNpcMemoryStats();
  drawerEl.querySelector('.npc-drawer-count').textContent = `${stats.encountered} / ${stats.total}`;
  // stats 行：分类小计
  const subStats = TYPE_ORDER.map(t => {
    const items = NPC_BY_TYPE.get(t) || [];
    const enc = items.filter(x => _currentEncounters[x.id]?.count > 0).length;
    return `${TYPE_HEAD[t]} ${enc}/${items.length}`;
  }).join(' · ');
  drawerEl.querySelector('.npc-drawer-stats').textContent = subStats;

  const body = drawerEl.querySelector('.npc-drawer-body');
  body.innerHTML = TYPE_ORDER.map(t => {
    const items = NPC_BY_TYPE.get(t) || [];
    if (items.length === 0) return '';
    return `
      <section class="npc-group">
        <div class="npc-cat mono">${escHtml(TYPE_HEAD[t])} · ${items.length}</div>
        ${items.map(npc => renderNpcItem(npc)).join('')}
      </section>
    `;
  }).join('');
}

function renderNpcItem(npc) {
  const enc = _currentEncounters[npc.id];
  const seen = enc && enc.count > 0;
  return `
    <article class="npc-item ${seen ? 'seen' : 'unseen'}">
      <div class="npc-item-head">
        <div class="npc-item-name-wrap">
          <span class="npc-item-name">${escHtml(npc.name)}</span>
          ${seen
            ? `<span class="npc-item-count mono">遇见 ${enc.count} 次</span>`
            : `<span class="npc-item-unseen mono">未遇见</span>`
          }
        </div>
        <span class="npc-item-type mono">
          ${escHtml(TYPE_LABELS[npc.type] || '')}
          ${npc.region ? ' · ' + escHtml(REGION_LABELS[npc.region] || '') : ''}
        </span>
      </div>
      ${seen ? `
        <div class="npc-item-last">
          <span class="npc-item-last-q mono">Q${enc.lastQuarter}</span>
          <span class="npc-item-last-evt">${escHtml(enc.lastEventTitle || '')}</span>
        </div>
        ${enc.lastChoiceLabel ? `<div class="npc-item-last-choice mono">你的选择 · ${escHtml(enc.lastChoiceLabel)}</div>` : ''}
      ` : ''}
      <div class="npc-item-tags">
        ${(npc.tags || []).map(t => `<span class="npc-tag">${escHtml(t)}</span>`).join('')}
      </div>
      ${npc.historic_event ? `<div class="npc-item-history"><span class="npc-history-label mono">历史 · </span>${escHtml(npc.historic_event)}</div>` : ''}
    </article>
  `;
}

// 给测试用
export const _internals = { NPC_INDEX: () => NPC_INDEX, NPC_RE: () => NPC_RE };
