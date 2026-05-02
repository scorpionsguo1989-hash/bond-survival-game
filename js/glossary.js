// js/glossary.js — 名词词典：数据 + DOM-aware 标注 + 悬浮卡 + 术语库抽屉
// 设计目标：DCM 同行能秒懂，公众号普通读者也能扫清术语门槛

// ───────────────────────────────────────────────────────────────
// 1. 词条数据
//    field 说明：
//      term      —— 主词（出现在游戏文案里的形态）
//      aliases   —— 同义/别名，命中后都跳到主词
//      category  —— 分类（用于抽屉左侧分组）
//      def       —— 1 行学术定义
//      plain     —— 1 行人话翻译（公众号读者用）
//      scenario  —— 在本游戏里的实际触发与影响
// ───────────────────────────────────────────────────────────────

export const GLOSSARY = [
  // ── 城投生态 ──
  {
    term: '城投债',
    aliases: ['城投平台', '城投'],
    category: '城投生态',
    def: '由地方政府融资平台公司（LGFV）发行的债券，募集资金多用于市政基建、土地整理与公益类项目。',
    plain: '地方政府"另开一家公司"去借钱搞基建，这家公司发的债就是城投债。',
    scenario: '本游戏 CFO 与 GOV 角色的核心融资工具。区域信用恶化、银行收紧时，再融资压力最先体现在这里。',
  },
  {
    term: '隐性债务',
    aliases: ['隐债'],
    category: '城投生态',
    def: '地方政府以企业名义举借、但实际由财政承担偿还责任的债务，不计入显性政府债务口径。',
    plain: '名义上是公司借的，实际是政府兜底——账上看不见，但出问题政府得管。',
    scenario: 'GOV 角色的核心压力源。专项审计、化债任务直接挂钩隐债敞口指标。',
  },
  {
    term: '化债',
    category: '城投生态',
    def: '地方政府通过债务置换、重组、再融资展期、资产盘活等手段降低存量隐性债务规模或成本。',
    plain: '把又贵又短的隐债换成又便宜又长的合规债，少出血、慢慢还。',
    scenario: 'GOV 全程任务。CFO 接到的"债务置换""借新还旧"事件本质都是化债配套动作。',
  },
  {
    term: '综合债务率',
    category: '城投生态',
    def: '地方政府债务余额（含隐债）÷ 综合财力（一般公共预算收入＋政府性基金收入＋上级补助）。',
    plain: '欠的钱是一年财力的几倍——超过 300% 通常被视为高风险。',
    scenario: 'GOV 角色的核心 KPI。本游戏胜利目标之一就是把它压降 50 个百分点。',
  },
  {
    term: '政策性银行',
    category: '城投生态',
    def: '由政府出资设立、不以盈利为目的、为国家政策性目标提供融资的银行（国开行 / 进出口银行 / 农发行）。',
    plain: '国家开的银行，专门给"国家想干的事"放贷——成本低、期限长，但有指标限制。',
    scenario: 'CFO/GOV 在商业银行收紧后常见的"备胎"融资渠道，但额度审批慢、用途严格。',
  },
  {
    term: '转移支付',
    category: '城投生态',
    def: '上级财政将部分财力无偿调拨给下级财政的资金安排，含一般性转移支付和专项转移支付。',
    plain: '中央/省里给市里发的"补贴款"，弱财力地区主要靠这个吃饭。',
    scenario: 'GOV 角色平衡财政缺口的隐藏腾挪空间。"争取上级转移支付"是常见决策选项。',
  },
  {
    term: '专项债',
    category: '城投生态',
    def: '地方政府为特定公益性项目发行的、以项目对应政府性基金或专项收入偿还的债券。',
    plain: '为某个具体项目（修地铁、建学校）专门借的债，不能挪用。',
    scenario: 'GOV 角色的"明枪"工具，额度有限。CFO 也常等专项债资金注入项目缓解缺口。',
  },

  // ── 债务工具 ──
  {
    term: '永续债',
    category: '债务工具',
    def: '没有明确到期日、由发行人决定是否赎回的债券，通常计入权益、票息可递延。',
    plain: '理论上"永远不用还本金"的债，但票息很高，相当于昂贵的股本。',
    scenario: 'CFO 降杠杆的"美容术"——能把债务挪到权益栏，但综合融资成本明显抬升。',
  },
  {
    term: '非标',
    aliases: ['非标融资'],
    category: '债务工具',
    def: '在银行间或交易所标准化债券市场之外的融资工具，常见为信托贷款、委托贷款、定融。',
    plain: '不在公开市场上的"私下借钱"，灵活但贵，监管不喜欢。',
    scenario: '隐债审计高发区。CFO 用非标可以快速回血，但合规分会扣得很狠。',
  },

  // ── 估值与净值 ──
  {
    term: '净值化',
    category: '估值与净值',
    def: '资管产品按持仓债券的市场公允价值实时定价，盈亏每日反映在产品净值里。',
    plain: '理财不再"保本保收益"了——账面随市场涨跌，亏了客户自己承担。',
    scenario: 'IM（基金经理）角色的整个游戏背景：净值跌破阈值就触发赎回踩踏。',
  },
  {
    term: '净值',
    aliases: ['NAV'],
    category: '估值与净值',
    def: 'Net Asset Value，单位资管产品份额对应的资产净值，等于（总资产 − 总负债）÷ 总份额。',
    plain: '一份基金现在值多少钱——跌破 0.85 通常意味着"穿透死亡线"。',
    scenario: 'IM 角色头号 KPI。游戏胜利条件：12 季内 NAV 始终 ≥ 0.85。',
  },
  {
    term: '估值偏离',
    category: '估值与净值',
    def: '债券实际成交价格或第三方估值与买入成本/账面价值之间的差额，反映持仓潜在浮亏。',
    plain: '账上 100 元买的债，市场只给 92 元——那 8 元就是估值偏离。',
    scenario: '城投信用事件后 IM 角色的常见诱因。偏离扩大触发净值波动与赎回连锁。',
  },
  {
    term: '久期',
    aliases: ['Duration'],
    category: '估值与净值',
    def: '衡量债券价格对利率变动敏感度的指标，单位为年；久期越长，利率上行时跌得越多。',
    plain: '组合的"利率风险刻度"——久期 5 年意味着利率涨 1%，组合大致跌 5%。',
    scenario: 'IM 角色的核心可调旋钮。降久期能避开利率风险，但牺牲收益。',
  },

  // ── 流动性 ──
  {
    term: '挤兑',
    aliases: ['赎回压力'],
    category: '流动性',
    def: '客户在短时间内集中要求赎回份额，导致资管产品被迫低价抛售资产、净值进一步下跌的连锁反应。',
    plain: '一群人同时要把钱拿出来，基金经理只能贱卖手里的债，越卖越跌。',
    scenario: 'IM 角色最致命场景。本游戏专门有「赎回压力」面板实时跟踪，红区即危机。',
  },
  {
    term: '流动性缺口',
    category: '流动性',
    def: '到期负债（含赎回、还本、付息）与可动用资金（现金、可变现资产）之间的差额。',
    plain: '下一个时点要付的钱比手里能掏出来的钱多——多多少，就是缺口。',
    scenario: '三个角色都会遇到。CFO 缺口体现在到期债务，IM 在赎回，GOV 在工资/项目支出。',
  },
  {
    term: '期限错配',
    category: '流动性',
    def: '资产平均期限远长于负债平均期限，依赖持续滚动短期负债来支撑长期资产的结构。',
    plain: '"借短钱投长项目"——只要不停有新钱进来就稳，一旦续不上就崩。',
    scenario: '城投平台和银行理财的通病。本游戏融资渠道收紧时，错配越严重死得越快。',
  },
  {
    term: '授信额度',
    aliases: ['信贷额度'],
    category: '流动性',
    def: '银行根据客户资信状况预先核定、可在一定时期内循环使用的最高融资额度。',
    plain: '银行先批一个总盘子，平台想用多少就用多少（不超过盘子）——是关键的"备用粮仓"。',
    scenario: 'CFO 核心指标之一。授信使用率超过 85% 后，新增贷款基本被锁死。',
  },

  // ── 信用风险 ──
  {
    term: '信用利差',
    category: '信用风险',
    def: '同期限信用债收益率与无风险利率（国债）的差，反映市场对该信用主体违约风险的定价。',
    plain: '市场觉得"这家公司比国家更可能不还钱"——多要的那几个点利息，就是信用利差。',
    scenario: 'IM 持仓的高等级 vs 低等级债，信用利差走阔时低评级跌得更多。',
  },
  {
    term: '集中度',
    category: '信用风险',
    def: '单一发行人/单一行业/单一区域持仓占组合净值的比例，是分散化程度的反向指标。',
    plain: '鸡蛋是不是放在一个篮子里——某只券超 22% 就属于过度集中。',
    scenario: 'IM 角色硬约束。集中度过高时，单只券爆雷可能直接打穿净值。',
  },
  {
    term: '杠杆率',
    category: '信用风险',
    def: '债券基金通过质押式回购等方式融入资金加大持仓后，组合总资产与净资产之比。',
    plain: '"借钱炒债"——杠杆 130% 意味着 100 块净值在玩 130 块资产。',
    scenario: 'IM 收益增强工具。资金面收紧时高杠杆组合首当其冲被强制去杠杆。',
  },
  {
    term: '资产负债率',
    category: '信用风险',
    def: '总负债 ÷ 总资产，反映企业全部资产中由债权人提供资金的比例。',
    plain: '公司一半以上的家当都是借来的——这个比例就高了。',
    scenario: 'CFO 角色的"门面指标"。监管对城投公司有 65%–75% 的隐性红线。',
  },

  // ── 监管与红线 ──
  {
    term: '红线',
    category: '监管与红线',
    def: '监管或市场约定俗成的硬性指标阈值，触发后将启动监管介入、产品清盘或市场踩踏。',
    plain: '不能碰的那条线——碰了不是罚款的事，是事情的性质就变了。',
    scenario: '本游戏多个胜负判定点：净值 0.85、债务率 300%、现金 0 都属于红线。',
  },
  {
    term: '窗口指导',
    category: '监管与红线',
    def: '监管机构通过非正式沟通方式向金融机构传达政策意图，要求其调整业务行为的柔性管理工具。',
    plain: '监管打个电话："这事儿你最好别干"——没有正式文件，但谁都不敢硬抗。',
    scenario: '本游戏触发"银行收紧城投贷款"等事件的常见前置剧情。',
  },
];

// ───────────────────────────────────────────────────────────────
// 2. 内部状态 + 索引构建
// ───────────────────────────────────────────────────────────────

let TERM_MAP = null;     // Map<token, primaryTerm>
let TERM_RE = null;      // RegExp 联合匹配
let tipEl = null;
let drawerEl = null;
let hideTimer = null;
let _attached = false;

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escHtml(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function buildIndex() {
  if (TERM_MAP) return;
  TERM_MAP = new Map();
  const tokens = [];
  for (const e of GLOSSARY) {
    tokens.push(e.term);
    TERM_MAP.set(e.term, e.term);
    for (const a of (e.aliases || [])) {
      tokens.push(a);
      if (!TERM_MAP.has(a)) TERM_MAP.set(a, e.term);
    }
  }
  // 长词优先，避免 "城投" 抢在 "城投债" 前面
  tokens.sort((a, b) => b.length - a.length);
  TERM_RE = new RegExp(tokens.map(escapeRegex).join('|'), 'g');
}

function findEntry(term) {
  return GLOSSARY.find(e => e.term === term);
}

// ───────────────────────────────────────────────────────────────
// 3. 标注：DOM-aware，安全地包裹 .gterm，不破坏既有 HTML 结构
//    （能正确处理 highlightEventBody 已经包过的 <span>/<em>）
// ───────────────────────────────────────────────────────────────

export function annotate(html) {
  if (html == null || html === '') return html;
  buildIndex();
  if (!TERM_RE) return html;
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
    // 跳过：已在 .gterm / <a> / <code> 内，避免双重包裹
    let p = n.parentNode;
    let skip = false;
    while (p && p !== root) {
      if (p.classList && p.classList.contains('gterm')) { skip = true; break; }
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
  TERM_RE.lastIndex = 0;
  let m;
  let lastIdx = 0;
  let frag = null;
  while ((m = TERM_RE.exec(text)) !== null) {
    if (!frag) frag = document.createDocumentFragment();
    if (m.index > lastIdx) {
      frag.appendChild(document.createTextNode(text.slice(lastIdx, m.index)));
    }
    const span = document.createElement('span');
    span.className = 'gterm';
    span.setAttribute('data-term', TERM_MAP.get(m[0]));
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

// ───────────────────────────────────────────────────────────────
// 4. Tooltip 控制器（单例）
// ───────────────────────────────────────────────────────────────

function ensureTip() {
  if (tipEl) return tipEl;
  tipEl = document.createElement('div');
  tipEl.className = 'gtip';
  tipEl.innerHTML = `
    <div class="gtip-head">
      <span class="gtip-term"></span>
      <span class="gtip-cat mono"></span>
    </div>
    <div class="gtip-def"></div>
    <div class="gtip-row"><span class="k mono">人话</span><span class="gtip-plain"></span></div>
    <div class="gtip-row"><span class="k mono">本局</span><span class="gtip-scn"></span></div>
    <a class="gtip-more" href="javascript:void(0)">查看完整词条 →</a>
  `;
  document.body.appendChild(tipEl);
  tipEl.addEventListener('mouseenter', () => clearTimeout(hideTimer));
  tipEl.addEventListener('mouseleave', scheduleHide);
  tipEl.querySelector('.gtip-more').addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const term = tipEl.dataset.term;
    hideTip();
    openGlossaryDrawer(term);
  });
  return tipEl;
}

function showTipAt(el) {
  const term = el.getAttribute('data-term');
  const entry = findEntry(term);
  if (!entry) return;
  const tip = ensureTip();
  tip.dataset.term = term;
  tip.querySelector('.gtip-term').textContent = entry.term;
  tip.querySelector('.gtip-cat').textContent = entry.category || '';
  tip.querySelector('.gtip-def').textContent = entry.def;
  tip.querySelector('.gtip-plain').textContent = entry.plain;
  tip.querySelector('.gtip-scn').textContent = entry.scenario;
  tip.classList.add('show');
  // Position after show so we can read offsetWidth/Height
  const r = el.getBoundingClientRect();
  const tipW = tip.offsetWidth;
  const tipH = tip.offsetHeight;
  let left = r.left + (r.width / 2) - (tipW / 2);
  let top = r.bottom + 10;
  // Clamp horizontal
  left = Math.max(8, Math.min(window.innerWidth - tipW - 8, left));
  // Flip up if overflow bottom
  if (top + tipH > window.innerHeight - 8) {
    top = r.top - tipH - 10;
    if (top < 8) top = 8;
  }
  tip.style.left = left + 'px';
  tip.style.top = top + 'px';
}

function scheduleHide() {
  clearTimeout(hideTimer);
  hideTimer = setTimeout(hideTip, 180);
}

function hideTip() {
  if (tipEl) tipEl.classList.remove('show');
}

// ───────────────────────────────────────────────────────────────
// 5. 抽屉：术语库
// ───────────────────────────────────────────────────────────────

const CATEGORY_ORDER = ['城投生态', '债务工具', '估值与净值', '流动性', '信用风险', '监管与红线'];

function ensureDrawer() {
  if (drawerEl) return drawerEl;
  drawerEl = document.createElement('div');
  drawerEl.className = 'gdrawer';
  drawerEl.innerHTML = `
    <div class="gdrawer-mask"></div>
    <aside class="gdrawer-panel" role="dialog" aria-label="术语库">
      <header class="gdrawer-head">
        <div class="gdrawer-title">
          <h3>术语库</h3>
          <span class="gdrawer-count mono"></span>
        </div>
        <button class="gdrawer-close" aria-label="关闭">×</button>
      </header>
      <div class="gdrawer-search">
        <input type="text" placeholder="搜索术语 / 别名 / 定义…" class="gdrawer-input" autocomplete="off">
      </div>
      <div class="gdrawer-list"></div>
    </aside>
  `;
  document.body.appendChild(drawerEl);
  drawerEl.querySelector('.gdrawer-mask').addEventListener('click', closeGlossaryDrawer);
  drawerEl.querySelector('.gdrawer-close').addEventListener('click', closeGlossaryDrawer);
  drawerEl.querySelector('.gdrawer-input').addEventListener('input', (e) => {
    renderDrawerList(e.target.value);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawerEl?.classList.contains('show')) {
      closeGlossaryDrawer();
    }
  });
  return drawerEl;
}

export function openGlossaryDrawer(focusTerm = null) {
  const d = ensureDrawer();
  d.querySelector('.gdrawer-input').value = '';
  renderDrawerList('');
  d.classList.add('show');
  document.body.style.overflow = 'hidden';
  if (focusTerm) {
    requestAnimationFrame(() => {
      const item = d.querySelector(`[data-drawer-term="${cssEscape(focusTerm)}"]`);
      if (item) {
        item.scrollIntoView({ block: 'center', behavior: 'smooth' });
        item.classList.add('flash');
        setTimeout(() => item.classList.remove('flash'), 1600);
      }
    });
  }
}

export function closeGlossaryDrawer() {
  if (drawerEl) drawerEl.classList.remove('show');
  document.body.style.overflow = '';
  hideTip();
}

function cssEscape(s) {
  return String(s).replace(/["\\]/g, '\\$&');
}

function renderDrawerList(query) {
  const list = drawerEl.querySelector('.gdrawer-list');
  const countEl = drawerEl.querySelector('.gdrawer-count');
  const q = (query || '').trim().toLowerCase();
  const filtered = GLOSSARY.filter(e => {
    if (!q) return true;
    if (e.term.toLowerCase().includes(q)) return true;
    if ((e.aliases || []).some(a => a.toLowerCase().includes(q))) return true;
    if (e.def.toLowerCase().includes(q)) return true;
    if (e.plain.toLowerCase().includes(q)) return true;
    return false;
  });
  countEl.textContent = `${filtered.length} / ${GLOSSARY.length}`;
  // Group + sort by CATEGORY_ORDER
  const groups = new Map();
  for (const e of filtered) {
    const cat = e.category || '其他';
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat).push(e);
  }
  const ordered = [];
  for (const cat of CATEGORY_ORDER) {
    if (groups.has(cat)) ordered.push([cat, groups.get(cat)]);
  }
  for (const [cat, items] of groups) {
    if (!CATEGORY_ORDER.includes(cat)) ordered.push([cat, items]);
  }
  if (filtered.length === 0) {
    list.innerHTML = `<div class="gdrawer-empty">没找到「${escHtml(query)}」相关词条</div>`;
    return;
  }
  list.innerHTML = ordered.map(([cat, items]) => `
    <div class="gdrawer-group">
      <div class="gdrawer-cat mono">${escHtml(cat)} · ${items.length}</div>
      ${items.map(e => `
        <article class="gdrawer-item" data-drawer-term="${escHtml(e.term)}">
          <div class="gdrawer-term-head">
            <h4>${escHtml(e.term)}</h4>
            ${(e.aliases || []).length
              ? `<span class="gdrawer-alias">${(e.aliases).map(escHtml).join(' · ')}</span>`
              : ''}
          </div>
          <p class="gdrawer-def">${escHtml(e.def)}</p>
          <div class="gdrawer-row"><b class="mono">人话</b><span>${escHtml(e.plain)}</span></div>
          <div class="gdrawer-row"><b class="mono">本局</b><span>${escHtml(e.scenario)}</span></div>
        </article>
      `).join('')}
    </div>
  `).join('');
}

// ───────────────────────────────────────────────────────────────
// 6. 全局事件监听（幂等，安全多次调用）
// ───────────────────────────────────────────────────────────────

export function attachGlossaryListeners() {
  if (_attached) return;
  _attached = true;

  // 桌面：mouseover/mouseout（用 over/out 而不是 enter/leave，因为后者不冒泡）
  document.addEventListener('mouseover', (e) => {
    const term = e.target.closest?.('.gterm');
    if (!term) return;
    clearTimeout(hideTimer);
    showTipAt(term);
  });
  document.addEventListener('mouseout', (e) => {
    const term = e.target.closest?.('.gterm');
    if (!term) return;
    // related 进入 tip 本身就不藏
    const related = e.relatedTarget;
    if (related && tipEl && tipEl.contains(related)) return;
    scheduleHide();
  });

  // 移动：tap 显示，再 tap 别处隐藏。注意不阻止按钮自身的点击。
  document.addEventListener('click', (e) => {
    const term = e.target.closest?.('.gterm');
    if (term) {
      // 如果在按钮里：让按钮先响应，不显 tip（避免误操作）
      if (term.closest('button, .opt, .action-btn')) return;
      e.stopPropagation();
      showTipAt(term);
      return;
    }
    if (tipEl && tipEl.classList.contains('show') && !tipEl.contains(e.target)) {
      hideTip();
    }
  });

  // 键盘 a11y：聚焦 .gterm 显示，失焦隐藏
  document.addEventListener('focusin', (e) => {
    const term = e.target.closest?.('.gterm');
    if (!term) return;
    showTipAt(term);
  });
  document.addEventListener('focusout', (e) => {
    const term = e.target.closest?.('.gterm');
    if (!term) return;
    scheduleHide();
  });

  // Esc 关 tip
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideTip();
  });
}
