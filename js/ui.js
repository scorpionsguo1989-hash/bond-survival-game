// js/ui.js
import { renderRadarChart } from './charts.js';
import { annotate, openGlossaryDrawer } from './glossary.js';
import { annotateNpc, openNpcDrawer, getNpcMemoryStats } from './npc-memory.js';
import { fetchPeerSignal } from './api.js';
import { showAchievementToasts, openAchievementsDrawer, getAchievementsForUI } from './achievements.js';
import { getScript, getCurrentAct } from './scripts.js';
import { getGoalById } from './goals.js';
import { STARTER_KIT_LABELS } from './starterKits.js';

// AI 决策助手限额（与 engine.js 的 COACHING_MAX_PER_GAME 保持一致）
const COACH_MAX = 3;

const REGION_LABELS = {
  east_core: '东部核心', central_capital: '中部省会',
  west_prefecture: '西部地级市', northeast_old: '东北老工业区'
};
const HEALTH_LABELS = { good: '财务健康', medium: '财务一般', weak: '财务承压' };
const ROLE_LABELS = { cfo: '财务总监', im: '投资经理', gov: '地方官员' };
const ROLE_CODES = { cfo: 'CFO', im: 'PM', gov: 'GOV' };
const ROLE_ACCENTS = { cfo: '#4fc3f7', im: '#ffd54f', gov: '#ef5350' };

export function renderFateCard(origin, role, onAccept, scriptId = null, goalId = null) {
  const app = document.getElementById('app');
  const roleId = origin.role || 'cfo';
  const d = getFateData(origin, role, goalId, scriptId);
  const script = scriptId ? getScript(scriptId) : null;
  // Mobile 自动检测：< 720px 加 .mobile class（按设计稿的 .fate.mobile 规则）
  const variant = (typeof window !== 'undefined' && window.innerWidth < 720) ? 'mobile' : 'desktop';

  // Markup 严格对齐 fate-card.jsx
  app.innerHTML = `
    <div class="screen active">
      <div class="fate ${variant}" data-role="${roleId}">
        <header class="fate-head">
          <div class="brand">
            债市生存游戏 <span class="dot">●</span> SURVIVE THE BOND MARKET
          </div>
          <h1>
            <span class="lead"></span>
            命运由你改写
          </h1>
          <div class="seed">
            <b>${escapeHtml(d.seedId)}</b> · ${d.year} Q${d.quarter} — 2024 Q4 · 12 QUARTERS
          </div>
        </header>
        <div class="fate-body">
          <section class="id-card">
            <div class="id-row">
              <div class="role-badge">
                <span class="glyph"></span>
                <span>${escapeHtml(d.badgeEN)}</span>
                <span class="sep">·</span>
                <span class="zh">${escapeHtml(d.badgeZH)}</span>
              </div>
              <div class="seed-mini">
                <b>${escapeHtml(d.seedShort)}</b> / DIFFICULTY · ${escapeHtml(d.difficulty)}
              </div>
            </div>
            <div class="id-name">
              <span class="name">${escapeHtml(d.name)}</span>
              <span class="quote">${escapeHtml(d.nameQuote)}</span>
            </div>
            <div class="id-org">
              <span class="label">PLATFORM</span>
              ${escapeHtml(d.org)}
            </div>
            <div class="tags">
              ${d.tags.map(t => `
                <span class="tag ${t.kind === 'k' ? '' : t.kind}">
                  ${t.kind === 'k' ? `<span class="k">${escapeHtml(t.k)}</span>` : ''}
                  <span>${escapeHtml(t.v)}</span>
                </span>
              `).join('')}
            </div>
            <div class="challenges">
              <div class="challenges-head">
                <span class="ax">⨯</span>
                <span>你这局的三大挑战</span>
              </div>
              ${d.challenges.slice(0, 3).map((c, i) => `
                <div class="challenge-item">
                  <span class="num">0${i + 1}</span>
                  <span class="rail" aria-hidden="true"></span>
                  <span class="text">${escapeHtml(c)}</span>
                </div>
              `).join('')}
            </div>
          </section>
          ${script ? renderFateScriptBanner(script) : ''}
          <section class="onboard">
            <div class="onboard-head">
              <span>BRIEFING · 任务简报</span>
              <span class="live">
                <span class="dot"></span>
                <span>LIVE</span>
              </span>
            </div>
            <div class="onboard-grid">
              <div class="onboard-cell">
                <div class="label">
                  <span class="icon tgt">▶</span>
                  <span>本局目标</span>
                </div>
                <div class="goal-text">
                  ${escapeHtml(d.goal.text)}
                  <span class="num"> ${escapeHtml(String(d.goal.q))} </span>
                  ${escapeHtml(d.goal.suffix)}
                </div>
              </div>
              <div class="onboard-cell">
                <div class="label">
                  <span class="icon tip">!</span>
                  <span>推荐首操作</span>
                </div>
                <div class="tip-text">
                  ${escapeHtml(d.tip.pre)}
                  <span class="hl"> ${escapeHtml(d.tip.hl)} </span>
                  ${escapeHtml(d.tip.post)}
                </div>
              </div>
              <div class="onboard-cell full">
                <div class="label">
                  <span class="icon rsk">×</span>
                  <span>致命风险</span>
                </div>
                <ul class="risks">
                  ${d.risks.map(r => `
                    <li>
                      <span class="bullet">▍</span>
                      <span>${escapeHtml(r.text)}</span>
                      <span class="meta">
                        ${r.danger ? `<b>${escapeHtml(r.meta)}</b>` : escapeHtml(r.meta)}
                      </span>
                    </li>
                  `).join('')}
                </ul>
              </div>
            </div>
          </section>
        </div>
        <footer class="fate-foot">
          <button class="cta" id="btn-accept-fate">
            <span>改写命运，开始游戏</span>
            <span class="arrow">→</span>
          </button>
          <div class="cta-sub">
            首次进入 ·
            <a id="link-fate-leaderboard">查看全球排行榜</a>
          </div>
        </footer>
      </div>
    </div>
  `;
  document.getElementById('btn-accept-fate').addEventListener('click', onAccept);
}

// 进入新幕时的过场卡：1.8 秒淡入淡出 + 一句话剧情
// 多次连续调用会排队（避免覆盖）
let _actTransitionQueue = [];
let _actTransitionBusy = false;

export function showActTransition(act, script) {
  if (!act) return;
  _actTransitionQueue.push({ act, script });
  if (!_actTransitionBusy) processActTransitionQueue();
}

function processActTransitionQueue() {
  if (_actTransitionQueue.length === 0) {
    _actTransitionBusy = false;
    return;
  }
  _actTransitionBusy = true;
  const { act, script } = _actTransitionQueue.shift();
  showOneActTransition(act, script, () => {
    setTimeout(processActTransitionQueue, 200);
  });
}

function showOneActTransition(act, script, done) {
  const overlay = document.createElement('div');
  overlay.className = 'act-transition';
  if (script?.id) overlay.dataset.scriptId = script.id;
  overlay.innerHTML = `
    <div class="act-transition-card">
      <div class="act-trans-meta mono">${escapeHtml(script?.name || '本局剧本')}</div>
      <div class="act-trans-ord mono">${escapeHtml(act.ordinal)}</div>
      <div class="act-trans-label">${escapeHtml(act.label)}</div>
      <div class="act-trans-tag">${escapeHtml(act.tagline)}</div>
      <div class="act-trans-line">${escapeHtml(act.transitionLine || '')}</div>
      <div class="act-trans-q mono">Q${act.quarters[0]} – Q${act.quarters[act.quarters.length - 1]}</div>
    </div>
  `;
  document.body.appendChild(overlay);
  // trigger reflow then add .show for transition
  requestAnimationFrame(() => overlay.classList.add('show'));
  // 总持续时间 2200ms：250ms 淡入 + 1700ms 停留 + 250ms 淡出
  setTimeout(() => {
    overlay.classList.remove('show');
    setTimeout(() => {
      overlay.remove();
      done && done();
    }, 280);
  }, 1950);
  // 点击直接跳过
  overlay.addEventListener('click', () => {
    overlay.classList.remove('show');
    setTimeout(() => { overlay.remove(); done && done(); }, 200);
  });
}

function renderFateScriptBanner(script) {
  return `
    <section class="script-banner" data-script-id="${escapeHtml(script.id)}">
      <div class="script-head">
        <span class="script-icon">${escapeHtml(script.icon || '◆')}</span>
        <div class="script-meta">
          <span class="script-tag mono">本局剧本</span>
          <span class="script-name">${escapeHtml(script.name)}</span>
        </div>
        <span class="script-marker mono">3 ACTS · 12 QUARTERS</span>
      </div>
      <div class="script-desc">${escapeHtml(script.description)}</div>
      <div class="script-acts">
        ${script.acts.map((a, i) => `
          <div class="script-act script-act-${i}">
            <div class="script-act-head">
              <span class="script-act-ord mono">${escapeHtml(a.ordinal)}</span>
              <span class="script-act-q mono">Q${a.quarters[0]}-Q${a.quarters[a.quarters.length-1]}</span>
            </div>
            <div class="script-act-label">${escapeHtml(a.label)}</div>
            <div class="script-act-tag">${escapeHtml(a.tagline)}</div>
          </div>
          ${i < script.acts.length - 1 ? '<span class="script-act-sep" aria-hidden="true">→</span>' : ''}
        `).join('')}
      </div>
    </section>
  `;
}

// 把 origin/role 转成 fate-card 渲染所需的统一数据结构
function getFateData(origin, role, goalId = null, scriptId = null) {
  const roleId = origin.role || 'cfo';
  // C 改造：getOnboardingHints 现在接受 scriptId（向后兼容，老 role 可忽略第二参数）
  const hints = role?.getOnboardingHints ? role.getOnboardingHints(origin, scriptId) : null;
  const seedHash = hashString(origin.platformName || 'seed').toString(16).toUpperCase().padStart(4, '0').slice(-4);
  const year = 2022; // 起始年
  const quarter = 1;
  const seedId = `SEED-${year}-${seedHash}`;

  // 难度（基于 challengeScore）
  const cs = origin.challengeScore || 18;
  let difficulty = '中等';
  if (cs >= 24) difficulty = '困难';
  else if (cs >= 20) difficulty = '挑战';
  else if (cs <= 16) difficulty = '入门';

  // 角色徽章 EN/ZH
  const badge = {
    cfo: { en: 'CFO', zh: '城投财务总监' },
    im:  { en: 'PM',  zh: '债券基金经理' },
    gov: { en: 'GOV', zh: '地方政府官员' },
  }[roleId] || { en: 'CFO', zh: '城投财务总监' };

  // codename quote（从 directorName 拼花名格式）
  const nameQuote = `// codename · ${origin.directorName || ''}`;

  // 4 个 tag（按 origin 字段挑选 + 标记 kind）
  const tags = buildFateTags(origin);

  // goal: { text, q, suffix } —— 优先用 state.goalId 反查的本局目标，老存档/未配走 buildGoal fallback
  const goal = buildGoal(roleId, origin, goalId);

  // tip: { pre, hl, post } 拆分 firstActionHint
  const tip = buildTip(hints?.firstActionHint || '观察主线事件');

  // risks: [{text, meta, danger}] 把 topRisks 拆成 text + meta
  const risks = buildRisks(hints?.topRisks || []);

  // challenges
  const challenges = origin.challenges && origin.challenges.length
    ? origin.challenges
    : (hints?.topRisks || []);

  return {
    badgeEN: badge.en,
    badgeZH: badge.zh,
    name: origin.directorName || '匿名',
    nameQuote,
    org: origin.platformName || '未命名机构',
    seedId,
    seedShort: seedHash,
    difficulty,
    year,
    quarter,
    tags,
    challenges,
    goal,
    risks,
    tip,
  };
}

function buildFateTags(origin) {
  const roleId = origin.role || 'cfo';
  const labels = origin.labels || {};
  const tags = [];
  // D 改造：起手包标签置首（"起手 · 化债攻坚型" 这种最显眼），复用 'k' 样式
  if (origin.starterKit) {
    const kitLabel = STARTER_KIT_LABELS[origin.starterKit];
    if (kitLabel) tags.push({ kind: 'k', k: '起手', v: kitLabel });
  }
  if (roleId === 'cfo') {
    if (labels.region)   tags.push({ kind: 'k', k: '区域', v: labels.region });
    if (labels.business) tags.push({ kind: 'k', k: '业务', v: labels.business });
    if (labels.health)   tags.push({ kind: 'warn', v: labels.health });
    if (labels.tag)      tags.push({ kind: 'danger', v: labels.tag });
  } else if (roleId === 'im') {
    if (labels.inst)   tags.push({ kind: 'k', k: '机构', v: labels.inst });
    if (labels.scale)  tags.push({ kind: 'k', k: '规模', v: labels.scale });
    if (labels.health) tags.push({ kind: 'warn', v: labels.health });
    if (labels.tag)    tags.push({ kind: 'danger', v: labels.tag });
  } else if (roleId === 'gov') {
    if (labels.tier)      tags.push({ kind: 'k', k: '层级', v: labels.tier });
    if (labels.fiscal)    tags.push({ kind: 'k', k: '财政', v: labels.fiscal });
    if (labels.political) tags.push({ kind: 'warn', v: labels.political });
    if (labels.tag)       tags.push({ kind: 'danger', v: labels.tag });
  }
  return tags.slice(0, 5);  // D 改造：从 4 → 5，给起手包腾位
}

function buildGoal(roleId, origin, goalId = null) {
  // 1) 优先反查 state.goalId（本局开局抽到的多样化目标）
  if (goalId) {
    const g = getGoalById(goalId);
    if (g) return { text: g.text, q: g.q, suffix: g.suffix };
  }
  // 2) Fallback：老存档/未配 → 硬编码"存活/守住/压降"基础目标
  if (roleId === 'cfo') return { text: '存活', q: 12, suffix: '季度，期末现金不归零' };
  if (roleId === 'im')  return { text: '守住', q: 0.85, suffix: '净值，12 季度不破清盘线' };
  if (roleId === 'gov') return { text: '压降', q: 50, suffix: '个百分点债务率，并完成化债任务' };
  return { text: '存活', q: 12, suffix: '季度' };
}

function buildTip(hint) {
  // 去掉时间前缀（"第一回合先""第一季度就""第一季先""第一周"等），整句作 hl
  // 正则覆盖：
  //   - 时间词：季度|季|回合|周内|周（"季"独立成词，避免"第一季就"漏匹配）
  //   - 修饰词：先|就|即|便（"就"很常见，必须覆盖）
  //   - 都是 optional，能匹配最长前缀（贪婪默认）
  const cleaned = String(hint || '观察主线事件')
    .replace(/^(第一(?:季度|季|回合|周内|周)?(?:就|先|即|便)?\s*)/, '')
    .trim();
  return { pre: '', hl: cleaned, post: '' };
}

function buildRisks(topRisks) {
  // 用户反馈：旧逻辑用逗号拆 text/meta 会把"Q5-Q7 是债务到期高峰，提前备款很重要"
  // 这种连贯句切成割裂的两半。
  // 修复：只保留明确的"现象 → 后果"箭头拆分；逗号一律不拆，整句作为 text。
  return topRisks.slice(0, 3).map((r, i) => {
    let text = r, meta = '', danger = i === 0;
    const arrow = r.match(/^(.+?)\s*→\s*(.+)$/);
    if (arrow) {
      text = arrow[1].trim();
      meta = '→ ' + arrow[2].trim();
    }
    return { text, meta, danger };
  });
}

export function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ============================================================
// 主界面（严格对齐 main-ui.jsx，使用 main-ui.css）
// ============================================================

export function renderMainScreen(state, callbacks) {
  const app = document.getElementById('app');
  const roleId = state.role?.id || state.origin?.role || 'cfo';
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 720;
  const showAlert = roleId === 'im' && (state.metrics?.redemptionPressure || 0) >= 70;
  app.innerHTML = `
    <div class="screen active">
      <div class="ui ${isMobile ? 'mobile' : ''}" data-role="${roleId}">
        ${renderUITopbar(state)}
        ${showAlert ? renderAlertBanner(state) : ''}
        <div class="main">
          ${renderLeftCol(state)}
          ${renderCenterCol(state, callbacks)}
          ${renderRightCol(state)}
        </div>
        ${renderUIStatusbar(state)}
      </div>
    </div>
  `;
  bindMainScreenEvents(state, callbacks);
}

function renderUITopbar(state) {
  const roleId = state.role?.id || 'cfo';
  const short = ROLE_CODES[roleId] || 'CFO';
  const name = state.role?.name || ROLE_LABELS[roleId] || '城投财务总监';
  const quarter = `${state.year} Q${state.quarter}`;
  const policyValue = state.policyValue || 0;
  const policyPct = ((policyValue + 5) / 10) * 100;
  const policyLabel = policyLabelClean(policyValue);
  const labels = ["严格","偏紧","中性","偏松","宽松"];
  const totalActions = 6;
  const actionsLeft = Math.max(0, totalActions - (state.actionsUsed || 0));
  // 多周期叙事：当前幕徽章
  const act = getCurrentAct(state);
  const script = state.scriptId ? getScript(state.scriptId) : null;
  const actBadge = (act && script)
    ? `<span class="tb-act mono" data-script="${escapeHtml(script.id)}" data-act="${escapeHtml(act.id)}" title="${escapeHtml(script.name)} · ${escapeHtml(act.tagline)}">${escapeHtml(act.ordinal)} · ${escapeHtml(act.label)}</span>`
    : '';
  return `
    <div class="topbar">
      <div class="tb-left">
        <span class="tb-role-dot"></span>
        <span class="tb-role-name mono">${escapeHtml(short)} · ${escapeHtml(name)}</span>
        <span class="tb-sep"></span>
        <span class="tb-game-name">债市生存</span>
        <span class="tb-quarter mono">${escapeHtml(quarter)} · <b>第 ${state.quartersPassed + 1}/12 回合</b></span>
        ${actBadge}
      </div>
      <div class="policy-axis">
        <div class="policy-axis-head">
          <span>政策环境</span>
          <span class="now">当前 · <b>${escapeHtml(policyLabel)}</b> · ${policyValue >= 0 ? '+' : ''}${policyValue}</span>
        </div>
        <div class="policy-track">
          <div class="policy-ticks">${'<span></span>'.repeat(11)}</div>
          <div class="policy-thumb" style="left:${policyPct}%"></div>
        </div>
        <div class="policy-labels">
          ${labels.map(l => `<span class="${l === policyLabel ? 'active' : ''}">${l}</span>`).join('')}
        </div>
      </div>
      <div class="tb-right">
        <span class="actions-left">
          <span class="num">${actionsLeft}</span>
          <span style="color:var(--text-3)">/${totalActions}</span>
          <span class="lbl">本季 · 剩余操作</span>
        </span>
        <button class="tb-icon-btn" title="日志">≡</button>
      </div>
    </div>
  `;
}

function policyLabelClean(value) {
  if (value <= -3) return '严格';
  if (value <= -1) return '偏紧';
  if (value === 0) return '中性';
  if (value <= 2) return '偏松';
  return '宽松';
}

function renderAlertBanner(state) {
  const m = state.metrics;
  const pressure = Math.round(m.redemptionPressure);
  const expected = getExpectedRedeem(m);
  const cash = getCashAvail(m);
  const gap = expected - cash;
  return `
    <div class="alert-banner">
      <span class="ico">!</span>
      <span class="tag mono">REDEEM-${pressure}</span>
      <span class="msg">赎回压力 <b>${pressure}</b>（红区）— 下周一预计净赎回 <b>${expected.toFixed(1)} 亿</b>，现金 ${cash.toFixed(1)} 亿，<b>缺口 ${Math.max(0, gap).toFixed(1)} 亿</b>。建议：T+1 前抛 AA- 或申报置换。</span>
      <span class="meta">T+0 14:08 · 渠道渗透率 92%</span>
    </div>
  `;
}

function renderLeftCol(state) {
  const roleId = state.role?.id;
  const metrics = buildUIMetrics(state);
  return `
    <div class="col col-l">
      <div class="panel">
        <div class="panel-head">
          <span><span class="ax">●</span> 我的指标</span>
          <span class="meta">${metrics.length} items</span>
        </div>
        <div class="metric-grid cols-2">
          ${metrics.map(m => renderUIMetric(m)).join('')}
        </div>
      </div>
      ${roleId === 'im' ? renderRedeemPanel(state) : ''}
      ${renderUIGoalCard(state)}
    </div>
  `;
}

function renderUIMetric(m) {
  const cls = ['metric', m.lvl].filter(Boolean).join(' ');
  return `
    <div class="${cls}">
      <span class="k">${annotate(escapeHtml(m.k))}</span>
      <span class="v">${escapeHtml(String(m.v))}${m.unit ? `<span class="unit">${escapeHtml(m.unit)}</span>` : ''}</span>
      ${m.delta ? `<span class="delta ${m.deltaCls || ''}">${escapeHtml(m.delta)}</span>` : ''}
      ${m.barPct != null ? `<div class="bar"><i style="width:${m.barPct}%"></i></div>` : ''}
    </div>
  `;
}

function buildUIMetrics(state) {
  const roleId = state.role?.id;
  const m = state.metrics || {};
  if (roleId === 'cfo') {
    const due = m.debtMaturity?.[state.quartersPassed] || 0;
    return [
      { k: '现金 (亿)', v: m.cash.toFixed(1), delta: getDeltaStr(state, 'cash'), deltaCls: getDeltaCls(state, 'cash', false), lvl: m.cash < 2 ? 'danger' : (m.cash < 5 ? 'warn' : 'ok'), barPct: Math.min(100, m.cash * 10) },
      { k: '本季到期 (亿)', v: due.toFixed(1), lvl: due > m.cash ? 'danger' : 'warn', barPct: Math.min(100, due * 10) },
      { k: '资产负债率', v: m.leverageRatio.toFixed(1), unit: '%', delta: getDeltaStr(state, 'leverageRatio'), deltaCls: getDeltaCls(state, 'leverageRatio', true), lvl: m.leverageRatio >= 75 ? 'danger' : (m.leverageRatio >= 65 ? 'warn' : 'ok'), barPct: m.leverageRatio },
      { k: '授信使用率', v: Math.round(m.creditUsage), unit: '%', lvl: m.creditUsage >= 85 ? 'danger' : (m.creditUsage >= 70 ? 'warn' : 'ok'), barPct: m.creditUsage },
      { k: '综合融资成本', v: m.financingCost.toFixed(2), unit: '%', delta: getDeltaStr(state, 'financingCost'), deltaCls: getDeltaCls(state, 'financingCost', true), lvl: m.financingCost >= 7 ? 'danger' : (m.financingCost >= 6 ? 'warn' : 'ok'), barPct: Math.min(100, m.financingCost * 10) },
      { k: '可抵押物', v: collLabel(m.collateralRoom), lvl: m.collateralRoom === 'low' ? 'danger' : (m.collateralRoom === 'medium' ? 'warn' : 'ok') },
      { k: '项目缺口 (亿)', v: m.projectGap.toFixed(1), lvl: 'danger' },
    ];
  }
  if (roleId === 'im') {
    return [
      { k: '净值 (NAV)', v: m.nav.toFixed(3), delta: getDeltaStr(state, 'nav'), deltaCls: getDeltaCls(state, 'nav', false), lvl: m.nav < 0.88 ? 'danger' : (m.nav < 0.95 ? 'warn' : 'ok'), barPct: Math.max(0, Math.min(100, (m.nav - 0.85) * 500)) },
      { k: '组合久期', v: m.duration.toFixed(1), unit: 'Y' },
      { k: 'AA 及以下', v: m.creditExposure.toFixed(0), unit: '%', lvl: m.creditExposure > 40 ? 'danger' : (m.creditExposure > 25 ? 'warn' : 'ok'), barPct: m.creditExposure },
      { k: '持仓集中度', v: m.concentration.toFixed(1), unit: '%', lvl: m.concentration > 22 ? 'danger' : (m.concentration > 18 ? 'warn' : 'ok'), barPct: Math.min(100, m.concentration * 4) },
      { k: '杠杆率', v: m.leverage.toFixed(0), unit: '%', lvl: m.leverage > 130 ? 'danger' : (m.leverage > 115 ? 'warn' : 'ok'), barPct: Math.min(100, (m.leverage - 80) * 1.6) },
      { k: '流动性 (亿)', v: getCashAvail(m).toFixed(1), lvl: m.cashRatio < 5 ? 'danger' : (m.cashRatio < 10 ? 'warn' : 'ok') },
    ];
  }
  if (roleId === 'gov') {
    return [
      { k: '财政现金 (亿)', v: m.cash.toFixed(1), lvl: m.cash < 1 ? 'danger' : (m.cash < 3 ? 'warn' : 'ok'), barPct: Math.min(100, m.cash * 4) },
      { k: '综合债务率', v: m.debtRatio.toFixed(0), unit: '%', lvl: m.debtRatio > 280 ? 'danger' : (m.debtRatio > 250 ? 'warn' : 'ok'), barPct: Math.min(100, (m.debtRatio - 150) / 1.5) },
      { k: '隐债敞口 (亿)', v: m.hiddenDebtRisk.toFixed(0), lvl: m.hiddenDebtRisk > 150 ? 'danger' : (m.hiddenDebtRisk > 100 ? 'warn' : 'ok'), barPct: Math.min(100, m.hiddenDebtRisk / 2) },
      { k: '政绩评分', v: Math.round(m.politicalScore), unit: '/100', lvl: m.politicalScore < 30 ? 'danger' : (m.politicalScore < 45 ? 'warn' : 'ok'), barPct: m.politicalScore },
      { k: '专项债额度 (亿)', v: m.specialBondQuota.toFixed(0), lvl: m.specialBondQuota < 5 ? 'warn' : 'ok' },
      { k: '产业指数', v: m.industryIndex.toFixed(2), lvl: m.industryIndex < 30 ? 'warn' : 'ok' },
      { k: '财政收入 (亿)', v: (m.fiscalRevenue / 4).toFixed(1), lvl: 'warn' },
    ];
  }
  return [];
}

function getDeltaStr(state, key) {
  const t = getTrend(state, key);
  if (!t) return null;
  const sign = t.delta > 0 ? '+' : '';
  const v = Math.abs(t.delta) >= 1 ? t.delta.toFixed(1) : t.delta.toFixed(2);
  return sign + v;
}

function getDeltaCls(state, key, lowerIsBetter) {
  const t = getTrend(state, key);
  if (!t) return null;
  const isGood = lowerIsBetter ? t.delta < 0 : t.delta > 0;
  return isGood ? 'up' : 'down';
}

function renderRedeemPanel(state) {
  const m = state.metrics;
  const level = Math.round(m.redemptionPressure);
  const expected = getExpectedRedeem(m);
  const cash = getCashAvail(m);
  const gap = Math.max(0, expected - cash);
  return `
    <div class="panel">
      <div class="panel-head">
        <span><span class="ax" style="color:var(--danger)">!</span> 赎回压力</span>
        <span class="meta">live</span>
      </div>
      ${renderRedeemCard({ level, expected: expected.toFixed(1), cash: cash.toFixed(1), gap: gap.toFixed(1) })}
    </div>
  `;
}

function renderRedeemCard(r) {
  const lvl = r.level;
  let cls = 'lvl-green';
  if (lvl >= 70) cls = 'lvl-red';
  else if (lvl >= 50) cls = 'lvl-orange';
  else if (lvl >= 30) cls = 'lvl-yellow';
  const danger = lvl >= 70;
  return `
    <div class="redeem ${danger ? 'danger' : ''}">
      <div class="redeem-head">
        <span><span class="ax">⨯</span> 赎回压力</span>
        <span class="stat">vs 上季 <b class="up">+24</b></span>
      </div>
      <div class="redeem-num">
        <span class="big">${lvl}</span>
        <span class="unit">/ 100</span>
        <span class="delta">${danger ? '红区 · 触发预警' : (lvl >= 50 ? '橙区 · 可控' : '中性')}</span>
      </div>
      <div class="redeem-bar ${cls}">
        <i style="width:${lvl}%"></i>
      </div>
      <div class="redeem-marks">
        <span style="left:15%">30</span>
        <span style="left:50%">50</span>
        <span style="left:70%">70</span>
      </div>
      <div class="redeem-grid">
        <div class="cell">
          <span class="k">下季预期赎回</span>
          <span class="v">${r.expected} 亿</span>
        </div>
        <div class="cell">
          <span class="k">当前现金</span>
          <span class="v">${r.cash} 亿</span>
        </div>
        <div class="cell gap">
          <span class="k">缺口</span>
          <span class="v">−${r.gap} 亿</span>
        </div>
      </div>
    </div>
  `;
}

function renderUIGoalCard(state) {
  const g = buildGoalData(state);
  return `
    <div class="goal">
      <div class="goal-head">
        <span><span class="ax">◇</span> 本局目标</span>
        <span class="meta">GOAL</span>
      </div>
      <div class="goal-title">${escapeHtml(g.title)}</div>
      <div class="goal-sub">${escapeHtml(g.sub)}</div>
      <div class="goal-bars">
        ${g.bars.map(b => `
          <div class="goal-bar lvl-${b.lvl}">
            <div class="row">
              <span class="k">${escapeHtml(b.k)}</span>
              <span class="v mono">${escapeHtml(b.v)}</span>
            </div>
            <div class="track"><i style="width:${b.pct}%"></i></div>
            ${b.note ? `<span class="note">${escapeHtml(b.note)}</span>` : ''}
          </div>
        `).join('')}
      </div>
      <div class="goal-rank">
        <div class="row">
          <span class="k">全球排名</span>
          <span class="v mono">#${g.rank.you} / ${g.rank.total}</span>
        </div>
        <div class="track"><i style="width:${g.rank.pct}%"></i></div>
        <span class="note">前 ${g.rank.pct}% · 击败 ${100 - g.rank.pct}%</span>
      </div>
    </div>
  `;
}

function buildGoalData(state) {
  const roleId = state.role?.id;
  const m = state.metrics || {};
  const passed = state.quartersPassed || 0;
  const passedPct = (passed / 12) * 100;

  if (roleId === 'cfo') {
    return {
      title: '存活 12 季',
      sub: '且期末现金 ≥ 0',
      bars: [
        { k: '已存活回合', v: `${passed} / 12`, pct: passedPct, lvl: 'ok' },
        { k: '现金底线', v: `${m.cash.toFixed(1)} / 0 亿`, pct: Math.min(100, m.cash * 10), lvl: m.cash < 2 ? 'danger' : (m.cash < 5 ? 'warn' : 'ok'), note: `距底线 +${m.cash.toFixed(1)}` },
        { k: '未触发违约', v: state.survived ? '0 次' : '1 次', pct: state.survived ? 100 : 0, lvl: state.survived ? 'ok' : 'danger' },
      ],
      rank: { you: 1284, total: 8420, pct: 15 },
    };
  }
  if (roleId === 'im') {
    return {
      title: '净值守 0.85',
      sub: '12 季不破死亡线',
      bars: [
        { k: '已存活回合', v: `${passed} / 12`, pct: passedPct, lvl: 'ok' },
        { k: 'NAV 缓冲', v: `${m.nav.toFixed(3)} / 0.85`, pct: Math.max(0, Math.min(100, (m.nav - 0.85) * 500)), lvl: m.nav < 0.88 ? 'danger' : (m.nav < 0.95 ? 'warn' : 'ok'), note: `缓冲 +${(m.nav - 0.85).toFixed(3)}` },
        { k: '未触发清盘', v: state.survived ? '0 次' : '1 次', pct: state.survived ? 100 : 0, lvl: state.survived ? 'ok' : 'danger' },
      ],
      rank: { you: 642, total: 5180, pct: 12 },
    };
  }
  if (roleId === 'gov') {
    return {
      title: '压降 50pp 债务率',
      sub: '至 236% 以下',
      bars: [
        { k: '已存活回合', v: `${passed} / 12`, pct: passedPct, lvl: 'ok' },
        { k: '化债进度', v: `${m.debtRatio.toFixed(0)}%`, pct: Math.max(0, Math.min(100, (300 - m.debtRatio) / 1.5)), lvl: m.debtRatio > 280 ? 'danger' : (m.debtRatio > 250 ? 'warn' : 'ok'), note: '红线 300%' },
        { k: '政绩评分', v: `${Math.round(m.politicalScore)} / 60`, pct: m.politicalScore, lvl: m.politicalScore < 30 ? 'danger' : (m.politicalScore < 45 ? 'warn' : 'ok') },
      ],
      rank: { you: 1820, total: 6240, pct: 29 },
    };
  }
  return { title: '存活 12 季', sub: '', bars: [], rank: { you: 0, total: 0, pct: 0 } };
}

function renderCenterCol(state, callbacks) {
  return `
    <div class="col col-c">
      ${renderUIEvent(state)}
      ${renderUIActionsBar(state, callbacks)}
      <div class="center-bot">
        ${renderImpactPanel(state)}
        ${renderUIDecisionLog(state)}
      </div>
    </div>
  `;
}

function renderUIEvent(state) {
  const ev = state.pendingEvent;
  if (!ev) return `
    <div class="event">
      <div class="event-head">
        <div class="event-meta">
          <span class="id mono">IDLE</span>
          <span class="sev mid">空闲</span>
        </div>
        <span class="event-time">T+0</span>
      </div>
      <div class="event-title">本回合无主线事件</div>
      <div class="event-body">你可以使用主动操作或直接结束本季度。</div>
    </div>
  `;
  const eventCode = getEventCode(ev.id);
  const sevInfo = getSevInfo(state, ev);
  const lastLog = state.eventLog?.[state.eventLog.length - 1];
  const logText = lastLog
    ? `${getEventCode(lastLog.eventId)} 通过：选 ${String.fromCharCode(65 + (lastLog.choiceIdx || 0))} · ${lastLog.uncertainOutcome === 'failed' ? '失败' : '成功'}`
    : '暂无历史决策记录';
  const timeStr = state.role?.id === 'im' ? '14:08' : (state.role?.id === 'gov' ? '10:00' : '09:32');

  const isSwan = ev.kind === 'black_swan';
  const sourceLabel = isSwan
    ? `黑天鹅 · ${escapeHtml(ev.swanTag || '重大事件')}`
    : `来源 · ${ev.id?.startsWith('main_') ? '主线' : '市场'}`;

  return `
    <div class="event ${isSwan ? 'is-swan' : ''}">
      ${isSwan ? '<div class="swan-stripe" aria-hidden="true"></div>' : ''}
      <div class="event-head">
        <div class="event-meta">
          <span class="id mono">${escapeHtml(eventCode)}</span>
          <span class="sev ${isSwan ? 'swan' : sevInfo.cls}">${isSwan ? '⚡ 黑天鹅' : escapeHtml(sevInfo.label)}</span>
          <span class="src">${sourceLabel}</span>
        </div>
        <span class="event-time">T+0 · ${timeStr}</span>
      </div>
      <div class="event-title">${annotateNpc(annotate(escapeHtml(ev.title)))}</div>
      <div class="event-body">${annotateNpc(annotate(highlightEventBody(ev.body)))}</div>
      <div class="event-options" data-event-id="${escapeHtml(ev.id || '')}" data-role="${escapeHtml(state.role?.id || '')}">
        ${ev.choices.map((c, i) => `
          <button class="opt" data-choice-idx="${i}">
            <div class="opt-head">
              <span class="opt-key mono">${String.fromCharCode(65 + i)} ▸</span>
              <span class="opt-cost">${escapeHtml(getChoiceBusinessMeta(c, state.role))}</span>
            </div>
            <div class="opt-title">${annotateNpc(annotate(escapeHtml(c.label)))}</div>
            <div class="opt-foot">
              <span class="pred-label">PREDICTED · 预计</span>
              <span class="pred-text">${renderUIChoicePred(c, state.role)}</span>
            </div>
            <div class="opt-peer" data-peer-slot="${i}">
              <span class="peer-loading mono">PEER · 加载中…</span>
            </div>
          </button>
        `).join('')}
      </div>
      ${renderCoachBar(state)}
      <div class="event-log">
        <span class="ax">⟶ LOG</span>
        <span>${escapeHtml(logText)}</span>
        <span class="more">查看全部 ›</span>
      </div>
    </div>
  `;
}

function getSevInfo(state, ev) {
  const policyShift = ev.policyShift || 0;
  const m = state.metrics || {};
  let danger = false;
  if (policyShift <= -2) danger = true;
  if (state.role?.id === 'im' && (m.redemptionPressure || 0) >= 65) danger = true;
  if (state.role?.id === 'cfo' && m.cash < 2) danger = true;
  if (state.role?.id === 'gov' && m.debtRatio > 280) danger = true;
  if (danger) return { label: '高危', cls: 'high' };
  return { label: ev.id?.startsWith('main_') ? '主线' : '市场', cls: 'mid' };
}

function renderUIChoicePred(choice, role) {
  const fx = choice.effects || {};
  const parts = [];
  const labels = role?.metricLabels || {};
  const dimLabels = role?.dimensionLabels || {};
  for (const [k, v] of Object.entries(fx)) {
    if (k.startsWith('_') || typeof v !== 'number') continue;
    let lbl;
    if (k.startsWith('score.')) {
      const dim = k.slice(6);
      // 兜底链：role 维度标签 → EFFECT_LABEL_MAP → 原 key
      lbl = dimLabels[dim] || EFFECT_LABEL_MAP[dim] || dim;
    } else {
      // 兜底链：role 指标标签 → EFFECT_LABEL_MAP（覆盖 creditUsed 等 role 未声明但 effect 用到的 key）→ 原 key
      lbl = labels[k] || EFFECT_LABEL_MAP[k] || k;
    }
    const sign = v > 0 ? '+' : '';
    const cls = v > 0 ? 'pos' : 'neg';
    parts.push(`${escapeHtml(lbl)} <b class="${cls}">${sign}${v}</b>`);
  }
  return parts.length ? parts.slice(0, 3).join('，') : '影响待定';
}

function renderUIActionsBar(state, callbacks) {
  const actions = callbacks?.actions || state.role?.actions || [];
  const actionsLeft = Math.max(0, 2 - (state.actionsUsed || 0));
  return `
    <div class="actions-bar">
      <div class="actions-bar-head">
        <span><span class="ax">▸</span> 主动操作 · 可选加行动作</span>
        <span class="meta">${actionsLeft}/2 剩余 · 不消耗事件回合</span>
      </div>
      <div class="actions-grid">
        ${actions.map((a, i) => {
          const avail = callbacks?.isAvailable ? callbacks.isAvailable(a.id) : { available: true };
          const locked = !avail.available;
          return `
            <button class="action-btn compact ${locked ? 'locked' : ''}" data-action-id="${a.id}" ${locked ? 'disabled' : ''}>
              <span class="tag mono">A${i + 1}</span>
              <span class="label">
                ${escapeHtml(a.name)}
                <span class="desc">${escapeHtml(a.desc || (locked && avail.reason ? avail.reason : ''))}</span>
              </span>
              <span class="kbd">${i + 1}</span>
            </button>
          `;
        }).join('')}
        <button id="btn-end-turn" class="action-btn compact end-turn">
          <span class="tag mono">END</span>
          <span class="label">结束本季度<span class="desc">→ 下一回合</span></span>
        </button>
      </div>
    </div>
  `;
}

function renderImpactPanel(state) {
  const rows = buildImpactRows(state);
  return `
    <div class="impact">
      <div class="impact-head">
        <span><span class="ax">⟶</span> 不行动 · 季末预演</span>
        <span class="meta">PROJECTED · 仅供参考</span>
      </div>
      <div class="impact-rows">
        ${rows.map(r => `
          <div class="impact-row ${r.danger ? 'danger' : ''}">
            <span class="k">${escapeHtml(r.k)}</span>
            <span class="from mono">${escapeHtml(r.from)}</span>
            <span class="arrow mono">→</span>
            <span class="to mono ${r.dir}">${escapeHtml(r.to)}</span>
            <span class="note">${escapeHtml(r.note || '')}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function buildImpactRows(state) {
  const roleId = state.role?.id;
  const m = state.metrics || {};
  if (roleId === 'cfo') {
    const cash = m.cash || 0;
    const due = m.debtMaturity?.[state.quartersPassed] || 0;
    const proj = cash - due - (m.opCostRate || 0) - (m.projectGap || 0) + 2.5;
    return [
      { k: '现金', from: `${cash.toFixed(1)} 亿`, to: `${proj.toFixed(1)} 亿`, dir: 'down', danger: proj < 1, note: due > cash ? 'T+5 还款日' : '正常运营' },
      { k: '授信使用率', from: `${Math.round(m.creditUsage)}%`, to: `${Math.round(m.creditUsage * 1.05)}%`, dir: 'down', danger: m.creditUsage > 85, note: m.creditUsage > 90 ? '逼近 100% 红线' : '尚有余地' },
      { k: '本季利润', from: `+${(2.5 - (m.opCostRate || 0) - (m.projectGap || 0)).toFixed(1)} 亿`, to: `${(2.5 - (m.opCostRate || 0) - (m.projectGap || 0) - due * 0.1).toFixed(1)} 亿`, dir: 'down', danger: false, note: '首次转亏' },
    ];
  }
  if (roleId === 'im') {
    const nav = m.nav || 1;
    const projNav = nav * 0.97;
    return [
      { k: '净值 NAV', from: nav.toFixed(3), to: projNav.toFixed(3), dir: 'down', danger: projNav < 0.9, note: `距死亡线 +${(projNav - 0.85).toFixed(2)}` },
      { k: '流动性资产', from: `${getCashAvail(m).toFixed(1)} 亿`, to: `${(getCashAvail(m) - getExpectedRedeem(m)).toFixed(1)} 亿`, dir: 'down', danger: m.cashRatio < 5, note: getExpectedRedeem(m) > getCashAvail(m) ? `缺口 ${(getExpectedRedeem(m) - getCashAvail(m)).toFixed(1)}` : '可覆盖' },
      { k: 'AA- 占比', from: `${Math.round(m.creditExposure * 0.4)}%`, to: `${Math.round(m.creditExposure * 0.4 + 4)}%`, dir: 'down', danger: false, note: '被动抬升' },
    ];
  }
  if (roleId === 'gov') {
    const debt = m.debtRatio || 250;
    return [
      { k: '综合债务率', from: `${debt.toFixed(0)}%`, to: `${(debt + 12).toFixed(0)}%`, dir: 'down', danger: debt > 280, note: debt + 12 > 295 ? '逼近 300% 红线' : '空间收窄' },
      { k: '财政现金', from: `${(m.cash || 0).toFixed(1)} 亿`, to: `${((m.cash || 0) * 0.65).toFixed(1)} 亿`, dir: 'down', danger: false, note: '工资刚性支出' },
      { k: '政绩评分', from: `${Math.round(m.politicalScore || 60)}`, to: `${Math.round((m.politicalScore || 60) - 4)}`, dir: 'down', danger: false, note: 'Q3 考核窗口' },
    ];
  }
  return [];
}

function renderUIDecisionLog(state) {
  const log = state.eventLog || [];
  const items = log.length > 0 ? log.slice(-3).reverse().map((entry) => {
    const code = getEventCode(entry.eventId || '');
    const choiceLetter = String.fromCharCode(65 + (entry.choiceIdx || 0));
    const outcome = entry.uncertainOutcome === 'failed' ? '失败' : (entry.uncertainOutcome === 'succeeded' ? '成功' : '通过');
    return { q: `Q${state.quartersPassed}`, text: `${code} · 选 ${choiceLetter} · ${outcome}`, impact: '—' };
  }) : [];
  return `
    <div class="declog">
      <div class="declog-head">
        <span><span class="ax">▾</span> 决策日志</span>
        <span class="meta">${items.length} 条 · 本局</span>
      </div>
      <div class="declog-rows">
        ${items.length === 0
          ? '<div class="declog-empty">暂无决策记录，做出第一个选择后这里会留痕。</div>'
          : items.map(it => `
            <div class="declog-row mono">
              <span class="q">${escapeHtml(it.q)}</span>
              <span class="t">${escapeHtml(it.text)}</span>
              <span class="im">${escapeHtml(it.impact)}</span>
            </div>
          `).join('')
        }
      </div>
    </div>
  `;
}

function renderRightCol(state) {
  const roleId = state.role?.id;
  let charts = '';
  if (roleId === 'cfo') {
    const total = sumDebt(state.metrics.debtMaturity, state.quartersPassed, 4);
    charts = `
      <div class="chart-panel size-md">
        <div class="chart-head">
          <span>债务到期瀑布</span>
          <span class="v">未来 4 季 · 合计 <b>${total.toFixed(1)}</b> 亿</span>
        </div>
        <div class="chart-body"><canvas id="chart-debt"></canvas></div>
        <div class="chart-foot">
          <span class="legend"><i style="background:var(--danger)"></i>到期</span>
          <span class="legend"><i style="background:var(--info)"></i>现金</span>
        </div>
      </div>
      <div class="chart-panel size-md">
        <div class="chart-head">
          <span>现金趋势</span>
          <span class="v">近 6 季 · 当前 <b>${state.metrics.cash.toFixed(1)}</b> 亿</span>
        </div>
        <div class="chart-body"><canvas id="chart-cash"></canvas></div>
        <div class="chart-foot">
          <span class="legend"><i style="background:var(--info)"></i>现金</span>
          <span class="legend"><i style="background:var(--danger)"></i>止血线</span>
        </div>
      </div>
    `;
  } else if (roleId === 'im') {
    charts = `
      <div class="chart-panel size-md">
        <div class="chart-head">
          <span>净值曲线</span>
          <span class="v">近 12 周 · 当前 <b>${state.metrics.nav.toFixed(3)}</b></span>
        </div>
        <div class="chart-body"><canvas id="chart-nav"></canvas></div>
        <div class="chart-foot">
          <span class="legend"><i style="background:var(--gold)"></i>NAV</span>
          <span class="legend"><i style="background:var(--danger)"></i>死亡线</span>
        </div>
      </div>
      <div class="chart-panel size-tall">
        <div class="chart-head">
          <span>持仓评级</span>
          <span class="v">AA 及以下 <b>${state.metrics.creditExposure.toFixed(0)}%</b></span>
        </div>
        <div class="chart-body"><canvas id="chart-holdings"></canvas></div>
        <div class="chart-foot">
          <span class="legend"><i style="background:var(--ok)"></i>AA+ 及以上</span>
          <span class="legend"><i style="background:var(--warn)"></i>AA</span>
          <span class="legend"><i style="background:var(--danger)"></i>AA- 及以下</span>
        </div>
      </div>
    `;
  } else if (roleId === 'gov') {
    charts = `
      <div class="chart-panel size-md">
        <div class="chart-head">
          <span>财政收支</span>
          <span class="v">本季差额 <b>${(state.metrics.cash - 4).toFixed(1)}</b> 亿</span>
        </div>
        <div class="chart-body"><canvas id="chart-fiscal"></canvas></div>
        <div class="chart-foot">
          <span class="legend"><i style="background:var(--ok)"></i>收入</span>
          <span class="legend"><i style="background:var(--danger)"></i>支出</span>
        </div>
      </div>
      <div class="chart-panel size-md">
        <div class="chart-head">
          <span>综合债务率</span>
          <span class="v">当前 <b>${state.metrics.debtRatio.toFixed(0)}%</b> · 红线 300%</span>
        </div>
        <div class="chart-body"><canvas id="chart-debt-ratio"></canvas></div>
        <div class="chart-foot">
          <span class="legend"><i style="background:var(--danger)"></i>债务率</span>
          <span class="legend"><i style="background:var(--danger)"></i>红线</span>
        </div>
      </div>
    `;
  }
  return `
    <div class="col col-r">
      ${charts}
      ${renderPulseCard(state)}
    </div>
  `;
}

function renderPulseCard(state) {
  const roleId = state.role?.id;
  const policy = state.policyValue || 0;
  const seed = hashString(`${state.year}${state.quarter}${state.origin?.platformName || ''}`);
  const noise = (idx) => ((seed >> idx) & 0xff) / 255 - 0.5;
  const tighten = -policy;

  let sub, rows;
  if (roleId === 'im') {
    sub = '公募债基行业';
    rows = [
      { k: '10Y 国债收益率', v: `${(2.5 + tighten * 0.05 + noise(6) * 0.08).toFixed(2)}%`, delta: `+${Math.round(tighten * 5 + noise(7) * 4)} bp`, lvl: 'warn' },
      { k: 'AA 信用利差', v: `${Math.round(150 + tighten * 12 + noise(0) * 10)} bp`, delta: `+${Math.round(tighten * 3 + noise(1) * 5)}`, lvl: 'danger' },
      { k: '行业平均赎回率', v: `${(5.5 + tighten * 0.6 + noise(8) * 0.5).toFixed(1)}%`, delta: `+${(tighten * 0.4 + noise(9) * 0.5).toFixed(1)}`, lvl: 'danger' },
      { k: '回购加权利率', v: `${(2.0 + tighten * 0.2 + noise(10) * 0.15).toFixed(2)}%`, delta: `+${Math.round(tighten * 6 + noise(11) * 4)} bp`, lvl: 'warn' },
    ];
  } else if (roleId === 'gov') {
    sub = '政策与同侪';
    rows = [
      { k: '全国特殊再融资额度', v: `${(1.4 - tighten * 0.05 + noise(6) * 0.1).toFixed(1)} 万亿`, delta: 'Q3 截止', lvl: 'warn' },
      { k: '同档区县均债务率', v: `${Math.round(248 + tighten * 4 + noise(7) * 6)}%`, delta: `我 +${Math.round(tighten * 2 + noise(8) * 3)}pp`, lvl: 'danger' },
      { k: '省级转移支付增速', v: `+${(3.2 - tighten * 0.4 + noise(9) * 0.4).toFixed(1)}%`, delta: `${(-tighten * 0.3 + noise(10) * 0.5).toFixed(1)}`, lvl: 'warn' },
      { k: '土地出让流拍率', v: `${Math.round(38 + tighten * -3 + noise(11) * 5)}%`, delta: `${Math.round(tighten * -2 + noise(12) * 3)}`, lvl: 'danger' },
    ];
  } else {
    sub = '本地城投融资环境';
    rows = [
      { k: 'AA 城投信用利差', v: `${Math.round(150 + tighten * 12 + noise(0) * 10)} bp`, delta: `+${Math.round(tighten * 3 + noise(1) * 5)}`, lvl: 'danger' },
      { k: '本省取消发行', v: `${Math.max(0, Math.round(2 + tighten * 0.7 + noise(2) * 1.5))} / 周`, delta: `+${Math.round(tighten * 0.5 + noise(3) * 1.5)}`, lvl: 'warn' },
      { k: '银行授信审批', v: `T+${Math.round(12 + tighten * 2.5 + noise(4) * 3)} 天`, delta: `+${Math.round(tighten * 1.2 + noise(5) * 2)}`, lvl: 'warn' },
      { k: '土地拍卖溢价率', v: `${(-2 + tighten * -0.5 + noise(9) * 1.5).toFixed(1)}%`, delta: `${(tighten * -0.3 + noise(10) * 1).toFixed(1)}`, lvl: 'warn' },
    ];
  }

  return `
    <div class="pulse">
      <div class="pulse-head">
        <span><span class="ax">⏚</span> 市场脉冲</span>
        <span class="meta">${escapeHtml(sub)}</span>
      </div>
      <div class="pulse-rows">
        ${rows.map(r => `
          <div class="pulse-row lvl-${r.lvl}">
            <span class="k">${escapeHtml(r.k)}</span>
            <span class="v mono">${escapeHtml(r.v)}</span>
            <span class="d mono lvl-${r.lvl}">${escapeHtml(r.delta)}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderUIStatusbar(state) {
  const roleId = state.role?.id || 'cfo';
  const goalText = roleId === 'cfo' ? '存活 12 季 · 期末现金 ≥ 0'
    : roleId === 'im' ? '净值守住 0.95 · 12 季不破 0.85'
    : '压降 50 个百分点债务率';
  const seedShort = hashString(state.origin?.platformName || 'seed').toString(16).toUpperCase().padStart(4, '0').slice(-4);
  const time = roleId === 'im' ? '14:08' : roleId === 'gov' ? '10:00' : '09:32';
  return `
    <div class="statusbar">
      <span class="sb-item"><span class="k">目标</span><b>${annotate(escapeHtml(goalText))}</b></span>
      <span class="sb-item"><span class="k">回合</span><b>${state.quartersPassed} / 12</b></span>
      <span class="sb-item"><span class="k">政策</span><b>${escapeHtml(policyLabelClean(state.policyValue))}</b></span>
      <span class="sb-spacer"></span>
      <button class="sb-glossary" id="btn-glossary" type="button" title="打开术语库（Esc 关闭）">术语库</button>
      <button class="sb-npc" id="btn-npc-memory" type="button" title="NPC 记忆（Esc 关闭）">NPC <span class="npc-count">${(() => { try { const s = getNpcMemoryStats(); return `${s.encountered}/${s.total}`; } catch (e) { return ''; } })()}</span></button>
      <button class="sb-achievements" id="btn-achievements" type="button" title="查看成就（Esc 关闭）">成就 <span class="ach-count mono">${(() => { try { const a = getAchievementsForUI(); return `${a.unlocked}/${a.total}`; } catch (e) { return ''; } })()}</span></button>
      <span class="sb-pill">SEED-${ROLE_CODES[roleId] || 'CFO'}-${seedShort}</span>
      <span class="sb-pill">AUTOSAVE · T+0 ${time}</span>
    </div>
  `;
}

export function bindMainScreenEvents(state, callbacks) {
  // 事件选项
  document.querySelectorAll('.opt[data-choice-idx]').forEach(btn => {
    btn.addEventListener('click', () => callbacks.onChoiceSelected(parseInt(btn.dataset.choiceIdx, 10)));
  });
  // 主动操作
  document.querySelectorAll('.action-btn[data-action-id]').forEach(btn => {
    if (btn.classList.contains('locked')) return;
    btn.addEventListener('click', () => callbacks.onActionSelected(btn.dataset.actionId));
  });
  // 结束本季
  const endBtn = document.getElementById('btn-end-turn');
  if (endBtn) endBtn.addEventListener('click', callbacks.onEndTurn);
  // 术语库按钮
  const glossaryBtn = document.getElementById('btn-glossary');
  if (glossaryBtn) glossaryBtn.addEventListener('click', () => openGlossaryDrawer());

  // 成就按钮
  const achBtn = document.getElementById('btn-achievements');
  if (achBtn) achBtn.addEventListener('click', () => openAchievementsDrawer());

  // NPC 记忆按钮
  const npcBtn = document.getElementById('btn-npc-memory');
  if (npcBtn) npcBtn.addEventListener('click', () => openNpcDrawer());

  // 决策助手按钮
  const coachBtn = document.getElementById('btn-coach');
  if (coachBtn && callbacks?.onCoachAsk) {
    coachBtn.addEventListener('click', () => loadCoachAdvice(callbacks));
  }

  // 异步拉取同侪信号（不阻塞渲染，失败静默）
  loadPeerSignalForCurrentEvent();
}

// ───────────────────────────────────────────────
// AI 决策助手：选项卡下方的「请教 AI」条
// ───────────────────────────────────────────────

function renderCoachBar(state) {
  const used = state.coachingUsedTotal || 0;
  const remain = Math.max(0, COACH_MAX - used);
  const disabled = remain === 0;
  return `
    <div class="coach-bar">
      <div class="coach-bar-head">
        <span class="coach-bar-label mono">▸ AI 决策助手 · 中立分析</span>
        <span class="coach-bar-meta mono">${remain}/${COACH_MAX} 剩余 · 一局共 ${COACH_MAX} 次</span>
      </div>
      <button class="coach-btn ${disabled ? 'disabled' : ''}" id="btn-coach" type="button" ${disabled ? 'disabled' : ''}>
        <span class="coach-btn-icon">◆</span>
        <span class="coach-btn-label">${disabled ? 'AI 配额已用完' : '请教 AI · 帮我分析这一步'}</span>
        <span class="coach-btn-arrow">→</span>
      </button>
      <div class="coach-result" id="coach-result"></div>
    </div>
  `;
}

async function loadCoachAdvice(callbacks) {
  const slot = document.getElementById('coach-result');
  const btn = document.getElementById('btn-coach');
  if (!slot || !btn) return;

  // 加载态
  btn.disabled = true;
  btn.classList.add('loading');
  slot.innerHTML = `<div class="coach-loading mono">分析中… <span class="coach-dots"></span></div>`;
  slot.classList.add('show');

  let result;
  try {
    result = await callbacks.onCoachAsk();
  } catch (err) {
    console.warn('Coach ask failed:', err);
    result = { ok: false, error: err?.message || '请求失败' };
  }

  btn.disabled = false;
  btn.classList.remove('loading');

  if (!result || result.ok === false) {
    slot.innerHTML = `<div class="coach-error">分析失败：${escapeHtml(result?.error || '请稍后重试')}</div>`;
    return;
  }

  const sourceLabel = result.source === 'deepseek' ? 'AI · DEEPSEEK' : '兜底分析（AI 暂不可用）';
  slot.innerHTML = `
    <div class="coach-card">
      <div class="coach-card-head">
        <span class="coach-card-icon">◆</span>
        <span class="coach-card-title">AI 助理 · 中立分析</span>
        <span class="coach-card-source mono">${escapeHtml(sourceLabel)}</span>
      </div>
      <div class="coach-card-body">${escapeHtml(result.advice || '').replace(/\n/g, '<br>')}</div>
      <div class="coach-card-foot mono">↑ 仅供参考，最终决策由你做</div>
    </div>
  `;

  // 配额用完后改 button 文案
  const newRemain = (typeof result.newRemain === 'number') ? result.newRemain : null;
  if (newRemain != null && newRemain === 0) {
    btn.classList.add('disabled');
    btn.disabled = true;
    const label = btn.querySelector('.coach-btn-label');
    if (label) label.textContent = 'AI 配额已用完';
    const meta = document.querySelector('.coach-bar-meta');
    if (meta) meta.textContent = `0/${COACH_MAX} 剩余 · 一局共 ${COACH_MAX} 次`;
  } else if (newRemain != null) {
    const meta = document.querySelector('.coach-bar-meta');
    if (meta) meta.textContent = `${newRemain}/${COACH_MAX} 剩余 · 一局共 ${COACH_MAX} 次`;
  }
}

async function loadPeerSignalForCurrentEvent() {
  const container = document.querySelector('.event-options[data-event-id]');
  if (!container) return;
  const eventId = container.dataset.eventId;
  const role = container.dataset.role;
  if (!eventId || !role) return;

  const slots = container.querySelectorAll('[data-peer-slot]');
  // 找到群体最高 pct 与高分玩家最高 pct，方便加 hint badge
  const data = await fetchPeerSignal(eventId, role);
  if (!data || !Array.isArray(data.choices) || data.choices.length === 0) {
    slots.forEach(s => { s.innerHTML = `<span class="peer-empty mono">PEER · 暂无样本</span>`; });
    return;
  }
  const maxPct = Math.max(...data.choices.map(c => c.pct));
  const maxHsPct = Math.max(...data.choices.map(c => c.highScorePct));
  const sourceLabel = data.source === 'real' ? '真实'
    : data.source === 'mixed' ? `混合 ${data.samples}样本`
    : '推演';

  slots.forEach(slot => {
    const idx = parseInt(slot.dataset.peerSlot, 10);
    const c = data.choices.find(x => x.idx === idx);
    if (!c) {
      slot.innerHTML = `<span class="peer-empty mono">PEER · —</span>`;
      return;
    }
    const isHot = c.pct === maxPct;
    const isHsTop = c.highScorePct === maxHsPct;
    const tags = [];
    if (isHot) tags.push(`<span class="peer-tag hot">最热门</span>`);
    if (isHsTop) tags.push(`<span class="peer-tag hs">高分爱选</span>`);
    slot.innerHTML = `
      <div class="peer-row">
        <span class="peer-label mono">PEER · ${escapeHtml(sourceLabel)}</span>
        <div class="peer-bar"><i style="width:${c.pct}%"></i></div>
        <span class="peer-stats mono">
          群体 <b>${c.pct}%</b> · 高分 <b>${c.highScorePct}%</b> · 存活 <b>${c.survivedPct}%</b>
          <span class="peer-archetype">${escapeHtml(c.archetype)}</span>
        </span>
        ${tags.join('')}
      </div>
    `;
  });
}

// 旧的辅助：保留 collLabel
function collLabel(v) { return v === 'high' ? '充足' : (v === 'medium' ? '中等' : '紧张'); }

// 计算指标 trend：state.history[最后一条] vs 当前 metrics
function getTrend(state, key, lowerIsBetter) {
  const last = state.history?.[state.history.length - 1];
  if (!last) return null;
  const before = last[key] ?? last.snapshot?.[key];
  const now = state.metrics?.[key];
  if (typeof before !== 'number' || typeof now !== 'number') return null;
  const delta = now - before;
  if (Math.abs(delta) < 0.05) return null;
  const isGood = lowerIsBetter ? delta < 0 : delta > 0;
  return { delta, isGood };
}

// 事件正文关键词高亮：用 main-ui.css 的 <em> 和 .danger-word
function highlightEventBody(body) {
  let html = escapeHtml(body || '').replace(/\n/g, '<br>');
  html = html.replace(/(红线|挤兑|触发|缺口|违约|清盘|约谈|爆雷|穿线|超线)/g, '<span class="danger-word">$1</span>');
  html = html.replace(/((?:\d+(?:\.\d+)?)\s*(?:亿|%|bp|万|季|天|周))/g, '<em>$1</em>');
  return html;
}

// 选项卡右上角业务参数：从 effects 抽核心数字
function getChoiceBusinessMeta(choice, role) {
  const fx = choice.effects || {};
  const labels = role?.metricLabels || {};
  if (fx._uncertainty !== undefined) return `不确定 · ${Math.round(fx._uncertainty * 100)}%`;
  if (fx._delay) return `延期 ${fx._delay} 季`;
  let topKey = null, topVal = 0;
  for (const [k, v] of Object.entries(fx)) {
    if (k.startsWith('_') || k.startsWith('score.') || typeof v !== 'number') continue;
    if (Math.abs(v) > Math.abs(topVal)) { topKey = k; topVal = v; }
  }
  if (topKey) {
    const lbl = labels[topKey] || topKey;
    return `${lbl} ${topVal > 0 ? '+' : ''}${topVal}`;
  }
  return '即时';
}

// ============================================================
// Crisis Modal — Round 3 Claude Design 落地
// ============================================================
// 数据契约：与角色 detectCrisis 返回一致
//   { type, title, body, metrics: [{label, value}], options: [{label, cost, desc, effects}] }
// 这里把它适配成设计稿的 cmodal 结构（cm-tagline / cm-metrics / cm-opts / cm-foot）
export function renderCrisisModal(crisis, onSelect) {
  const host = document.createElement('div');
  host.className = 'overlay-host';
  host.id = 'crisis-overlay';
  // Crisis 始终用红色主题；不需要 data-role
  const isMobile = window.innerWidth < 720;

  const sev = sevFromCrisisType(crisis.type);
  const evtId = formatCrisisId(crisis.type);
  const timeStr = 'T-暂停 · ' + (Math.floor(Math.random() * 5) + 2) + '.' + Math.floor(Math.random() * 9) + 's 前触发';

  host.innerHTML = `
    <div class="scrim crisis"></div>
    <div class="crisis-banner">
      <span class="pulse"></span>
      <span class="em">危机警报</span>
      <span class="sep">·</span>
      <span>时间暂停</span>
      <span class="sep">·</span>
      <span>必须处置后继续</span>
    </div>
    <div class="cmodal ${isMobile ? 'mobile' : ''}">
      <div class="cm-head">
        <div class="cm-tagline">
          <span class="cm-sev">${escapeHtml(sev)}</span>
          <span class="cm-id">${escapeHtml(evtId)}</span>
          <span class="cm-time">${escapeHtml(timeStr)}</span>
        </div>
        <div class="cm-title">${annotateNpc(annotate(escapeHtml(stripIcon(crisis.title))))}</div>
        <div class="cm-desc">${annotateNpc(highlightCrisisBody(crisis.body))}</div>
      </div>

      <div class="cm-metrics">
        ${(crisis.metrics || []).slice(0, 3).map(m => renderCrisisMetric(m)).join('')}
      </div>

      <div class="cm-opts">
        ${crisis.options.map((o, i) => renderCrisisOption(o, i)).join('')}
      </div>

      <div class="cm-foot">
        <span class="hint">提示：本次处置 <b>不可撤销</b>。键盘 <b>1/2/3</b> 选择方案。</span>
        <span class="deadline"><span class="dot"></span>T-暂停 中</span>
      </div>
    </div>
  `;
  document.body.appendChild(host);

  // 选项点击 / 键盘 1/2/3
  const trigger = (idx) => {
    if (!Number.isInteger(idx) || idx < 0 || idx >= crisis.options.length) return;
    document.removeEventListener('keydown', onKey);
    host.remove();
    onSelect(crisis.options[idx]);
  };
  host.querySelectorAll('.cm-opt').forEach(el => {
    el.addEventListener('click', () => trigger(parseInt(el.dataset.optIdx, 10)));
  });
  const onKey = (e) => {
    if (e.key === '1' || e.key === '2' || e.key === '3') trigger(parseInt(e.key, 10) - 1);
  };
  document.addEventListener('keydown', onKey);
}

function sevFromCrisisType(type) {
  if (type === 'redemption_run') return 'SEV-1 · LIQUIDITY';
  if (type === 'hidden_debt_burst') return 'SEV-1 · HIDDEN DEBT';
  if (type === 'crisis_cash') return 'SEV-1 · CASHFLOW';
  return 'SEV-1 · CRITICAL';
}
function formatCrisisId(type) {
  const t = (type || 'crisis').toUpperCase().slice(0, 8);
  const ts = new Date();
  return `EVT-${ts.getFullYear()}Q${Math.ceil((ts.getMonth() + 1) / 3)}-${t}-${String(Math.floor(Math.random() * 999)).padStart(3, '0')}`;
}
function stripIcon(s) {
  return String(s || '').replace(/^[⚠⚡◆◇⨯✕✖]+\s*/, '');
}
function highlightCrisisBody(body) {
  // 高亮数字 + 关键负面词
  let html = escapeHtml(body || '').replace(/\n/g, '<br>');
  html = html.replace(/(\d+(?:\.\d+)?\s*(?:亿|%|bp|pt|季|天|周|个|家))/g, '<em>$1</em>');
  html = html.replace(/(挤兑|爆雷|清盘|断裂|约谈|穿线|超线|强制|问责)/g, '<em>$1</em>');
  return html;
}

function renderCrisisMetric(m) {
  // 推断 level：value 含负号、"超"、超过阈值 → danger；含"缺口"、"距离" → warn
  const valStr = String(m.value || '');
  const labelStr = String(m.label || '');
  let level = '';
  if (/[-−]|超|穿|溢|爆|急/.test(valStr) || /隐债|赎回|穿线/.test(labelStr)) level = 'danger';
  else if (/缺口|距离|警/.test(valStr) || /缺口|距离/.test(labelStr)) level = 'warn';

  // 拆数字+单位
  const vMatch = valStr.match(/^([-−]?\d[\d,.]*)\s*(.*)$/);
  const numPart = vMatch ? vMatch[1] : valStr;
  const unitPart = vMatch ? vMatch[2] : '';

  return `
    <div class="cm-metric ${level}">
      <span class="k">${escapeHtml(labelStr)}</span>
      <span class="v">${escapeHtml(numPart)}${unitPart ? `<span class="u">${escapeHtml(unitPart)}</span>` : ''}</span>
    </div>
  `;
}

function renderCrisisOption(o, i) {
  const key = String.fromCharCode(65 + i);  // A/B/C
  const cost = o.cost ? `代价 · ${escapeHtml(o.cost)}` : '';
  const preds = buildCrisisPredRows(o.effects);
  return `
    <button class="cm-opt" data-opt-idx="${i}" type="button">
      <div class="cm-opt-head">
        <span class="cm-opt-key">${key}</span>
        ${cost ? `<span class="cm-opt-cost">${cost}</span>` : ''}
      </div>
      <div class="cm-opt-title">${annotateNpc(annotate(escapeHtml(o.label)))}</div>
      ${o.desc ? `<div class="cm-opt-desc">${annotateNpc(annotate(escapeHtml(o.desc)))}</div>` : ''}
      <div class="cm-opt-pred">
        <div class="pl">预计影响</div>
        ${preds.map(p => `
          <div class="pred-row">
            <span class="pk">${escapeHtml(p.k)}</span>
            <span class="pv ${p.tone}">${escapeHtml(p.v)}</span>
          </div>
        `).join('')}
      </div>
      <div class="cm-opt-cta">
        <span>选择此方案</span>
        <span class="arr">▶</span>
      </div>
    </button>
  `;
}

// ── effect 字段名 → 中文标签的全局映射 ──
// 用户反馈：危机 modal 的"预计影响"列表里出现了 cashRatio / aum / crisisResponse
// 等英文 key。修：维护一份覆盖三个角色所有字段的中英文映射，统一翻译
const EFFECT_LABEL_MAP = {
  // CFO metric
  cash: '现金',
  debtMaturity: '到期债务',
  financingCost: '融资成本',
  creditUsage: '授信使用率',
  creditUsed: '已用授信',
  creditTotal: '授信总额',
  leverageRatio: '资产负债率',
  collateralRoom: '抵押物余量',
  projectGap: '项目缺口',
  opCostRate: '运营成本率',
  // IM metric
  nav: '净值',
  aum: '持仓规模',
  cashRatio: '现金比例',
  duration: '组合久期',
  concentration: '集中度',
  creditExposure: 'AA 及以下占比',
  redemptionPressure: '赎回压力',
  leverage: '杠杆率',
  // GOV metric
  fiscalRevenue: '一般预算',
  landRevenue: '土地收入',
  debtRatio: '综合债务率',
  hiddenDebtRisk: '隐债敞口',
  industryIndex: '产业指数',
  politicalScore: '政绩评分',
  specialBondQuota: '专项债额度',
  transferPayment: '转移支付',
  // 共享 score 维度（key 是 score.xxx 的 xxx 部分）
  liquidity: '流动性',
  costControl: '成本控制',
  projectProgress: '项目推进',
  compliance: '合规',
  crisisResponse: '危机应对',
  development: '综合发展',
};

function effectLabel(k) {
  if (k.startsWith('score.')) {
    const dim = k.slice(6);
    return EFFECT_LABEL_MAP[dim] || dim;
  }
  return EFFECT_LABEL_MAP[k] || k;
}

function buildCrisisPredRows(effects) {
  if (!effects) return [];
  const rows = [];
  // 优先呈现 _uncertain
  if (typeof effects._uncertain === 'number') {
    rows.push({ k: '成功率', v: `约 ${Math.round(effects._uncertain * 100)}%`, tone: 'warn' });
  }
  for (const [k, v] of Object.entries(effects)) {
    if (k.startsWith('_')) continue;
    if (typeof v !== 'number') continue;
    const label = effectLabel(k);
    const sign = v > 0 ? '+' : '';
    let tone;
    // tone 推断：金额/资金类正值=up；杠杆/债务/费率类正值=down；score.* 正值=up
    if (k === 'cash' || k === 'cashRatio' || k === 'aum' || k === 'transferPayment' || k === 'specialBondQuota' || k === 'industryIndex' || k === 'politicalScore' || k.startsWith('score.')) {
      tone = v > 0 ? 'up' : 'down';
    } else if (k === 'leverageRatio' || k === 'debtRatio' || k === 'financingCost' || k === 'redemptionPressure' || k === 'hiddenDebtRisk' || k === 'creditUsage' || k === 'concentration') {
      tone = v > 0 ? 'down' : 'up';
    } else {
      tone = v > 0 ? 'up' : 'down';
    }
    rows.push({ k: label, v: `${sign}${v}`, tone });
  }
  return rows.slice(0, 4);
}

// ============================================================
// 主界面辅助函数（Plan 5 主界面调整）
// ============================================================

// 'val-bad'/'val-warn'/'val-ok' → 'bad'/'warn'/'ok'/'neutral'
function toneFromClass(cls) {
  if (cls === 'val-bad') return 'bad';
  if (cls === 'val-warn') return 'warn';
  if (cls === 'val-ok') return 'ok';
  return 'neutral';
}

// 简单字符串 hash（生成 SEED-XXXX 用）
function hashString(str) {
  let h = 0;
  for (let i = 0; i < (str || '').length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

// 累加未来 N 季的债务到期金额
function sumDebt(debtMaturity, fromIdx, count) {
  if (!Array.isArray(debtMaturity)) return 0;
  let s = 0;
  for (let i = fromIdx; i < Math.min(debtMaturity.length, fromIdx + count); i++) {
    s += debtMaturity[i] || 0;
  }
  return s;
}

// IM 下季预期赎回量（亿）
function getExpectedRedeem(m) {
  const p = m?.redemptionPressure || 0;
  if (p < 60) return 0;
  return (m.aum || 0) * (p - 50) / 350;  // 与 advanceTurn 公式一致
}

// IM 当前现金（亿）
function getCashAvail(m) {
  return (m?.aum || 0) * (m?.cashRatio || 0) / 100;
}

// 事件代号（用于 event-code 显示）
function getEventCode(eventId) {
  if (!eventId) return 'EVT';
  // main_2022_q1_a → MAIN-22Q1A
  const main = eventId.match(/^main_(\d{4})_q(\d)_?(.*)$/);
  if (main) return `MAIN-${main[1].slice(2)}Q${main[2]}${main[3] ? main[3].toUpperCase() : ''}`;
  const rand = eventId.match(/^rand_(.*)$/);
  if (rand) return `MKT-${rand[1].slice(0, 6).toUpperCase()}`;
  return eventId.slice(0, 12).toUpperCase();
}

// 事件徽章文本
function getEventBadge(state, event) {
  const isMain = event.id?.startsWith('main_');
  if (isMain) return '主线 · 必答';
  return '市场 · 扰动';
}

// 选项卡片头部 meta（"ACT-A · 即时" 之类）
function renderChoiceMeta(choice) {
  const fx = choice.effects || {};
  let tag = '即时';
  if (fx._uncertainty !== undefined) tag = `不确定 · ${Math.round(fx._uncertainty * 100)}%`;
  else if (fx._delay) tag = `延期 ${fx._delay}`;
  return `<span class="choice-meta">${escapeHtml(tag)}</span>`;
}

// 本局目标卡 - 标题 + 副标题

// ============================================================
// EndScreen — Round 4 Claude Design 落地
// 视觉骨架 1:1 用 .eg-host + .endscr 双列；下方接 4 张 AI 卡保留旧功能
// ============================================================

// 圈内人风格的角色×等级称号（替换原来的"传奇/优秀/及格/勉强/失败"）
const GRADE_LABELS_BY_ROLE = {
  cfo: { S: '城投定海针', A: '稳健舵手', B: '及格财总', C: '勉强续命', D: '暴雷在即' },
  im:  { S: '流动性守夜人', A: 'α 收割机', B: '中规中矩', C: '净值警戒线', D: '踩雷出局' },
  gov: { S: '化债铁腕',   A: '稳健治理', B: '走一步看一步', C: '压力山大', D: '高风险地区' },
};

const GRADE_QUOTES = {
  S: '在所有人都恐慌时保持冷静，在所有人都贪婪时悄然撤退。',
  A: '稳，是这个市场最稀缺的品质。',
  B: '活下来已经赢过 60% 的同业。',
  C: '不要用脚踝赌命，下一局换条路走。',
  D: '复盘比情绪重要。每个雷都给后人留了路标。',
};

export function renderEndScreen(state, finalScore, callbacks) {
  const app = document.getElementById('app');
  const roleId = state.origin?.role || state.role?.id || 'cfo';
  const pass = !!state.survived;
  const grade = finalScore.grade.grade;
  const gradeLabel = GRADE_LABELS_BY_ROLE[roleId]?.[grade] || finalScore.grade.label;
  const quote = GRADE_QUOTES[grade] || '';
  const dimEntries = Object.entries(finalScore.dimensions || {});
  const dimLabels = dimEntries.map(([k]) => k);
  const dimScores = dimEntries.map(([, v]) => Math.round(v));
  const isMobile = window.innerWidth < 720;
  const platformName = state.origin?.platformName || '未命名机构';
  const directorName = state.origin?.directorName || '匿名';
  const quartersPassed = state.quartersPassed || 0;
  const totalQuarters = 12;
  const difficulty = pickDifficulty(state.origin);
  const seedShort = hashString(platformName).toString(16).toUpperCase().padStart(4, '0').slice(-4);
  const elapsed = mockElapsedDuration(quartersPassed);
  const reasonText = pass
    ? `第 <b>${quartersPassed}</b> 季度任期届满 · 无重大违约`
    : `第 <b>${quartersPassed}</b> 季度 · <em>${escapeHtml(state.deathReason || '未知原因')}</em>`;

  const rankNum = callbacks.rank;
  const rankBlock = rankNum
    ? `<div class="rank">
         <span class="lbl">RANK</span>
         <span class="num">第 ${rankNum} 名</span>
         <span class="of">/ 1,082</span>
       </div>`
    : '';

  app.innerHTML = `
    <div class="eg-host ${pass ? 'pass' : 'fail'} ${isMobile ? 'mobile' : ''}" data-role="${roleId}">
      <div class="eg-topbar">
        <div class="l">
          <span class="brand">搞债 · <b>${escapeHtml(ROLE_CODES[roleId] || 'CFO')}</b> · 终局结算</span>
          ${isMobile ? '' : `<span class="sep">/</span><span>SAVE-${state.year || 2024}-${escapeHtml(roleId.toUpperCase())}-${seedShort}</span>`}
        </div>
        <div class="r">
          <span><span class="dot"></span>SESSION END</span>
          ${isMobile ? '' : `<span class="sep">/</span><span>耗时 ${elapsed}</span>`}
        </div>
      </div>

      <div class="endscr">
        <div class="col">
          <div class="es-status ${pass ? 'pass' : 'fail'}">
            <span class="badge">${pass ? '✓ 成功通关' : '✕ 中途失败'}</span>
            <span class="reason">${reasonText}</span>
          </div>

          <div class="es-grade-wrap">
            <div class="es-grade">${escapeHtml(grade)}</div>
            <div class="es-grade-side">
              <span class="es-grade-meta">FINAL GRADE</span>
              <span class="es-grade-label">${escapeHtml(gradeLabel)}</span>
              <div class="es-grade-quote">${escapeHtml(quote)}</div>
            </div>
          </div>

          <div class="es-score">
            <div>
              <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-3);letter-spacing:0.22em;text-transform:uppercase">总分</div>
              <span class="v">${finalScore.total}<span class="max">/100</span></span>
            </div>
            ${rankBlock}
          </div>

          <div class="es-meta">
            <div class="cell"><span class="k">平台</span><span class="v">${escapeHtml(platformName)}</span></div>
            <div class="cell"><span class="k">角色</span><span class="v role">${escapeHtml(directorName)}</span></div>
            <div class="cell"><span class="k">存活季度</span><span class="v">${quartersPassed} / ${totalQuarters}</span></div>
            <div class="cell"><span class="k">难度</span><span class="v">${escapeHtml(difficulty)}</span></div>
          </div>

          <div class="es-ctas">
            <button class="es-cta primary" id="btn-restart" type="button">
              <span class="arr">▶</span> 再来一局 <span class="k">⏎</span>
            </button>
            <button class="es-cta" id="btn-leaderboard" type="button">排行榜 <span class="k">L</span></button>
            <button class="es-cta" id="btn-share" type="button">生成分享卡片 <span class="k">S</span></button>
          </div>
        </div>

        <div class="col es-right">
          <div class="es-section-h">
            <span class="ax">▶ 六维能力评估</span>
            <span class="meta">基于 ${quartersPassed} 季度行为日志</span>
          </div>
          <div class="es-radar">
            ${renderEndRadarSvg(dimScores, dimLabels, roleId, isMobile)}
          </div>
          <div class="es-section-h" style="margin-top:4px">
            <span class="ax">▶ 维度评级</span>
            <span class="meta">满分 100</span>
          </div>
          <div class="es-dims">
            ${dimLabels.map((name, i) => {
              const v = dimScores[i];
              const tier = v >= 85 ? 'S' : v >= 70 ? 'A' : v >= 55 ? 'B' : v >= 40 ? 'C' : 'D';
              const tone = v < 40 ? 'low' : v < 70 ? 'mid' : '';
              return `
                <div class="es-dim">
                  <span class="name">${escapeHtml(name)}</span>
                  <span class="bar"><span class="fill" style="width:${v}%"></span></span>
                  <span class="v">${v}</span>
                  <span class="g ${tone}">${tier}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>

      <!-- 4 张 AI 增强卡（保留旧功能，全宽插在双列下方） -->
      <div class="endgame-extras" data-role="${roleId}">
        ${renderNewAchievements(callbacks.newAchievements, callbacks)}
        ${renderPortraitShell()}
        ${renderHeadlineShell()}
        ${renderDecisionsShell(callbacks.decisionDetails)}
      </div>
    </div>
  `;

  document.getElementById('btn-restart').addEventListener('click', callbacks.onRestart);
  document.getElementById('btn-share').addEventListener('click', () => callbacks.onShare(finalScore));
  document.getElementById('btn-leaderboard').addEventListener('click', callbacks.onLeaderboard);

  // 键盘快捷键（设计稿要求）
  const onKey = (e) => {
    const target = e.target;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
    if (e.key === 'Enter') { e.preventDefault(); callbacks.onRestart(); }
    else if (e.key === 'l' || e.key === 'L') { e.preventDefault(); callbacks.onLeaderboard(); }
    else if (e.key === 's' || e.key === 'S') { e.preventDefault(); callbacks.onShare(finalScore); }
  };
  document.addEventListener('keydown', onKey);

  // 触发画像异步加载
  if (typeof callbacks.onPortraitFetch === 'function') {
    loadPortrait(callbacks);
    document.getElementById('btn-portrait-retry')?.addEventListener('click', () => loadPortrait(callbacks, true));
  }

  // 触发决策对比异步加载
  if (Array.isArray(callbacks.decisionDetails) && callbacks.decisionDetails.length > 0) {
    loadDecisionComparisons(callbacks.decisionDetails, callbacks.role);
  }

  // 触发成就解锁 Toast
  if (Array.isArray(callbacks.newAchievements) && callbacks.newAchievements.length > 0) {
    setTimeout(() => showAchievementToasts(callbacks.newAchievements), 800);
  }

  // 爆款标题
  document.getElementById('btn-headline-gen')?.addEventListener('click', () => loadHeadline(callbacks));
  document.getElementById('btn-headline-retry')?.addEventListener('click', () => loadHeadline(callbacks, true));

  // 本局成就 → 抽屉
  document.getElementById('btn-ach-all')?.addEventListener('click', () => openAchievementsDrawer());
  document.querySelectorAll('[data-end-ach-id]').forEach(el => {
    el.addEventListener('click', () => openAchievementsDrawer(el.dataset.endAchId));
  });
}

// 难度推断（命运卡用 challengeScore，没有就根据 origin 估）
function pickDifficulty(origin) {
  const cs = origin?.challengeScore || 18;
  if (cs >= 24) return '困难';
  if (cs >= 20) return '挑战';
  if (cs <= 16) return '入门';
  return '标准';
}
function mockElapsedDuration(quartersPassed) {
  // 基于 quartersPassed 编一个像样的耗时（仅装饰）
  const totalSec = quartersPassed * (180 + Math.floor(Math.random() * 60));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ───────────────────────────────────────────────
// SVG Radar — 自绘，不依赖 chart.js
// 移植自设计稿 endgame.jsx Radar 组件
// ───────────────────────────────────────────────
function renderEndRadarSvg(scores, labels, role, isMobile) {
  const N = scores.length;
  if (N === 0) return '';
  // 加大整体尺寸（380 → 460），让六边形主体更醒目
  // r 从 size*0.30 → size*0.34，雷达更大不再贴边
  const size = isMobile ? 360 : 460;
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.34;
  const angle = (i) => (Math.PI * 2 * i) / N - Math.PI / 2;
  const point = (i, ratio) => {
    const a = angle(i);
    return [cx + Math.cos(a) * r * ratio, cy + Math.sin(a) * r * ratio];
  };
  const grids = [0.25, 0.5, 0.75, 1].map((ratio, gi) => {
    const pts = Array.from({ length: N }, (_, i) => point(i, ratio).join(',')).join(' ');
    const stroke = gi === 3 ? 'rgba(120,140,200,0.30)' : 'rgba(120,140,200,0.13)';
    const dash = gi === 3 ? '0' : '2 3';
    return `<polygon points="${pts}" fill="none" stroke="${stroke}" stroke-dasharray="${dash}" />`;
  }).join('');
  const axes = Array.from({ length: N }, (_, i) => {
    const [x, y] = point(i, 1);
    return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="rgba(120,140,200,0.16)" stroke-dasharray="2 3" />`;
  }).join('');
  const dataPath = scores.map((s, i) => point(i, Math.max(0, Math.min(100, s)) / 100).join(',')).join(' ');
  const roleColor = ROLE_ACCENTS[role] || '#4fc3f7';
  const dots = scores.map((s, i) => {
    const [x, y] = point(i, Math.max(0, Math.min(100, s)) / 100);
    return `<circle cx="${x}" cy="${y}" r="3.2" fill="${roleColor}" stroke="#0a0e1a" stroke-width="1.5" />`;
  }).join('');
  const labelOffset = isMobile ? 1.30 : 1.32;
  const labelTexts = labels.map((lab, i) => {
    const [x, y] = point(i, labelOffset);
    const [vx, vy] = point(i, labelOffset - 0.14);
    const anchor = Math.abs(x - cx) < 8 ? 'middle' : (x > cx ? 'start' : 'end');
    return `
      <g>
        <text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}" dominant-baseline="middle"
              font-family='"PingFang SC", system-ui, sans-serif'
              font-size="${isMobile ? 15 : 17}" fill="#c8d0e5" letter-spacing="0.04em" font-weight="500">${escapeHtml(lab)}</text>
        <text x="${vx.toFixed(1)}" y="${vy.toFixed(1)}" text-anchor="${anchor}" dominant-baseline="middle"
              font-family='"SF Mono", monospace'
              font-size="${isMobile ? 15 : 18}" fill="${roleColor}" letter-spacing="0.04em" font-weight="700">${scores[i]}</text>
      </g>
    `;
  }).join('');
  const padX = isMobile ? 72 : 86;  // 字加大后 padding 同步加大避免被截
  return `
    <svg viewBox="${-padX} 0 ${size + padX * 2} ${size}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <radialGradient id="rg-${role}" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="${roleColor}" stop-opacity="0.32" />
          <stop offset="100%" stop-color="${roleColor}" stop-opacity="0.06" />
        </radialGradient>
      </defs>
      ${grids}
      ${axes}
      <polygon points="${dataPath}" fill="url(#rg-${role})" stroke="${roleColor}" stroke-width="1.5"
               style="filter: drop-shadow(0 0 6px ${roleColor}66)" />
      ${dots}
      ${labelTexts}
    </svg>
  `;
}

// ───────────────────────────────────────────────
// 终局页：本局解锁的成就
// ───────────────────────────────────────────────

// ───────────────────────────────────────────────
// 终局页：爆款标题（朋友圈分享文）
// ───────────────────────────────────────────────

function renderHeadlineShell() {
  return `
    <div class="headline-card collapsed" id="headline-card">
      <div class="headline-head">
        <div class="headline-title">
          <span class="headline-ax">◢</span>
          <span>朋友圈分享文</span>
          <span class="headline-sub">AI 写一段值得发圈的本局复盘</span>
        </div>
        <button class="headline-gen mono" id="btn-headline-gen" type="button">生成 →</button>
      </div>
      <div class="headline-body" id="headline-body" style="display:none"></div>
    </div>
  `;
}

async function loadHeadline(callbacks, force = false) {
  const card = document.getElementById('headline-card');
  const body = document.getElementById('headline-body');
  const genBtn = document.getElementById('btn-headline-gen');
  if (!card || !body) return;
  if (typeof callbacks.onHeadlineFetch !== 'function') return;

  card.classList.remove('collapsed');
  body.style.display = '';
  body.innerHTML = `
    <div class="headline-skeleton">
      <div class="sk-line sk-line-title"></div>
      <div class="sk-line"></div>
      <div class="sk-line"></div>
      <div class="sk-line short"></div>
    </div>
  `;
  if (genBtn) {
    genBtn.disabled = true;
    genBtn.textContent = force ? '重新生成中…' : '生成中…';
  }

  let result;
  try {
    result = await callbacks.onHeadlineFetch(force);
  } catch (err) {
    result = { ok: false, error: err?.message || '请求失败' };
  }

  if (genBtn) genBtn.disabled = false;

  if (!result || result.ok === false) {
    body.innerHTML = `<div class="headline-error">生成失败：${escapeHtml(result?.error || '请稍后重试')}</div>`;
    if (genBtn) genBtn.textContent = '重新生成 ↻';
    genBtn.id = 'btn-headline-retry';
    document.getElementById('btn-headline-retry')?.addEventListener('click', () => loadHeadline(callbacks, true));
    return;
  }

  const sourceLabel = result.source === 'deepseek' ? 'AI · DEEPSEEK' : '兜底版本';
  const cachedTag = result.cached ? '<span class="headline-cached mono">缓存</span>' : '';
  body.innerHTML = `
    <div class="headline-content">
      <div class="headline-meta-row">
        <span class="headline-source mono">${escapeHtml(sourceLabel)}</span>${cachedTag}
      </div>
      <h3 class="headline-text">${escapeHtml(result.headline || '')}</h3>
      <p class="headline-body-text">${escapeHtml(result.body || '').replace(/\n/g, '<br>')}</p>
      <div class="headline-actions">
        <button class="headline-copy mono" id="btn-headline-copy" type="button">复制全文 →</button>
        <button class="headline-regen mono" id="btn-headline-regen" type="button">换一段</button>
      </div>
    </div>
  `;
  if (genBtn) {
    genBtn.style.display = 'none';
  }

  // 复制功能
  document.getElementById('btn-headline-copy')?.addEventListener('click', async () => {
    const fullText = `${result.headline}\n\n${result.body}`;
    try {
      await navigator.clipboard.writeText(fullText);
      const btn = document.getElementById('btn-headline-copy');
      if (btn) {
        const orig = btn.textContent;
        btn.textContent = '已复制 ✓';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = orig;
          btn.classList.remove('copied');
        }, 1800);
      }
    } catch (e) {
      console.warn('Clipboard failed:', e);
      alert('复制失败，请手动选取文字复制');
    }
  });

  // 重新生成
  document.getElementById('btn-headline-regen')?.addEventListener('click', () => loadHeadline(callbacks, true));
}

function renderNewAchievements(newAchievements, callbacks) {
  const has = Array.isArray(newAchievements) && newAchievements.length > 0;
  const allInfo = (() => {
    try { return getAchievementsForUI(); } catch (e) { return null; }
  })();

  if (!has) {
    // 没新解锁也展示一行总进度，给玩家方向感
    if (!allInfo) return '';
    return `
      <div class="ach-end-card empty">
        <div class="ach-end-head">
          <div class="ach-end-title">
            <span class="ach-end-ax">◆</span>
            <span>本局成就</span>
            <span class="ach-end-sub">无新解锁 · 累计 ${allInfo.unlocked}/${allInfo.total}</span>
          </div>
          <button class="ach-end-all mono" id="btn-ach-all" type="button">查看全部</button>
        </div>
      </div>
    `;
  }

  return `
    <div class="ach-end-card">
      <div class="ach-end-head">
        <div class="ach-end-title">
          <span class="ach-end-ax">◆</span>
          <span>本局解锁</span>
          <span class="ach-end-sub">+${newAchievements.length} 项 · 累计 ${allInfo ? allInfo.unlocked + '/' + allInfo.total : ''}</span>
        </div>
        <button class="ach-end-all mono" id="btn-ach-all" type="button">查看全部</button>
      </div>
      <div class="ach-end-list">
        ${newAchievements.map(a => `
          <article class="ach-end-item cat-${a.category}" data-end-ach-id="${escapeHtml(a.id)}">
            <span class="ach-end-icon">◆</span>
            <div class="ach-end-body">
              <div class="ach-end-name">${escapeHtml(a.name)}</div>
              <div class="ach-end-desc">${escapeHtml(a.desc)}</div>
            </div>
          </article>
        `).join('')}
      </div>
    </div>
  `;
}

// ───────────────────────────────────────────────
// 决策对比：本局 vs 全网玩家
// ───────────────────────────────────────────────

function renderDecisionsShell(decisions) {
  if (!Array.isArray(decisions) || decisions.length === 0) return '';
  return `
    <div class="decisions-card">
      <div class="dec-head">
        <div class="dec-title">
          <span class="dec-ax">⨯</span>
          <span>决策对比</span>
          <span class="dec-sub">本局每个关键决策 vs 全网玩家分布</span>
        </div>
      </div>
      <div class="dec-list">
        ${decisions.map((d, i) => `
          <article class="dec-row" data-dec-row="${i}" data-event-id="${escapeHtml(d.eventId || '')}" data-choice-idx="${d.choiceIdx}">
            <div class="dec-row-head">
              <span class="dec-q mono">Q${d.quarter}</span>
              <span class="dec-evt">${annotateNpc(annotate(escapeHtml(d.eventTitle || '未知事件')))}</span>
              ${d.outcome ? `<span class="dec-outcome ${d.outcome === '失败' ? 'bad' : 'good'}">${escapeHtml(d.outcome)}</span>` : ''}
            </div>
            <div class="dec-yours">
              <span class="dec-key mono">你的选择</span>
              <span class="dec-val">${annotateNpc(annotate(escapeHtml(d.choiceLabel || '—')))}</span>
            </div>
            <div class="dec-bars" data-bars-slot>
              <div class="dec-skeleton mono">PEER · 加载中…</div>
            </div>
          </article>
        `).join('')}
      </div>
    </div>
  `;
}

async function loadDecisionComparisons(decisions, role) {
  if (!role) return;
  // 并行 fetch 所有事件的 peer 信号
  await Promise.all(decisions.map(async (d, i) => {
    const row = document.querySelector(`[data-dec-row="${i}"]`);
    if (!row || !d.eventId) return;
    const slot = row.querySelector('[data-bars-slot]');
    if (!slot) return;

    const data = await fetchPeerSignal(d.eventId, role);
    if (!data || !Array.isArray(data.choices) || data.choices.length === 0) {
      slot.innerHTML = `<div class="dec-empty mono">PEER · 暂无样本</div>`;
      return;
    }
    const yourIdx = parseInt(row.dataset.choiceIdx, 10);
    const maxPct = Math.max(...data.choices.map(c => c.pct));
    const maxHsPct = Math.max(...data.choices.map(c => c.highScorePct));
    const sourceLabel = data.source === 'real' ? '真实分布'
      : data.source === 'mixed' ? `混合分布 · ${data.samples}样本`
      : '设计师推演';

    slot.innerHTML = `
      <div class="dec-source mono">${escapeHtml(sourceLabel)}</div>
      ${data.choices.map(c => {
        const isYou = c.idx === yourIdx;
        const isHot = c.pct === maxPct;
        const isHsTop = c.highScorePct === maxHsPct;
        const tags = [];
        if (isHot) tags.push(`<span class="dec-tag hot">最热门</span>`);
        if (isHsTop) tags.push(`<span class="dec-tag hs">高分爱选</span>`);
        return `
          <div class="dec-bar-row ${isYou ? 'you' : ''}">
            <span class="dec-bar-key mono">${String.fromCharCode(65 + c.idx)}${isYou ? ' · 你' : ''}</span>
            <div class="dec-bar"><i style="width:${c.pct}%"></i></div>
            <span class="dec-bar-stats mono">
              ${c.pct}% <span class="dim">· 高分 ${c.highScorePct}% · 存活 ${c.survivedPct}%</span>
              <span class="dec-archetype">${escapeHtml(c.archetype)}</span>
            </span>
            ${tags.join('')}
          </div>
        `;
      }).join('')}
    `;
  }));
}

// ───────────────────────────────────────────────
// AI 战后画像：UI 壳 + 异步加载
// ───────────────────────────────────────────────

function renderPortraitShell() {
  return `
    <div class="portrait-card" id="portrait-card">
      <div class="portrait-head">
        <div class="portrait-title">
          <span class="portrait-ax">◆</span>
          <span>战后画像</span>
          <span class="portrait-sub">AI · 基于你这局的所有决策</span>
        </div>
        <div class="portrait-meta" id="portrait-meta">
          <span class="portrait-loading mono">分析中…</span>
        </div>
      </div>
      <div class="portrait-body" id="portrait-body">
        <div class="portrait-skeleton">
          <div class="sk-line"></div>
          <div class="sk-line"></div>
          <div class="sk-line"></div>
          <div class="sk-line short"></div>
          <div class="sk-gap"></div>
          <div class="sk-line"></div>
          <div class="sk-line"></div>
          <div class="sk-line short"></div>
        </div>
      </div>
      <div class="portrait-actions" id="portrait-actions" style="display:none">
        <button class="portrait-retry mono" id="btn-portrait-retry" type="button">重新生成</button>
      </div>
    </div>
  `;
}

async function loadPortrait(callbacks, force = false) {
  const body = document.getElementById('portrait-body');
  const meta = document.getElementById('portrait-meta');
  const actions = document.getElementById('portrait-actions');
  if (!body || !meta) return;

  // 重置为加载态
  body.innerHTML = `
    <div class="portrait-skeleton">
      <div class="sk-line"></div>
      <div class="sk-line"></div>
      <div class="sk-line"></div>
      <div class="sk-line short"></div>
      <div class="sk-gap"></div>
      <div class="sk-line"></div>
      <div class="sk-line"></div>
      <div class="sk-line short"></div>
    </div>
  `;
  meta.innerHTML = `<span class="portrait-loading mono">分析中…</span>`;
  if (actions) actions.style.display = 'none';

  let result;
  try {
    result = await callbacks.onPortraitFetch(force);
  } catch (err) {
    console.warn('Portrait fetch threw:', err);
    result = { ok: false, error: err?.message || '未知错误' };
  }

  if (!result || result.ok === false) {
    body.innerHTML = `<div class="portrait-error">画像生成失败：${escapeHtml(result?.error || '请稍后重试')}</div>`;
    meta.innerHTML = `<span class="portrait-source err mono">FAILED</span>`;
    if (actions) actions.style.display = 'flex';
    return;
  }

  // 成功 / 兜底，统一渲染
  const paragraphs = String(result.portrait || '').split(/\n\n+/).filter(s => s.trim());
  body.innerHTML = paragraphs.length
    ? paragraphs.map(p => `<p>${escapeHtml(p.trim()).replace(/\n/g, '<br>')}</p>`).join('')
    : `<div class="portrait-error">收到空画像，请重试</div>`;

  meta.innerHTML = portraitSourceBadge(result.source, result.reason, result.cached);
  if (actions) actions.style.display = 'flex';
}

function portraitSourceBadge(source, reason, cached) {
  const cachedTag = cached ? `<span class="portrait-cached mono">缓存</span>` : '';
  if (source === 'deepseek') {
    return `<span class="portrait-source ai mono">AI · DEEPSEEK</span>${cachedTag}`;
  }
  // fallback 各种原因
  let label = '程式化画像';
  if (reason === 'no_api_key') label = '程式化画像（AI 未配置）';
  else if (reason === 'timeout') label = '兜底版本（AI 超时）';
  else if (reason === 'api_error') label = '兜底版本（AI 失败）';
  return `<span class="portrait-source fallback mono">${escapeHtml(label)}</span>${cachedTag}`;
}

// ============================================================
// Share Card — Round 4 Claude Design 落地
// 750 x 1200 canvas，按设计稿 layout 重新绘制
// ============================================================

const SC_PALETTE = {
  bg1: '#0a0e1a',
  bg2: '#10162a',
  bg3: '#161e35',
  text1: '#e6ebf5',
  text2: '#98a3bd',
  text3: '#5b667f',
  text4: '#38415a',
  line: 'rgba(120,140,200,0.12)',
  lineStrong: 'rgba(120,140,200,0.22)',
  ok: '#4caf50',
  warn: '#ffb74d',
  danger: '#ef5350',
  info: '#4fc3f7',
  gold: '#ffd54f',
};

const SC_ROLE_COLOR = { cfo: SC_PALETTE.info, im: SC_PALETTE.gold, gov: SC_PALETTE.danger };
const SC_ROLE_GLYPH = { cfo: 'C', im: 'I', gov: 'G' };
const SC_ROLE_SUB = { cfo: '财务总监模式', im: '投资经理模式', gov: '地方官员模式' };

// ─── 公众号头像 + 二维码预加载（用于分享卡 brand 区）────
// 使用模式：main.js 启动时调一次 preloadBrandAssets()；分享卡生成时直接读 _brandLogoImg / _brandQrImg
// 加载失败 / 未就绪 → 分享卡静默 fallback（logo→伪 QR，QR→空白）
let _brandLogoImg = null;
let _brandLogoPromise = null;
let _brandQrImg = null;
let _brandQrPromise = null;

function loadImageAsset(url) {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => { console.warn(`[brand] ${url} load failed:`, e); resolve(null); };
    img.src = url;
  });
}

export function preloadBrandLogo() {
  if (_brandLogoImg || _brandLogoPromise) return _brandLogoPromise;
  _brandLogoPromise = loadImageAsset('assets/brand-avatar.png').then(img => {
    if (img) _brandLogoImg = img;
    return img;
  });
  return _brandLogoPromise;
}
export function preloadBrandQr() {
  if (_brandQrImg || _brandQrPromise) return _brandQrPromise;
  _brandQrPromise = loadImageAsset('assets/brand-qr.jpg').then(img => {
    if (img) _brandQrImg = img;
    return img;
  });
  return _brandQrPromise;
}
// 一次性预加载两个
export function preloadBrandAssets() {
  preloadBrandLogo();
  preloadBrandQr();
}
// 给 generateShareCard 调用：等所有 brand 资源加载完（最多 timeoutMs ms）
export async function ensureBrandAssets(timeoutMs = 2000) {
  const promises = [_brandLogoPromise, _brandQrPromise].filter(Boolean);
  if (!promises.length) return { logo: _brandLogoImg, qr: _brandQrImg };
  await Promise.race([
    Promise.all(promises),
    new Promise(r => setTimeout(r, timeoutMs)),
  ]);
  return { logo: _brandLogoImg, qr: _brandQrImg };
}
// 兼容旧 API（main.js 早期版本只调 ensureBrandLogo）
export const ensureBrandLogo = ensureBrandAssets;

export function generateShareCard(state, finalScore, options = {}) {
  const canvas = document.createElement('canvas');
  // 2x DPR：物理像素 1500×2400，但绘制坐标系仍是 750×1200
  // 用户保存 PNG 后在 retina / 手机上看不会糊
  const DPR = 2;
  canvas.width = 750 * DPR;
  canvas.height = 1200 * DPR;
  const ctx = canvas.getContext('2d');
  ctx.scale(DPR, DPR);

  // options.headline = { headline: 'xxx', body: 'xxx' } —— 由 main.js 在结束页预先 fetch 缓存
  const headline = options.headline || null;

  const roleId = state.origin?.role || state.role?.id || 'cfo';
  const roleColor = SC_ROLE_COLOR[roleId];
  const pass = !!state.survived;
  const grade = finalScore.grade.grade;
  const gradeLabel = GRADE_LABELS_BY_ROLE[roleId]?.[grade] || finalScore.grade.label;
  const quote = GRADE_QUOTES[grade] || '';
  const dimEntries = Object.entries(finalScore.dimensions || {});
  const platformName = state.origin?.platformName || '未命名机构';
  const directorName = state.origin?.directorName || '匿名';
  const quartersPassed = state.quartersPassed || 0;
  const failureColor = SC_PALETTE.danger;

  // ───── 1. 背景：径向渐变（顶部 role 色 + 底部金色） ─────
  // 主底色
  ctx.fillStyle = SC_PALETTE.bg1;
  ctx.fillRect(0, 0, 750, 1200);

  // 顶部 role glow
  const topGrad = ctx.createRadialGradient(375, 0, 0, 375, 0, 600);
  topGrad.addColorStop(0, hexToRgba(pass ? roleColor : failureColor, 0.18));
  topGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, 750, 700);

  // 底部金色微辉
  const botGrad = ctx.createRadialGradient(375, 1200, 0, 375, 1200, 600);
  botGrad.addColorStop(0, 'rgba(255,213,79,0.06)');
  botGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = botGrad;
  ctx.fillRect(0, 600, 750, 600);

  // 网格背景（淡）
  ctx.strokeStyle = 'rgba(120,140,200,0.03)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= 750; x += 50) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 1200); ctx.stroke();
  }
  for (let y = 0; y <= 1200; y += 50) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(750, y); ctx.stroke();
  }

  // 内描边
  ctx.strokeStyle = SC_PALETTE.lineStrong;
  ctx.lineWidth = 1;
  ctx.strokeRect(16.5, 16.5, 717, 1167);

  // ───── 2. 顶栏：brand + stamp ─────
  const padX = 48;
  const topY = 68;
  // logo block
  ctx.strokeStyle = roleColor;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(padX + 0.5, topY - 24, 32, 32);
  ctx.shadowColor = roleColor;
  ctx.shadowBlur = 12;
  ctx.fillStyle = roleColor;
  ctx.font = '700 20px "SF Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(SC_ROLE_GLYPH[roleId], padX + 16, topY - 8);
  ctx.shadowBlur = 0;
  // logo text
  ctx.fillStyle = SC_PALETTE.text1;
  ctx.font = '600 22px "SF Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText('搞 债', padX + 42, topY - 8);
  // sub
  ctx.fillStyle = SC_PALETTE.text2;
  ctx.font = '14px "SF Mono", monospace';
  ctx.fillText(`/ ${SC_ROLE_SUB[roleId]} · S5`, padX + 42, topY + 16);

  // stamp (右上)
  const stampX = 750 - padX;
  ctx.textAlign = 'right';
  // PASS / FAIL badge
  const badgeText = pass ? 'PASS' : 'FAILED';
  const badgeColor = pass ? SC_PALETTE.ok : SC_PALETTE.danger;
  const badgeBg = pass ? 'rgba(76,175,80,0.12)' : 'rgba(239,83,80,0.16)';
  ctx.font = '700 13px "SF Mono", monospace';
  const badgeWidth = ctx.measureText(badgeText).width + 18;
  ctx.fillStyle = badgeBg;
  ctx.fillRect(stampX - badgeWidth, topY - 28, badgeWidth, 22);
  ctx.strokeStyle = pass ? 'rgba(76,175,80,0.5)' : 'rgba(239,83,80,0.55)';
  ctx.strokeRect(stampX - badgeWidth + 0.5, topY - 27.5, badgeWidth - 1, 21);
  ctx.fillStyle = badgeColor;
  ctx.fillText(badgeText, stampX - 10, topY - 12);
  // 时间 + ID
  ctx.fillStyle = SC_PALETTE.text3;
  ctx.font = '11px "SF Mono", monospace';
  ctx.fillText(formatNowDateStr(), stampX, topY + 6);
  ctx.fillText(`SAVE-${roleId.toUpperCase()}-Q${quartersPassed}`, stampX, topY + 22);

  // ───── 3. 中央巨大评级 ─────
  const gradeY = 280;
  ctx.shadowColor = pass ? roleColor : failureColor;
  ctx.shadowBlur = 36;
  ctx.fillStyle = pass ? roleColor : failureColor;
  ctx.font = '600 240px "SF Mono", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(grade, padX + 8, gradeY);
  ctx.shadowBlur = 0;

  // 十字准星装饰
  const crossSize = 26;
  ctx.strokeStyle = pass ? roleColor : failureColor;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 1.5;
  // top-left
  ctx.beginPath();
  ctx.moveTo(padX, gradeY - 110); ctx.lineTo(padX, gradeY - 110 + crossSize);
  ctx.moveTo(padX, gradeY - 110); ctx.lineTo(padX + crossSize, gradeY - 110);
  ctx.stroke();
  // bottom-right of grade letter (rough)
  const gradeWidth = ctx.measureText ? 160 : 160;
  ctx.beginPath();
  ctx.moveTo(padX + gradeWidth + crossSize, gradeY + 90); ctx.lineTo(padX + gradeWidth + crossSize, gradeY + 90 - crossSize);
  ctx.moveTo(padX + gradeWidth + crossSize, gradeY + 90); ctx.lineTo(padX + gradeWidth + crossSize - crossSize, gradeY + 90);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // grade label + quote (右侧)
  const labelX = padX + 220;
  const labelMaxW = 750 - labelX - padX;
  // label
  ctx.fillStyle = SC_PALETTE.text1;
  ctx.font = '600 30px "PingFang SC", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(gradeLabel, labelX, gradeY - 60);
  // quote 左竖条 + 文本（多行）
  const quoteY = gradeY - 10;
  ctx.fillStyle = pass ? roleColor : failureColor;
  ctx.fillRect(labelX, quoteY, 2, 76);
  ctx.fillStyle = SC_PALETTE.text2;
  ctx.font = '13px "SF Mono", monospace';
  drawWrappedText(ctx, quote, labelX + 12, quoteY + 6, labelMaxW - 12, 22);

  // ───── 4. 总分行 + 平台 / 存活 pill ─────
  const scoreBoxY = 480;
  const scoreBoxH = 96;
  ctx.fillStyle = SC_PALETTE.bg2;
  ctx.fillRect(padX, scoreBoxY, 750 - padX * 2, scoreBoxH);
  ctx.strokeStyle = SC_PALETTE.lineStrong;
  ctx.strokeRect(padX + 0.5, scoreBoxY + 0.5, 750 - padX * 2 - 1, scoreBoxH - 1);
  // 总分
  ctx.fillStyle = SC_PALETTE.text3;
  ctx.font = '11px "SF Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText('总分（满分 100）'.toUpperCase ? '总分（满分 100）' : '总分', padX + 22, scoreBoxY + 18);
  ctx.fillStyle = SC_PALETTE.text1;
  ctx.font = '500 64px "SF Mono", monospace';
  ctx.fillText(String(finalScore.total), padX + 22, scoreBoxY + 38);
  ctx.fillStyle = SC_PALETTE.text3;
  ctx.font = '24px "SF Mono", monospace';
  const totalW = ctx.measureText(String(finalScore.total)).width;
  // 重新计算实际位置
  ctx.font = '500 64px "SF Mono", monospace';
  const numW = ctx.measureText(String(finalScore.total)).width;
  ctx.font = '24px "SF Mono", monospace';
  ctx.fillText('/100', padX + 22 + numW + 2, scoreBoxY + 56);

  // ── 右侧两个 pill：等宽对齐（取较宽者），右对齐 ──
  // 旧 bug：两个 pill 各自按内容宽度算，导致左边参差不齐
  const pillRightX = 750 - padX - 22;

  // 先测两个 pill 各自的"自然宽度"
  const platformDisplay = platformName.length > 10 ? platformName.slice(0, 10) + '…' : platformName;
  const pillTxt1Display = `${directorName} · ${platformDisplay}`;
  ctx.font = '600 12px "SF Mono", monospace';
  const pill1W = ctx.measureText(pillTxt1Display).width + 36;  // 36 = 左 dot 24 + 右 padding 12
  ctx.font = '12px "SF Mono", monospace';
  const pillTxt2 = `存活 ${quartersPassed}/12 季度 · ${pass ? '通关' : '中途失败'}`;
  const pill2W = ctx.measureText(pillTxt2).width + 24;  // 24 = 左右各 12
  // 取较宽者作为统一宽度
  const pillW = Math.max(pill1W, pill2W);
  const pillLeftX = pillRightX - pillW;

  // ── pill 1（角色 + 平台），role 色弱化底 + role 边框 ──
  ctx.fillStyle = hexToRgba(roleColor, 0.10);
  ctx.fillRect(pillLeftX, scoreBoxY + 18, pillW, 24);
  ctx.strokeStyle = hexToRgba(roleColor, 0.45);
  ctx.lineWidth = 1;
  ctx.strokeRect(pillLeftX + 0.5, scoreBoxY + 18.5, pillW - 1, 23);
  // role dot
  ctx.fillStyle = roleColor;
  ctx.shadowColor = roleColor;
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.arc(pillLeftX + 14, scoreBoxY + 30, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  // 文本
  const pillMidY = scoreBoxY + 30;
  ctx.fillStyle = roleColor;
  ctx.font = '600 12px "SF Mono", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(directorName, pillLeftX + 24, pillMidY);
  const dnW = ctx.measureText(directorName).width;
  ctx.fillStyle = SC_PALETTE.text2;
  ctx.font = '12px "SF Mono", monospace';
  ctx.fillText(' · ' + platformDisplay, pillLeftX + 24 + dnW, pillMidY);

  // ── pill 2（存活 + 通关），金色边 ──
  ctx.fillStyle = 'rgba(255,213,79,0.08)';
  ctx.fillRect(pillLeftX, scoreBoxY + 50, pillW, 24);
  ctx.strokeStyle = 'rgba(255,213,79,0.45)';
  ctx.strokeRect(pillLeftX + 0.5, scoreBoxY + 50.5, pillW - 1, 23);
  const pill2MidY = scoreBoxY + 62;
  ctx.font = '12px "SF Mono", monospace';
  ctx.fillStyle = SC_PALETTE.text2;
  ctx.fillText('存活 ', pillLeftX + 12, pill2MidY);
  const t1W = ctx.measureText('存活 ').width;
  ctx.fillStyle = SC_PALETTE.gold;
  ctx.font = '600 12px "SF Mono", monospace';
  ctx.fillText(`${quartersPassed}/12`, pillLeftX + 12 + t1W, pill2MidY);
  const t2W = ctx.measureText(`${quartersPassed}/12`).width;
  ctx.fillStyle = SC_PALETTE.text2;
  ctx.font = '12px "SF Mono", monospace';
  ctx.fillText(` 季度 · ${pass ? '通关' : '中途失败'}`, pillLeftX + 12 + t1W + t2W, pill2MidY);
  // 重置 textBaseline 防影响后续绘制
  ctx.textBaseline = 'alphabetic';

  // ───── 5. 六维 grid（2x3） ─────
  const dimsY = 612;
  const dimGridW = 750 - padX * 2;
  const dimW = (dimGridW - 1) / 2;
  const dimH = 88;
  // 网格背景
  ctx.fillStyle = SC_PALETTE.bg2;
  ctx.fillRect(padX, dimsY, dimGridW, dimH * 3 + 2);
  ctx.strokeStyle = SC_PALETTE.lineStrong;
  ctx.strokeRect(padX + 0.5, dimsY + 0.5, dimGridW - 1, dimH * 3 + 1);

  dimEntries.forEach(([name, v], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cellX = padX + col * (dimW + 1) + (col === 1 ? 1 : 0);
    const cellY = dimsY + row * (dimH + 1) + (row > 0 ? 1 : 0);
    const score = Math.round(v);
    const tier = score >= 85 ? 'S' : score >= 70 ? 'A' : score >= 55 ? 'B' : score >= 40 ? 'C' : 'D';
    const tierColor = score >= 70 ? roleColor : score >= 40 ? SC_PALETTE.warn : SC_PALETTE.danger;

    // row1: name + score
    ctx.fillStyle = SC_PALETTE.text1;
    ctx.font = '500 15px "PingFang SC", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(name, cellX + 18, cellY + 14);
    // score 大字
    ctx.fillStyle = SC_PALETTE.text1;
    ctx.font = '500 22px "SF Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(String(score), cellX + dimW - 18 - 22, cellY + 12);
    ctx.fillStyle = SC_PALETTE.text3;
    ctx.font = '12px "SF Mono", monospace';
    ctx.fillText('/100', cellX + dimW - 18, cellY + 18);

    // bar
    const barX = cellX + 18, barY = cellY + 46, barW = dimW - 36, barH = 6;
    ctx.fillStyle = 'rgba(120,140,200,0.10)';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.shadowColor = roleColor;
    ctx.shadowBlur = 8;
    ctx.fillStyle = roleColor;
    ctx.fillRect(barX, barY, Math.max(2, barW * score / 100), barH);
    ctx.shadowBlur = 0;

    // row2: DIM-NN + 评级
    ctx.fillStyle = SC_PALETTE.text3;
    ctx.font = '11px "SF Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`DIM-${String(i + 1).padStart(2, '0')}`, cellX + 18, cellY + 62);
    ctx.fillStyle = tierColor;
    ctx.font = '600 11px "SF Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`评级 ${tier}`, cellX + dimW - 18, cellY + 62);
  });

  // 网格分隔线
  ctx.strokeStyle = SC_PALETTE.line;
  ctx.beginPath();
  ctx.moveTo(padX + dimW, dimsY); ctx.lineTo(padX + dimW, dimsY + dimH * 3);
  ctx.moveTo(padX, dimsY + dimH); ctx.lineTo(padX + dimGridW, dimsY + dimH);
  ctx.moveTo(padX, dimsY + dimH * 2); ctx.lineTo(padX + dimGridW, dimsY + dimH * 2);
  ctx.stroke();

  // ───── 5.5 战报标题区（AI 写的爆款体）─────
  // 位置：dim 网格底部 (876) → QR 顶 (1040)，160px 高
  if (headline && (headline.headline || headline.body)) {
    const hY = 894;  // dim 底 876 + 18px 间距
    const hH = 152;
    // 半透明卡底（带 role 色细边）
    ctx.fillStyle = 'rgba(255,213,79,0.04)';
    ctx.fillRect(padX, hY, 750 - padX * 2, hH);
    ctx.strokeStyle = 'rgba(255,213,79,0.32)';
    ctx.lineWidth = 1;
    ctx.strokeRect(padX, hY, 750 - padX * 2, hH);
    // 角标「AI · 战报」
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = SC_PALETTE.gold;
    ctx.font = '600 10px "SF Mono", monospace';
    ctx.fillText('◢ AI · 战报', padX + 18, hY + 14);
    // 标题（大字最多 2 行）
    ctx.fillStyle = SC_PALETTE.text1;
    ctx.font = '700 19px "PingFang SC", system-ui, sans-serif';
    drawWrappedText(ctx, headline.headline || '', padX + 18, hY + 36, 750 - padX * 2 - 36, 26, 2);
    // 正文（最多 3 行；超出截断 + …）
    if (headline.body) {
      ctx.fillStyle = SC_PALETTE.text2;
      ctx.font = '400 13px "PingFang SC", system-ui, sans-serif';
      drawWrappedText(ctx, headline.body, padX + 18, hY + 88, 750 - padX * 2 - 36, 19, 3);
    }
  }

  // ───── 6. 底部：左下 logo + 中间 watermark + 右下真二维码 ─────
  const footY = headline ? 1064 : 950;  // 有 headline 时下移给标题让位
  const blockSize = 96;
  const logoX = padX, logoY = footY;
  const qrX = 750 - padX - blockSize, qrY = footY;

  // 6a) 左下圆形 logo
  if (_brandLogoImg) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(logoX + blockSize / 2, logoY + blockSize / 2, blockSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(_brandLogoImg, logoX, logoY, blockSize, blockSize);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(logoX + blockSize / 2, logoY + blockSize / 2, blockSize / 2, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,213,79,0.55)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else {
    // Fallback：白底伪 QR（logo 加载失败时仍能出图）
    ctx.fillStyle = '#fff';
    ctx.fillRect(logoX, logoY, blockSize, blockSize);
    drawFakeQR(ctx, logoX + 8, logoY + 8, 80);
  }

  // 6b) 右下真二维码（白底 + 留 6px 描边给扫码可靠性）
  if (_brandQrImg) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(qrX - 4, qrY - 4, blockSize + 8, blockSize + 8);
    ctx.drawImage(_brandQrImg, qrX, qrY, blockSize, blockSize);
  }

  // 6c) 中间 watermark 区（左右各空 110，约 320px 宽）
  const textX = logoX + 110;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  // row1: 搞债公众号 出品 · BOND·SURVIVE
  ctx.fillStyle = SC_PALETTE.text1;
  ctx.font = '500 14px "SF Mono", monospace';
  ctx.fillText('搞债公众号 出品 · ', textX, logoY + 14);
  const wm1W = ctx.measureText('搞债公众号 出品 · ').width;
  ctx.fillStyle = SC_PALETTE.gold;
  ctx.font = '600 14px "SF Mono", monospace';
  ctx.fillText('BOND·SURVIVE', textX + wm1W, logoY + 14);
  // row2: 关注公众号 / 扫码入群试玩
  ctx.fillStyle = SC_PALETTE.text2;
  ctx.font = '500 12px "PingFang SC", system-ui, sans-serif';
  ctx.fillText(_brandQrImg ? '长按识别右侧二维码 · 关注公众号' : '关注「搞债」公众号 · 入群试玩',
               textX, logoY + 38);
  // row3: 副标语
  ctx.fillStyle = SC_PALETTE.text3;
  ctx.font = '400 11px "PingFang SC", system-ui, sans-serif';
  ctx.fillText('一边交易，一边发疯。', textX, logoY + 60);
  // row4: stamp ID（精简到一行）
  ctx.fillStyle = SC_PALETTE.text4;
  ctx.font = '10px "SF Mono", monospace';
  ctx.fillText(`ID · ${roleId.toUpperCase()}-${new Date().getFullYear()}-${(finalScore.total * 7 + 13).toString(16).toUpperCase()}  ·  v1.0.4`,
               textX, logoY + 80);

  return canvas.toDataURL('image/png');
}

// ────── 辅助绘制 ──────

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines = Infinity) {
  if (!text) return;
  const chars = text.split('');
  let line = '';
  let curY = y;
  let lineCount = 0;
  for (let i = 0; i < chars.length; i++) {
    const test = line + chars[i];
    if (ctx.measureText(test).width > maxWidth && line.length > 0) {
      // 已经画到最后一行 → 截断 + ellipsis 后退出
      if (lineCount + 1 >= maxLines) {
        const remaining = chars.slice(i).join('');
        const ellipsisLine = remaining.length > 0
          ? truncateText(ctx, line + chars[i] + '…', maxWidth)
          : line;
        ctx.fillText(ellipsisLine, x, curY);
        return;
      }
      ctx.fillText(line, x, curY);
      line = chars[i];
      curY += lineHeight;
      lineCount++;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, curY);
}

function truncateText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(cut + '…').width > maxWidth) {
    cut = cut.slice(0, -1);
  }
  return cut + '…';
}

// 画一个 21x21 的伪 QR（只是装饰，不能扫）
function drawFakeQR(ctx, x, y, size) {
  const N = 21;
  const cell = size / N;
  ctx.fillStyle = '#000';
  // seeded random
  let seed = 9133;
  const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const inFinder = (r < 7 && c < 7) || (r < 7 && c > N - 8) || (r > N - 8 && c < 7);
      if (inFinder) continue;
      if (rand() > 0.55) {
        ctx.fillRect(x + c * cell, y + r * cell, cell, cell);
      }
    }
  }
  // 三个 finder 角标
  const finderPositions = [[0, 0], [N - 7, 0], [0, N - 7]];
  for (const [fx, fy] of finderPositions) {
    ctx.fillStyle = '#000';
    ctx.fillRect(x + fx * cell, y + fy * cell, 7 * cell, 7 * cell);
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + (fx + 1) * cell, y + (fy + 1) * cell, 5 * cell, 5 * cell);
    ctx.fillStyle = '#000';
    ctx.fillRect(x + (fx + 2) * cell, y + (fy + 2) * cell, 3 * cell, 3 * cell);
  }
}

export function downloadShareCard(dataUrl, filename) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

// ============================================================
// Leaderboard Modal — Round 4 Claude Design 落地
// 兼容旧签名 renderLeaderboardModal(data, onClose, fetchFn) ；新增第 4 参数 meId
// ============================================================
export function renderLeaderboardModal(leaderboardData, onClose, fetchFn, meId = null) {
  const isMobile = window.innerWidth < 720;
  const host = document.createElement('div');
  host.className = 'lb-host';
  host.id = 'leaderboard-overlay';

  const ROLE_LABEL_SHORT = { cfo: '财务总监', im: '投资经理', gov: '地方官员' };
  // 难度推断：用 region + health 做近似映射
  function difficultyOf(row) {
    const h = row.healthLevel;
    const r = row.regionTier;
    if (h === 'weak' && (r === 'northeast_old' || r === 'west_prefecture')) return '地狱';
    if (h === 'weak') return '困难';
    if (h === 'good' && r === 'east_core') return '新手';
    return '标准';
  }

  // 表格行
  function renderRows(data) {
    if (!data || data.length === 0) {
      return `<tr><td colspan="8" style="text-align:center;padding:48px;color:var(--text-3);font-family:var(--font-mono);letter-spacing:0.06em">暂无记录，等你来创造历史</td></tr>`;
    }
    return data.map(row => {
      const isMe = meId && row.id === meId;
      const rankCls = row.rank === 1 ? 'gold' : row.rank === 2 ? 'silver' : row.rank === 3 ? 'bronze' : '';
      const roleKey = row.role || 'cfo';
      const name = row.nickname || row.directorName || '匿名';
      const diff = difficultyOf(row);
      const qSuffix = row.quartersPassed < 12 ? '<span class="lb-q-status fail">·失</span>' : '';
      return `
        <tr class="${isMe ? 'me' : ''}">
          <td><span class="lb-rank-num ${rankCls}">${row.rank === 1 ? '★ ' : ''}#${String(row.rank).padStart(2, '0')}</span></td>
          <td>
            <span class="lb-role-chip" data-r="${escapeHtml(roleKey)}">
              <span class="dot"></span>${escapeHtml(ROLE_LABEL_SHORT[roleKey] || roleKey)}
            </span>
          </td>
          <td class="col-nick">
            ${escapeHtml(name)}
            ${isMe ? '<span class="me-tag">YOU</span>' : ''}
          </td>
          <td class="col-plat" style="color:var(--text-2)">${escapeHtml(row.platformName || '')}</td>
          <td style="color:var(--text-2)">${escapeHtml(diff)}</td>
          <td><span class="lb-grade-cell ${escapeHtml(row.grade)}">${escapeHtml(row.grade)}</span></td>
          <td class="col-score">${row.score}</td>
          <td class="col-q">${row.quartersPassed}/12${qSuffix}</td>
        </tr>
      `;
    }).join('');
  }

  // 计算 tabs 计数（如果有完整数据可统计；否则只显示标签）
  function tabCount(data, role) {
    if (!Array.isArray(data) || data.length === 0) return '';
    if (role === null) return data.length;
    return data.filter(d => d.role === role).length;
  }

  // 顶部 tabs
  const initData = leaderboardData || [];
  const tabsHtml = [
    { id: 'all', role: null, label: '全部' },
    { id: 'cfo', role: 'cfo', label: '财务总监' },
    { id: 'im',  role: 'im',  label: '投资经理' },
    { id: 'gov', role: 'gov', label: '地方官员' },
  ].map((t, i) => {
    const ct = tabCount(initData, t.role);
    return `<button class="lb-tab ${i === 0 ? 'active' : ''}" data-tab-id="${t.id}" data-role="${t.role || ''}" type="button">
      ${escapeHtml(t.label)} ${ct !== '' ? `<span class="ct">${ct}</span>` : ''}
    </button>`;
  }).join('');

  host.innerHTML = `
    <div class="scrim"></div>
    <div class="lb-modal ${isMobile ? 'mobile' : ''}">
      <div class="lb-rail"></div>
      <div class="lb-head">
        <div class="lt">
          <span class="lb-tag">LB · TOP-20</span>
          <span class="lb-title">排行榜 · Top 20</span>
          ${isMobile ? '' : `<span class="lb-id">${formatNowDateStr()} · S5 赛季</span>`}
        </div>
        <button class="lb-x" id="btn-lb-close" aria-label="关闭" type="button">✕</button>
      </div>
      <div class="lb-tabs">${tabsHtml}</div>
      <div class="lb-tablewrap">
        <table class="lb-table">
          <thead>
            <tr>
              <th class="col-rank">排名</th>
              <th class="col-role">角色</th>
              <th class="col-nick">昵称</th>
              <th class="col-plat">平台</th>
              <th class="col-diff">难度</th>
              <th class="col-grade">评级</th>
              <th class="col-score">总分</th>
              <th class="col-q">存活</th>
            </tr>
          </thead>
          <tbody>${renderRows(initData)}</tbody>
        </table>
      </div>
      <div class="lb-foot">
        <div class="l">
          <span>赛季 <b>S5</b></span>
          <span>·</span>
          <span>共 <b>${initData.length}</b> 条记录</span>
        </div>
        <div class="r">
          ${meId ? `<span>本局已上榜 · <b>YOU</b></span>` : `<span>玩一局留下你的名字</span>`}
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(host);
  document.body.style.overflow = 'hidden';

  const close = () => {
    host.remove();
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onKey);
    if (onClose) onClose();
  };
  host.querySelector('.scrim').addEventListener('click', close);
  host.querySelector('#btn-lb-close').addEventListener('click', close);
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);

  // tabs 切换
  host.querySelectorAll('.lb-tab').forEach(tab => {
    tab.addEventListener('click', async () => {
      host.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      if (!fetchFn) return;
      const role = tab.dataset.role || null;
      const result = await fetchFn(role);
      const data = result?.data || [];
      host.querySelector('tbody').innerHTML = renderRows(data);
      // 更新 footer 计数
      const cnt = host.querySelector('.lb-foot .l b:nth-of-type(2)');
      if (cnt) cnt.textContent = data.length;
    });
  });
}

function formatNowDateStr() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function renderNicknamePrompt(onSubmit, onSkip) {
  const overlay = document.createElement('div');
  overlay.id = 'nickname-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(10,14,26,0.9);z-index:1000;display:flex;align-items:center;justify-content:center';

  overlay.innerHTML = `
    <div class="nickname-card">
      <div class="nickname-title">留下你的大名</div>
      <div class="nickname-subtitle">上榜后其他玩家可以看到（选填）</div>
      <input type="text" id="input-nickname" class="nickname-input" maxlength="20" placeholder="最多20个字符">
      <div class="nickname-actions">
        <button id="btn-nick-submit" class="btn-primary">提交成绩</button>
        <button id="btn-nick-skip" class="btn-secondary">跳过</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  document.getElementById('btn-nick-submit').addEventListener('click', () => {
    const val = document.getElementById('input-nickname').value.trim();
    overlay.remove();
    onSubmit(val || null);
  });
  document.getElementById('btn-nick-skip').addEventListener('click', () => {
    overlay.remove();
    onSkip();
  });
}

// ============================================================
// Toast — Round 3 Claude Design 落地
// 兼容旧签名 showToast(msg, variant, duration) 与新签名 showToast({kind, t1, t2, meta, duration})
// ============================================================
let toastStack = null;
const TOAST_META_DEFAULT = { success: 'OK', error: 'ERR', info: 'INFO' };
const TOAST_ICON = { success: '✓', error: '✕', info: 'i' };

function ensureToastStack() {
  if (toastStack && document.body.contains(toastStack)) return toastStack;
  toastStack = document.createElement('div');
  // 桌面右上角；移动端 CSS @media 自动改成上侧通栏
  toastStack.className = 'toast-stack tr';
  document.body.appendChild(toastStack);
  return toastStack;
}

export function showToast(arg1, variant = 'info', duration = 3500) {
  // 归一化参数：支持旧式 string 与新式 options 对象
  let opts;
  if (typeof arg1 === 'object' && arg1 !== null) {
    opts = arg1;
  } else {
    const msg = String(arg1 || '');
    const lines = msg.split('\n');
    opts = {
      kind: variant,
      t1: lines[0] || '',
      t2: lines.slice(1).join(' · ') || null,
      duration,
    };
  }
  const kind = opts.kind || 'info';
  const meta = opts.meta || TOAST_META_DEFAULT[kind] || 'INFO';
  const t1 = opts.t1 || '';
  const t2 = opts.t2 || null;
  const dur = opts.duration ?? duration ?? 3500;

  const stack = ensureToastStack();
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  const R = 5;
  const len = 2 * Math.PI * R;
  el.innerHTML = `
    <div class="ico">${escapeHtml(TOAST_ICON[kind] || 'i')}</div>
    <div class="body">
      <div class="t1"><span class="meta">${escapeHtml(meta)}</span>${escapeHtml(t1)}</div>
      ${t2 ? `<div class="t2">${escapeHtml(t2)}</div>` : ''}
    </div>
    <div class="timer" aria-hidden="true">
      <svg viewBox="0 0 14 14">
        <circle class="bg" cx="7" cy="7" r="${R}"></circle>
        <circle class="fg" cx="7" cy="7" r="${R}" stroke-dasharray="${len}" stroke-dashoffset="0"></circle>
      </svg>
    </div>
    <button class="x" aria-label="关闭">✕</button>
  `;
  stack.appendChild(el);
  const fg = el.querySelector('circle.fg');
  requestAnimationFrame(() => {
    el.classList.add('show');
    if (fg && dur > 0) {
      fg.style.transition = `stroke-dashoffset ${dur}ms linear`;
      requestAnimationFrame(() => { fg.style.strokeDashoffset = String(len); });
    }
  });

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    el.classList.remove('show');
    el.classList.add('hide');
    setTimeout(() => el.remove(), 280);
  };
  el.querySelector('.x').addEventListener('click', close);
  if (dur > 0) setTimeout(close, dur);
  return close;
}

// 便捷方法（兼容旧调用）
export const toast = {
  success: (msg, duration) => showToast(msg, 'success', duration),
  error: (msg, duration) => showToast(msg, 'error', duration),
  info: (msg, duration) => showToast(msg, 'info', duration),
};

// ============================================================
// 操作输入 Modal（替代 prompt()）— Plan 5 Round 3
// ============================================================

/**
 * 弹出操作输入 Modal — Round 3 Claude Design 落地（opmodal 终端交易确认风）
 * @param {object} action {id, name, desc, params: [{key, label, min, max, step, default}]}
 * @param {function} previewFn (params) => string  可选：根据当前 params 计算预计影响文案
 * @returns {Promise<object|null>}
 */
export function renderActionModal(action, previewFn) {
  return new Promise(resolve => {
    // 嗅探当前 role（用于 opm-tag 与配色）
    const roleId = document.querySelector('.ui[data-role]')?.dataset.role || 'cfo';
    const roleCode = ROLE_CODES[roleId] || 'OPS';
    const isMobile = window.innerWidth < 720;
    const opId = `OP-${new Date().getFullYear()}Q${Math.ceil((new Date().getMonth() + 1) / 3)}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`;

    const host = document.createElement('div');
    host.className = 'overlay-host';
    host.dataset.role = roleId;

    // 渲染参数：每个 param 一组 .opm-input
    const paramFieldsHtml = (action.params || []).map((p, idx) => {
      const id = `opm-p-${p.key}`;
      const hasRange = Number.isFinite(p.min) && Number.isFinite(p.max);
      const def = p.default ?? p.min ?? 0;
      const step = p.step ?? 0.1;
      const ticks = hasRange ? buildTicks(p.min, p.max) : [];
      // unit 推断：label 末尾"（亿）/(亿元)"
      const unitMatch = String(p.label || '').match(/[（(]([^）)]+)[)）]/);
      const unit = unitMatch ? unitMatch[1] : '';
      const labelClean = unit ? p.label.replace(/[（(][^）)]+[)）]/, '').trim() : p.label;

      return `
        <div class="opm-input">
          <div class="opm-input-row">
            <span class="opm-label">${escapeHtml(labelClean)}</span>
            ${hasRange ? `<span class="opm-hint">范围 <b>${p.min} – ${p.max}</b> · 步长 ${step}</span>` : ''}
          </div>
          <div class="opm-numwrap">
            <input type="number" class="opm-num" id="${id}" data-key="${p.key}"
              value="${def}" min="${p.min ?? ''}" max="${p.max ?? ''}" step="${step}">
            <span class="opm-caret"></span>
            ${unit ? `<span class="opm-unit">${escapeHtml(unit)}</span>` : ''}
          </div>
          ${hasRange ? `
            <div class="opm-slider">
              <div class="opm-slider-track" data-track-for="${id}">
                <div class="opm-slider-rail"></div>
                <div class="opm-slider-fill"></div>
                <div class="opm-slider-knob"></div>
                <input type="range" class="opm-slider-input" data-slider-for="${id}"
                  value="${def}" min="${p.min}" max="${p.max}" step="${step}">
              </div>
              <div class="opm-slider-ticks">
                ${ticks.map(t => `<span data-tick="${t}">${t}</span>`).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    host.innerHTML = `
      <div class="scrim"></div>
      <div class="opmodal ${isMobile ? 'mobile' : ''}">
        <div class="opm-rail"></div>
        <div class="opm-head">
          <div class="lh">
            <span class="opm-tag">${escapeHtml(roleCode)} · OPS</span>
            <span class="opm-id">${escapeHtml(opId)}</span>
          </div>
          <button class="opm-x" aria-label="关闭" type="button">✕</button>
        </div>
        <div class="opm-title">${escapeHtml(action.name)}</div>
        ${action.desc ? `<div class="opm-desc">${annotate(escapeHtml(action.desc))}</div>` : ''}
        <div class="opm-body">
          ${paramFieldsHtml}
          <div class="opm-impact">
            <div class="opm-impact-head">
              <span class="ax">▶ 预计影响</span>
              <span class="meta">基于当前局面模拟</span>
            </div>
            <div class="opm-impact-rows" id="opm-impact-rows">
              <div class="opm-impact-row"><span class="k">调整数值</span><span class="arrow">→</span><span class="v">实时预览</span></div>
            </div>
          </div>
        </div>
        <div class="opm-foot">
          <button class="opm-btn opm-cancel" type="button">取消 <span class="kbd">ESC</span></button>
          <button class="opm-btn primary opm-confirm" type="button">
            <span class="arr">▶</span> 确认执行 <span class="kbd">⏎</span>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(host);

    // 收集 params
    const collect = () => {
      const out = {};
      host.querySelectorAll('.opm-num').forEach(inp => {
        const v = parseFloat(inp.value);
        if (Number.isFinite(v)) out[inp.dataset.key] = v;
      });
      return out;
    };

    // 同步 input/slider/knob/fill/tick active
    const syncSlider = (id) => {
      const inp = host.querySelector(`#${id}`);
      const sliderInput = host.querySelector(`[data-slider-for="${id}"]`);
      const track = host.querySelector(`[data-track-for="${id}"]`);
      if (!inp || !sliderInput || !track) return;
      // 用 inp 的当前值同步 slider
      const v = parseFloat(inp.value);
      const min = parseFloat(sliderInput.min);
      const max = parseFloat(sliderInput.max);
      const pct = ((v - min) / (max - min)) * 100;
      sliderInput.value = v;
      const fill = track.querySelector('.opm-slider-fill');
      const knob = track.querySelector('.opm-slider-knob');
      if (fill) fill.style.width = Math.max(0, Math.min(100, pct)) + '%';
      if (knob) knob.style.left = Math.max(0, Math.min(100, pct)) + '%';
      // tick active
      const ticksRow = track.parentElement.querySelector('.opm-slider-ticks');
      if (ticksRow) {
        ticksRow.querySelectorAll('span').forEach(t => {
          const tv = parseFloat(t.dataset.tick);
          t.classList.toggle('active', Math.abs(tv - v) < (parseFloat(sliderInput.step) || 0.1) * 2);
        });
      }
    };

    // 刷新预计影响：解析 previewFn 返回的字符串
    const refreshPreview = () => {
      const slot = document.getElementById('opm-impact-rows');
      if (!slot || typeof previewFn !== 'function') return;
      let txt = '';
      try { txt = previewFn(collect()); } catch (e) { /* 静默 */ }
      slot.innerHTML = parseImpactText(txt);
    };

    // 初始 sync + bind
    host.querySelectorAll('.opm-num').forEach(inp => {
      const id = inp.id;
      syncSlider(id);
      inp.addEventListener('input', () => { syncSlider(id); refreshPreview(); });
    });
    host.querySelectorAll('.opm-slider-input').forEach(slider => {
      const id = slider.dataset.sliderFor;
      const inp = host.querySelector(`#${id}`);
      slider.addEventListener('input', () => {
        if (inp) inp.value = slider.value;
        syncSlider(id);
        refreshPreview();
      });
    });
    refreshPreview();

    // 关闭
    const close = (result) => {
      document.removeEventListener('keydown', onKey);
      host.remove();
      resolve(result);
    };
    host.querySelector('.opm-x').addEventListener('click', () => close(null));
    host.querySelector('.opm-cancel').addEventListener('click', () => close(null));
    host.querySelector('.opm-confirm').addEventListener('click', () => {
      const params = collect();
      for (const p of action.params || []) {
        const v = params[p.key];
        if (!Number.isFinite(v)) return showToast(`${p.label} 必须是数字`, 'error');
        if (Number.isFinite(p.min) && v < p.min) return showToast(`${p.label} 不能小于 ${p.min}`, 'error');
        if (Number.isFinite(p.max) && v > p.max) return showToast(`${p.label} 不能大于 ${p.max}`, 'error');
      }
      close(params);
    });

    const onKey = (e) => {
      if (e.key === 'Escape') close(null);
      else if (e.key === 'Enter' && document.activeElement?.classList.contains('opm-num')) {
        host.querySelector('.opm-confirm')?.click();
      }
    };
    document.addEventListener('keydown', onKey);

    requestAnimationFrame(() => {
      const first = host.querySelector('.opm-num');
      if (first) { first.focus(); first.select(); }
    });
  });
}

// 给 slider 生成 5-6 个 tick 标记
function buildTicks(min, max) {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return [];
  const span = max - min;
  // 选一个合适的 step：让 tick 数 4-6 个
  const candidates = [0.5, 1, 2, 5, 10];
  let step = 1;
  for (const c of candidates) {
    if (span / c <= 6 && span / c >= 3) { step = c; break; }
  }
  const out = [];
  for (let v = min; v <= max + 0.001; v += step) {
    out.push(Number.isInteger(v) ? v : parseFloat(v.toFixed(1)));
  }
  if (out[out.length - 1] !== max && out.length < 7) out.push(max);
  return out.slice(0, 7);
}

// 把 previewFn 返回的"预计：现金 +1.50，授信 -1.50，..."拆成 .opm-impact-row
function parseImpactText(txt) {
  if (!txt) return '<div class="opm-impact-row"><span class="k">调整数值</span><span class="arrow">→</span><span class="v">实时预览</span></div>';
  const cleaned = String(txt).replace(/^预计[：:]\s*/, '');
  // 分隔符：中文逗号 / 英文逗号 / 顿号
  const items = cleaned.split(/[，,、]/).map(s => s.trim()).filter(Boolean);
  if (items.length === 0) {
    return `<div class="opm-impact-row"><span class="k">${escapeHtml(cleaned)}</span></div>`;
  }
  return items.slice(0, 5).map(item => {
    // 形如 "现金 +1.50" / "授信使用率 -3.00%"
    const m = item.match(/^(.+?)\s+([+\-−]?\d[\d.,]*\s*\S*)$/);
    if (!m) {
      return `<div class="opm-impact-row"><span class="k">${escapeHtml(item)}</span></div>`;
    }
    const k = m[1];
    const v = m[2];
    let tone = '';
    if (/^[+]/.test(v)) tone = 'up';
    else if (/^[-−]/.test(v)) tone = 'down';
    return `
      <div class="opm-impact-row">
        <span class="k">${escapeHtml(k)}</span>
        <span class="arrow">→</span>
        <span class="v ${tone}">${escapeHtml(v)}</span>
      </div>
    `;
  }).join('');
}
