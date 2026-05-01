// js/ui.js
import { renderRadarChart } from './charts.js';

const REGION_LABELS = {
  east_core: '东部核心', central_capital: '中部省会',
  west_prefecture: '西部地级市', northeast_old: '东北老工业区'
};
const HEALTH_LABELS = { good: '财务健康', medium: '财务一般', weak: '财务承压' };
const ROLE_LABELS = { cfo: '财务总监', im: '投资经理', gov: '地方官员' };
const ROLE_CODES = { cfo: 'CFO', im: 'PM', gov: 'GOV' };
const ROLE_ACCENTS = { cfo: '#4fc3f7', im: '#ffd54f', gov: '#ef5350' };

export function renderFateCard(origin, role, onAccept) {
  const app = document.getElementById('app');
  const roleId = origin.role || 'cfo';
  const d = getFateData(origin, role);
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

// 把 origin/role 转成 fate-card 渲染所需的统一数据结构
function getFateData(origin, role) {
  const roleId = origin.role || 'cfo';
  const hints = role?.getOnboardingHints ? role.getOnboardingHints(origin) : null;
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

  // goal: { text, q, suffix }
  const goal = buildGoal(roleId, origin);

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
  return tags.slice(0, 4);
}

function buildGoal(roleId, origin) {
  if (roleId === 'cfo') return { text: '存活', q: 12, suffix: '季度，期末现金不归零' };
  if (roleId === 'im')  return { text: '守住', q: 0.85, suffix: '净值，12 季度不破清盘线' };
  if (roleId === 'gov') return { text: '压降', q: 50, suffix: '个百分点债务率，并完成化债任务' };
  return { text: '存活', q: 12, suffix: '季度' };
}

function buildTip(hint) {
  // 尝试拆分 "第一回合先 X 预留 Y" 模式
  const m = hint.match(/^(.*?)(申请[一-龥]{2,8}|卖出[一-龥]{2,8}|发[一-龥]{2,6}债|调[一-龥]{2,6}|减仓[一-龥]{2,6}|申报[一-龥]{2,8})(.*)$/);
  if (m) return { pre: m[1].trim() + ' ', hl: m[2].trim(), post: ' ' + m[3].trim() };
  // 兜底：整句作为 hl
  return { pre: '第一回合先 ', hl: hint.replace(/^第一回合先?\s*/, '').slice(0, 14), post: '' };
}

function buildRisks(topRisks) {
  // topRisks 通常是 "X → Y" 或 "X，Y" 的字符串，拆成 text + meta
  return topRisks.slice(0, 3).map((r, i) => {
    let text = r, meta = '', danger = i === 0;
    const arrow = r.match(/^(.+?)\s*[→\-]>?\s*(.+)$/);
    if (arrow) { text = arrow[1].trim(); meta = '→ ' + arrow[2].trim(); }
    else {
      const comma = r.match(/^(.+?)[,，]\s*(.+)$/);
      if (comma) { text = comma[1].trim(); meta = comma[2].trim(); }
    }
    return { text, meta, danger };
  });
}

export function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

export function renderMainScreen(state, callbacks) {
  const app = document.getElementById('app');
  const roleId = state.role?.id || state.origin?.role || 'cfo';
  app.innerHTML = `
    <div class="screen active game-screen role-${roleId}" style="--role-accent:${ROLE_ACCENTS[roleId] || ROLE_ACCENTS.cfo}">
      ${renderTopBar(state)}
      ${renderRedemptionBanner(state)}
      <div class="main-grid">
        <div class="col-left">
          ${renderMetricsPanel(state)}
          ${roleId === 'im' ? renderRedemptionCard(state) : ''}
          ${renderGoalCard(state)}
        </div>
        <div class="col-center event-area" id="event-area">
          ${renderEventArea(state)}
          ${renderActionPanel(state)}
          ${renderProjectedPanel(state)}
          ${renderDecisionLog(state)}
        </div>
        <div class="col-right" id="chart-area">${renderChartArea(state)}</div>
      </div>
      ${renderStatusBar(state)}
    </div>
  `;
  bindMainScreenEvents(state, callbacks);
}

// Round 2: 左栏底部"本局目标"小卡（简版 onboarding，不重复挑战）
function renderGoalCard(state) {
  if (!state.role?.getOnboardingHints) return '';
  const hints = state.role.getOnboardingHints(state.origin || {});
  const goal = getGoalDisplay(state, hints);
  const rows = getGoalRows(state);
  return `
    <div class="panel goal-card">
      <div class="panel-title panel-title-row">
        <span><span class="section-mark">◇</span> 本局目标</span>
        <span class="panel-kicker">GOAL</span>
      </div>
      <div class="goal-headline">${escapeHtml(goal.title)}</div>
      <div class="goal-subtitle">${escapeHtml(goal.subtitle)}</div>
      <div class="goal-progress-list">
        ${rows.map(r => `
          <div class="goal-progress-row">
            <div class="goal-progress-meta">
              <span>${escapeHtml(r.label)}</span>
              <strong>${escapeHtml(r.value)}</strong>
            </div>
            <div class="goal-track"><div class="goal-fill ${r.tone || ''}" style="width:${Math.max(0, Math.min(100, r.pct))}%"></div></div>
            ${r.note ? `<div class="goal-note">${escapeHtml(r.note)}</div>` : ''}
          </div>
        `).join('')}
      </div>
      <div class="goal-footer">${escapeHtml(hints.firstActionHint)}</div>
    </div>
  `;
}

// 赎回压力临界 banner（设计稿 §3.11.4）：pressure >= 70 显示警告
function renderRedemptionBanner(state) {
  if (state.role?.id !== 'im') return '';
  const p = state.metrics.redemptionPressure;
  if (!p || p < 70) return '';
  const m = state.metrics;
  const expectedRedeem = getExpectedRedeem(m);
  const cashAvail = getCashAvail(m);
  const gap = expectedRedeem - cashAvail;
  return `
    <div class="redemption-banner">
      <span class="redemption-banner-icon">!</span>
      <span class="redemption-banner-code">REDEEM-${Math.round(p)}</span>
      <strong>赎回压力 ${Math.round(p)}（红区）</strong>
      <span>下周预计净赎回 ${expectedRedeem.toFixed(1)} 亿，现金 ${cashAvail.toFixed(1)} 亿，缺口 ${Math.max(0, gap).toFixed(1)} 亿。</span>
      <em>T+0 · 渠道渗透率 ${Math.min(99, Math.round(70 + p * 0.25))}%</em>
    </div>
  `;
}

function renderTopBar(state) {
  const policyPct = ((state.policyValue + 5) / 10) * 100;
  const policyLabel = getPolicyLabelText(state.policyValue);
  const roleId = state.role?.id || state.origin?.role || 'cfo';
  const roleName = state.role?.shortName || ROLE_LABELS[roleId] || '财务总监';
  const policyClass = state.policyValue < -1 ? 'tight' : (state.policyValue > 1 ? 'loose' : 'neutral');
  return `
    <div class="topbar">
      <div class="topbar-left">
        <span class="role-dot"></span>
        <span class="role-code">${ROLE_CODES[roleId] || 'CFO'}</span>
        <span class="role-name-top">${escapeHtml(roleName)}</span>
        <span class="top-separator"></span>
        <span class="game-id">债市生存</span>
        <span class="quarter-badge">${state.year} Q${state.quarter}</span>
        <span class="round-badge">第 ${state.quartersPassed + 1}/12 回合</span>
      </div>
      <div class="policy-axis">
        <span class="policy-label">政策环境</span>
        <div class="axis-track">
          <div class="axis-fill" style="width:100%"></div>
          <div class="axis-marker" style="left:${policyPct}%"></div>
        </div>
        <div class="axis-labels"><span>严格</span><span>偏紧</span><span>中性</span><span>偏松</span><span>宽松</span></div>
      </div>
      <div class="topbar-right">
        <span class="policy-status ${policyClass}">当前 · ${policyLabel}</span>
        <span class="timer"><strong>${Math.max(0, 2 - state.actionsUsed)}</strong>/2 本回合 · 剩余操作</span>
        <button class="menu-btn" type="button" aria-label="菜单">≡</button>
      </div>
    </div>
  `;
}

function getPolicyLabelText(value) {
  if (value <= -3) return '严格 ↓↓';
  if (value <= -1) return '偏紧 ↓';
  if (value === 0) return '中性 —';
  if (value <= 2) return '偏松 ↑';
  return '宽松 ↑↑';
}

function renderMetricsPanel(state) {
  const m = state.metrics;
  if (state.role?.id !== 'cfo') {
    return renderGenericMetricsPanel(state);
  }
  const due = m.debtMaturity?.[state.quartersPassed] || 0;
  return `
    <div class="panel metric-panel">
      <div class="panel-title panel-title-row">
        <span><span class="section-dot"></span> 我的指标</span>
        <span class="panel-kicker">7 items</span>
      </div>
      <div class="metric-grid">
        ${metricTile('现金 (亿)', m.cash.toFixed(1), '', toneFromClass(cashColor(m.cash)), Math.min(100, m.cash * 10), m.cash < due ? '覆盖不足' : '可覆盖', getTrend(state, 'cash', false))}
        ${metricTile('本季到期 (亿)', due.toFixed(1), '', due > m.cash ? 'bad' : 'warn', Math.min(100, due * 10), `未来合计 ${sumDebt(m.debtMaturity, state.quartersPassed, 4).toFixed(1)}`)}
        ${metricTile('资产负债率', m.leverageRatio.toFixed(1), '%', toneFromClass(levColor(m.leverageRatio)), m.leverageRatio, '监管观察', getTrend(state, 'leverageRatio', true))}
        ${metricTile('授信使用率', Math.round(m.creditUsage), '%', toneFromClass(creditColor(m.creditUsage)), m.creditUsage, `${m.creditUsed?.toFixed?.(1) || '-'} / ${m.creditTotal || '-'}`)}
        ${metricTile('综合融资成本', m.financingCost.toFixed(2), '%', toneFromClass(costColor(m.financingCost)), Math.min(100, m.financingCost * 10), '加权成本', getTrend(state, 'financingCost', true))}
        ${metricTile('可抵押物', collLabel(m.collateralRoom), '', toneFromClass(collColor(m.collateralRoom)), collValue(m.collateralRoom), '剩余空间')}
        ${metricTile('项目缺口 (亿)', m.projectGap.toFixed(1), '', 'bad', Math.min(100, m.projectGap * 12), '刚性支出')}
      </div>
    </div>
  `;
}

// 通用兜底指标面板：CFO 之外角色的入口分发
// IM → renderImMetricsPanel（赎回压力 4 件套）
// GOV → renderGovMetricsPanel（债务率 + 政绩等核心指标）
function renderGenericMetricsPanel(state) {
  if (state.role?.id === 'im') return renderImMetricsPanel(state);
  if (state.role?.id === 'gov') return renderGovMetricsPanel(state);
  const m = state.metrics;
  const role = state.role;
  if (!role) return '';
  const rows = (role.metrics || []).map(key => {
    const val = m[key];
    if (val == null) return '';
    let display;
    if (typeof val === 'number') display = key === 'nav' ? val.toFixed(4) : val.toFixed(2);
    else if (Array.isArray(val)) display = `${val.length} 项`;
    else display = String(val);
    const label = role.metricLabels?.[key] || key;
    return `
      <div class="metric">
        <div class="metric-row">
          <span class="metric-name">${escapeHtml(label)}</span>
          <span class="metric-value">${display}</span>
        </div>
      </div>
    `;
  }).join('');
  return `
    <div class="panel">
      <div class="panel-title">核心指标</div>
      ${rows}
    </div>
  `;
}

// IM 主界面指标面板（Plan 3 §3.7 + §3.11）
function renderImMetricsPanel(state) {
  const m = state.metrics;
  const navColor = m.nav < 0.88 ? 'val-bad' : (m.nav < 0.95 ? 'val-warn' : 'val-ok');
  const navPct = Math.max(0, Math.min(100, (m.nav - 0.85) / 0.20 * 100));
  const concColor = m.concentration > 22 ? 'val-bad' : (m.concentration > 18 ? 'val-warn' : 'val-ok');
  const levColor = m.leverage > 130 ? 'val-bad' : (m.leverage > 115 ? 'val-warn' : 'val-ok');
  const ceColor = m.creditExposure > 40 ? 'val-bad' : (m.creditExposure > 25 ? 'val-warn' : 'val-ok');
  const liquidAssets = getCashAvail(m);
  return `
    <div class="panel metric-panel">
      <div class="panel-title panel-title-row">
        <span><span class="section-dot"></span> 我的指标</span>
        <span class="panel-kicker">6 items</span>
      </div>
      <div class="metric-grid">
        ${metricTile('净值 (NAV)', m.nav.toFixed(3), '', toneFromClass(navColor), navPct, `${(m.nav - 1).toFixed(3)}`, getTrend(state, 'nav', false))}
        ${metricTile('组合久期', m.duration.toFixed(1), 'Y', 'neutral', Math.min(100, m.duration * 14), '利率暴露', getTrend(state, 'duration', false))}
        ${metricTile('AA 及以下', m.creditExposure.toFixed(0), '%', toneFromClass(ceColor), m.creditExposure, '信用敞口', getTrend(state, 'creditExposure', true))}
        ${metricTile('持仓集中度', m.concentration.toFixed(1), '%', toneFromClass(concColor), Math.min(100, m.concentration * 4), '单券上限 25%', getTrend(state, 'concentration', true))}
        ${metricTile('回购杠杆', m.leverage.toFixed(0), '%', toneFromClass(levColor), Math.min(100, (m.leverage - 80) * 1.6), '监管线 140%', getTrend(state, 'leverage', true))}
        ${metricTile('流动性资产', liquidAssets.toFixed(1), '亿', m.cashRatio < 5 ? 'bad' : (m.cashRatio < 10 ? 'warn' : 'ok'), Math.min(100, m.cashRatio * 5), `现金 ${m.cashRatio.toFixed(1)}%`, getTrend(state, 'cashRatio', false))}
      </div>
    </div>
  `;
}

// GOV 主界面指标面板（Plan 4 §8）
function renderGovMetricsPanel(state) {
  const m = state.metrics;
  const debtColor = m.debtRatio > 280 ? 'val-bad' : (m.debtRatio > 250 ? 'val-warn' : 'val-ok');
  const polColor = m.politicalScore < 30 ? 'val-bad' : (m.politicalScore < 45 ? 'val-warn' : 'val-ok');
  const cashColor = m.cash < 1 ? 'val-bad' : (m.cash < 3 ? 'val-warn' : 'val-ok');
  const hiddenColor = m.hiddenDebtRisk > 150 ? 'val-bad' : (m.hiddenDebtRisk > 100 ? 'val-warn' : 'val-ok');
  return `
    <div class="panel metric-panel">
      <div class="panel-title panel-title-row">
        <span><span class="section-dot"></span> 我的指标</span>
        <span class="panel-kicker">7 items</span>
      </div>
      <div class="metric-grid">
        ${metricTile('财政现金 (亿)', m.cash.toFixed(1), '', toneFromClass(cashColor), Math.min(100, m.cash * 4), '本季可用', getTrend(state, 'cash', false))}
        ${metricTile('综合债务率', m.debtRatio.toFixed(0), '%', toneFromClass(debtColor), Math.min(100, (m.debtRatio - 150) / 1.5), '红线 300%', getTrend(state, 'debtRatio', true))}
        ${metricTile('隐债债务 (亿)', m.hiddenDebtRisk.toFixed(0), '', toneFromClass(hiddenColor), Math.min(100, m.hiddenDebtRisk / 2), '巡查风险', getTrend(state, 'hiddenDebtRisk', true))}
        ${metricTile('政绩评分', Math.round(m.politicalScore), '/100', toneFromClass(polColor), m.politicalScore, '免职线 20', getTrend(state, 'politicalScore', false))}
        ${metricTile('专项债额度', m.specialBondQuota.toFixed(0), '亿', m.specialBondQuota < 5 ? 'warn' : 'ok', Math.min(100, m.specialBondQuota * 4), '可置换', getTrend(state, 'specialBondQuota', false))}
        ${metricTile('产业指数', Math.round(m.industryIndex), '', m.industryIndex < 30 ? 'warn' : 'ok', m.industryIndex, '发展动能', getTrend(state, 'industryIndex', false))}
        ${metricTile('财政收入 (亿)', m.fiscalRevenue.toFixed(0), '', 'neutral', Math.min(100, m.fiscalRevenue / 3), '年度口径')}
      </div>
    </div>
  `;
}

// 赎回压力卡片（设计稿 §3.11）：进度条 + 下季预期赎回 + 现金缺口预警
function renderRedemptionCard(state) {
  const m = state.metrics;
  const pressure = Math.round(m.redemptionPressure);
  const expectedRedeem = getExpectedRedeem(m);
  const cashAvail = getCashAvail(m);
  const gap = expectedRedeem - cashAvail;
  const color = pressure >= 80 ? '#ef5350' : (pressure >= 60 ? '#ffb74d' : (pressure >= 30 ? '#ffd54f' : '#81c784'));
  return `
    <div class="panel redemption-card" data-pressure="${pressure}" style="--pressure-color:${color}">
      <div class="panel-title panel-title-row">
        <span><span class="alert-mark">!</span> 赎回压力</span>
        <span class="panel-kicker live">live</span>
      </div>
      <div class="redemption-score-row">
        <span class="redemption-score" style="color:${color}">${pressure}</span>
        <span class="redemption-scale">/ 100</span>
        <span class="redemption-zone">${pressure >= 80 ? '挤兑临界' : (pressure >= 60 ? '红区 · 触发预警' : '可控')}</span>
      </div>
      <div class="redemption-track">
        <div class="redemption-fill" style="width:${pressure}%; background:${color}"></div>
        <span>30</span><span>50</span><span>70</span>
      </div>
      <div class="redemption-detail">
        <div><span>下季预期赎回</span><strong>${expectedRedeem.toFixed(1)} 亿</strong></div>
        <div><span>当前现金</span><strong>${cashAvail.toFixed(1)} 亿</strong></div>
        <div><span>缺口</span><strong class="${gap > 0 ? 'val-bad' : 'val-ok'}">${gap > 0 ? '-' : '+'}${Math.abs(gap).toFixed(1)} 亿</strong></div>
      </div>
    </div>
  `;
}

function metricTile(label, value, unit, tone, pct, meta, trend) {
  // trend: { delta: number, isGood: bool } —— 显示在右上角，红涨蓝跌或反之取决于业务
  const trendHtml = trend
    ? `<span class="metric-trend ${trend.isGood ? 'good' : 'bad'}">${trend.delta > 0 ? '+' : ''}${trend.delta.toFixed(trend.delta < 1 && trend.delta > -1 ? 2 : 1)}</span>`
    : '';
  return `
    <div class="metric-tile tone-${tone || 'neutral'}">
      <div class="metric-tile-head">
        <span class="metric-name">${escapeHtml(label)}</span>
        ${trendHtml}
      </div>
      <div class="metric-reading">
        <span class="metric-value">${escapeHtml(value)}</span>
        ${unit ? `<span class="metric-unit">${escapeHtml(unit)}</span>` : ''}
      </div>
      <div class="metric-bar"><div class="metric-bar-fill" style="width:${Math.max(2, Math.min(100, pct || 0))}%"></div></div>
      ${meta ? `<div class="metric-meta">${escapeHtml(meta)}</div>` : ''}
    </div>
  `;
}

// 计算指标 trend：用 state.history 的最后一条 vs 当前 metrics
// 返回 { delta, isGood }；isGood 取决于该指标"涨好还是跌好"（lowerIsBetter=true 表示跌为好）
function getTrend(state, key, lowerIsBetter) {
  const last = state.history?.[state.history.length - 1];
  if (!last) return null;
  const before = last[key] ?? last.snapshot?.[key];
  const now = state.metrics?.[key];
  if (typeof before !== 'number' || typeof now !== 'number') return null;
  const delta = now - before;
  if (Math.abs(delta) < 0.05) return null;  // 太小不显示
  const isGood = lowerIsBetter ? delta < 0 : delta > 0;
  return { delta, isGood };
}

function metricRow(name, valueText, valClass, barPct) {
  let barClass = 'bar-green';
  if (barPct >= 70) barClass = 'bar-red';
  else if (barPct >= 50) barClass = 'bar-yellow';
  return `
    <div class="metric">
      <div class="metric-row">
        <span class="metric-name">${name}</span>
        <span class="metric-value ${valClass}">${valueText}</span>
      </div>
      <div class="metric-bar"><div class="metric-bar-fill ${barClass}" style="width:${Math.min(100,barPct)}%"></div></div>
    </div>
  `;
}

function cashColor(v) { return v < 2 ? 'val-bad' : (v < 5 ? 'val-warn' : 'val-ok'); }
function levColor(v) { return v >= 75 ? 'val-bad' : (v >= 65 ? 'val-warn' : 'val-ok'); }
function creditColor(v) { return v >= 85 ? 'val-bad' : (v >= 70 ? 'val-warn' : 'val-ok'); }
function costColor(v) { return v >= 7 ? 'val-bad' : (v >= 6 ? 'val-warn' : 'val-ok'); }
function collColor(v) { return v === 'low' ? 'val-bad' : (v === 'medium' ? 'val-warn' : 'val-ok'); }
function collLabel(v) { return v === 'high' ? '充足' : (v === 'medium' ? '中等' : '紧张'); }
function collValue(v) { return v === 'high' ? 25 : (v === 'medium' ? 60 : 90); }

function renderEventArea(state) {
  if (!state.pendingEvent) {
    return `<div class="event-card">
      <div class="event-header">
        <div class="event-id-line">
          <span class="event-code">IDLE</span>
          <span class="event-badge">季末预演</span>
        </div>
        <span class="event-time">T+0</span>
      </div>
      <div class="event-title">本回合无主线事件</div>
      <div class="event-body">你可以使用主动操作或直接结束本季度。</div>
    </div>`;
  }
  const e = state.pendingEvent;
  const isMain = e.id.startsWith('main_');
  const eventCode = getEventCode(e.id);
  const badgeInfo = getEventBadgeInfo(state, e);
  return `
    <div class="event-card">
      <div class="event-header">
        <div class="event-id-line">
          <span class="event-code">${eventCode}</span>
          <span class="event-badge ${badgeInfo.cls}">${escapeHtml(badgeInfo.label)}</span>
          <span class="event-source">来源 · ${isMain ? '主线' : '市场'}</span>
        </div>
        <span class="event-time">T+0 · ${state.role?.id === 'im' ? '14:08' : (state.role?.id === 'gov' ? '10:00' : '09:32')}</span>
      </div>
      <div class="event-title">${escapeHtml(e.title)}</div>
      <div class="event-body">${highlightEventBody(e.body)}</div>
      ${renderEventLogRow(state)}
      <div class="event-choices">
        ${e.choices.map((c, i) => `
          <button class="choice-btn" data-choice-idx="${i}">
            <div class="choice-head">
              <span class="choice-tag">${String.fromCharCode(65+i)} ▸</span>
              <span class="choice-meta">${escapeHtml(getChoiceBusinessMeta(c, state.role))}</span>
            </div>
            <span class="choice-label">${escapeHtml(c.label)}</span>
            ${renderChoicePreview(c, state.role)}
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

// 根据事件特征判断徽章（高危/不确定/正常）
function getEventBadgeInfo(state, event) {
  const isMain = event.id?.startsWith('main_');
  // 高危：政策大幅紧缩 / IM 赎回压力高 / GOV 隐债暴露
  const policyShift = event.policyShift || 0;
  const m = state.metrics || {};
  let isDanger = false;
  if (policyShift <= -2) isDanger = true;
  if (state.role?.id === 'im' && m.redemptionPressure >= 65) isDanger = true;
  if (state.role?.id === 'cfo' && m.cash < 2) isDanger = true;
  if (state.role?.id === 'gov' && m.debtRatio > 280) isDanger = true;

  // 选项是否含不确定
  const hasUncertain = (event.choices || []).some(c => c.effects?._uncertainty !== undefined);

  if (isDanger) return { label: '高危', cls: 'danger' };
  if (hasUncertain) return { label: '不确定', cls: '' };
  return { label: isMain ? '主线 · 必答' : '市场 · 扰动', cls: '' };
}

// 选项卡右上角业务参数（从 effects 抽核心数字）
function getChoiceBusinessMeta(choice, role) {
  const fx = choice.effects || {};
  const labels = role?.metricLabels || {};

  // 优先 _uncertainty
  if (fx._uncertainty !== undefined) {
    return `不确定 · ${Math.round(fx._uncertainty * 100)}%`;
  }
  if (fx._delay) return `延期 ${fx._delay} 季`;

  // 找到绝对值最大的非 score 数字
  let topKey = null, topVal = 0;
  for (const [k, v] of Object.entries(fx)) {
    if (k.startsWith('_') || k.startsWith('score.') || typeof v !== 'number') continue;
    if (Math.abs(v) > Math.abs(topVal)) { topKey = k; topVal = v; }
  }
  if (topKey) {
    const lbl = labels[topKey] || topKey;
    const sign = topVal > 0 ? '+' : '';
    return `${lbl} ${sign}${topVal}`;
  }
  return '即时';
}

// LOG 行（事件卡 body 与选项之间）：显示最近一条决策摘要
function renderEventLogRow(state) {
  const log = state.eventLog || [];
  const last = log[log.length - 1];
  if (!last) return '';
  const code = getEventCode(last.eventId || '');
  const choiceLetter = String.fromCharCode(65 + (last.choiceIdx || 0));
  const outcome = last.uncertainOutcome === 'failed' ? '失败' : (last.uncertainOutcome === 'succeeded' ? '成功' : '通过');
  return `
    <div class="event-log-row">
      <span class="log-arrow">→</span>
      <span class="log-tag">LOG</span>
      <span class="log-detail">${escapeHtml(code)} · 选 ${choiceLetter} · ${outcome}</span>
      <span class="log-more">查看全部 ›</span>
    </div>
  `;
}

// 事件正文关键词高亮：数字（带亿/%/bp）→ role-color；红线/挤兑/触发/缺口 → red
function highlightEventBody(body) {
  let html = escapeHtml(body || '').replace(/\n/g, '<br>');
  // 红色警示词
  html = html.replace(/(红线|挤兑|触发|缺口|违约|清盘|约谈|爆雷|穿线)/g, '<span class="key-warn">$1</span>');
  // 数字 + 单位（亿 / % / bp / Q[1-4]）
  html = html.replace(/((?:\d+(?:\.\d+)?)\s*(?:亿|%|bp|万|季|天|周))/g, '<span class="key-num">$1</span>');
  return html;
}

// 选项 effects 预告（设计稿 §3.11.3）
// 数字关键值用 role-color 高亮，负值/警示词用红色
function renderChoicePreview(choice, role) {
  const fx = choice.effects || {};
  const parts = [];
  const labels = role?.metricLabels || {};
  const dimLabels = role?.dimensionLabels || {};
  for (const [k, v] of Object.entries(fx)) {
    if (k.startsWith('_') || typeof v !== 'number') continue;
    let lbl;
    if (k.startsWith('score.')) {
      const dim = k.slice(6);
      lbl = dimLabels[dim] || dim;
    } else {
      lbl = labels[k] || k;
    }
    const sign = v > 0 ? '+' : '';
    const cls = v > 0 ? 'preview-good' : 'preview-warn';
    parts.push(`${escapeHtml(lbl)} <span class="${cls}">${sign}${v}</span>`);
  }
  if (parts.length === 0) return '';
  return `<div class="choice-preview"><span>PREDICTED · 预计</span>${parts.slice(0, 4).join('，')}</div>`;
}

function renderActionPanel(state) {
  return `
    <div class="panel action-panel">
      <div class="panel-title panel-title-row">
        <span><span class="section-caret">▸</span> 主动操作 · 可选加行动作</span>
        <span class="ops-remain">${Math.max(0, 2 - state.actionsUsed)}/2 剩余 · 不消耗事件回合</span>
      </div>
      <div id="action-list"></div>
      <button id="btn-end-turn" class="end-turn-btn">结束本季度 →</button>
    </div>
  `;
}

export function bindMainScreenEvents(state, callbacks) {
  document.querySelectorAll('.choice-btn[data-choice-idx]').forEach(btn => {
    btn.addEventListener('click', () => {
      callbacks.onChoiceSelected(parseInt(btn.dataset.choiceIdx, 10));
    });
  });
  const endBtn = document.getElementById('btn-end-turn');
  if (endBtn) endBtn.addEventListener('click', callbacks.onEndTurn);

  // 渲染操作列表
  const actionList = document.getElementById('action-list');
  if (actionList && callbacks.actions) {
    actionList.innerHTML = callbacks.actions.map((a, i) => {
      const avail = callbacks.isAvailable(a.id);
      const disabled = !avail.available || state.actionsUsed >= 2;
      return `
        <div class="action-slot ${disabled ? 'disabled' : ''}" data-action-id="${a.id}">
          <span class="action-code">A${i + 1}</span>
          <span class="action-main">
            <span class="action-name">${escapeHtml(a.name)}</span>
            <span class="action-desc">${escapeHtml(a.desc || '')}</span>
          </span>
          <span class="action-key">${i + 1}</span>
          ${disabled ? `<span class="action-disabled-reason">${escapeHtml(avail.reason || '本回合操作已用完')}</span>` : ''}
        </div>
      `;
    }).join('');
    document.querySelectorAll('.action-slot[data-action-id]').forEach(slot => {
      slot.addEventListener('click', () => callbacks.onActionSelected(slot.dataset.actionId));
    });
  }
}

function renderStatusBar(state) {
  const roleId = state.role?.id || 'cfo';
  return `
    <div class="statusbar">
      <span class="status-item">目标 <span>${escapeHtml(getStatusGoalText(state))}</span></span>
      <span class="status-item">回合 <span>${state.quartersPassed} / 12</span></span>
      <span class="status-item">政策 <span>${getPolicyLabelText(state.policyValue).replace(/[↓↑—]/g, '').trim()}</span></span>
      <span class="status-seed">SEED-${ROLE_CODES[roleId] || 'CFO'}-${hashString(state.origin?.platformName || 'seed').toString(16).toUpperCase().slice(0,4)}</span>
      <span class="status-seed">AUTOSAVE · T+0 · ${roleId === 'im' ? '14:08' : roleId === 'gov' ? '10:00' : '09:32'}</span>
    </div>
  `;
}

function renderChartArea(state) {
  if (state.role?.id === 'im') {
    return `
      <div class="chart-panel">
        <div class="panel-title panel-title-row"><span>净值曲线</span><strong>近 12 周 · 当前 ${state.metrics.nav.toFixed(3)}</strong></div>
        <div style="height:120px"><canvas id="chart-nav"></canvas></div>
      </div>
      <div class="chart-panel">
        <div class="panel-title panel-title-row"><span>持仓评级</span><strong>AA 及以下 ${state.metrics.creditExposure.toFixed(0)}%</strong></div>
        <div style="height:170px"><canvas id="chart-holdings"></canvas></div>
      </div>
      ${renderMarketPulsePanel(state)}
    `;
  }
  if (state.role?.id === 'gov') {
    return `
      <div class="chart-panel">
        <div class="panel-title panel-title-row"><span>财政收支</span><strong>本季差额 ${(state.metrics.cash - 4).toFixed(1)} 亿</strong></div>
        <div style="height:120px"><canvas id="chart-fiscal"></canvas></div>
      </div>
      <div class="chart-panel">
        <div class="panel-title panel-title-row"><span>综合债务率</span><strong>当前 ${state.metrics.debtRatio.toFixed(0)}%</strong></div>
        <div style="height:120px"><canvas id="chart-debt-ratio"></canvas></div>
      </div>
      ${renderMarketPulsePanel(state)}
    `;
  }
  return `
    <div class="chart-panel">
      <div class="panel-title panel-title-row"><span>债务到期瀑布</span><strong>未来 4 季 · 合计 ${sumDebt(state.metrics.debtMaturity, state.quartersPassed, 4).toFixed(1)} 亿</strong></div>
      <div style="height:110px"><canvas id="chart-debt"></canvas></div>
    </div>
    <div class="chart-panel">
      <div class="panel-title panel-title-row"><span>现金趋势</span><strong>近 6 季 · 当前 ${state.metrics.cash.toFixed(1)} 亿</strong></div>
      <div style="height:110px"><canvas id="chart-cash"></canvas></div>
    </div>
    ${renderMarketPulsePanel(state)}
  `;
}

export function renderCrisisModal(crisis, onSelect) {
  const overlay = document.createElement('div');
  overlay.id = 'crisis-overlay';
  overlay.className = 'crisis-overlay-v2';
  overlay.innerHTML = `
    <div class="crisis-banner">⚠ 危机警报 · 时间暂停 · 必须处置后继续</div>
    <div class="crisis-center">
      <div class="crisis-card">
        <div class="crisis-card-header">
          <span class="crisis-icon">⚠</span>
          <div>
            <div class="crisis-title">${escapeHtml(crisis.title)}</div>
            <div class="crisis-body">${escapeHtml(crisis.body)}</div>
          </div>
        </div>
        <div class="crisis-metrics">
          ${(crisis.metrics || []).map(m => `
            <div class="crisis-metric">
              <div class="crisis-metric-label">${escapeHtml(m.label)}</div>
              <div class="crisis-metric-value">${escapeHtml(m.value)}</div>
            </div>
          `).join('')}
        </div>
        <div class="crisis-options-title">请选择处置方案</div>
        <div class="crisis-options">
          ${crisis.options.map((o, i) => `
            <button class="crisis-option" data-opt-idx="${i}">
              <div class="crisis-option-header">
                <span class="crisis-option-name">${escapeHtml(o.label)}</span>
                ${o.cost ? `<span class="crisis-option-cost cost-${costClass(o.cost)}">${escapeHtml(o.cost)}</span>` : ''}
              </div>
              ${o.desc ? `<div class="crisis-option-desc">${escapeHtml(o.desc)}</div>` : ''}
              ${renderCrisisEffects(o.effects)}
            </button>
          `).join('')}
        </div>
        <div class="crisis-footer">⏱ 此处置不可撤销，请慎重选择</div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelectorAll('.crisis-option').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.optIdx, 10);
      overlay.remove();
      onSelect(crisis.options[idx]);
    });
  });
}

// 渲染危机选项的 effects 预告（带"成败概率"提示，如果有 _uncertain）
function renderCrisisEffects(effects) {
  if (!effects) return '';
  const parts = [];
  for (const [k, v] of Object.entries(effects)) {
    if (k === '_uncertain') {
      parts.push(`成功率 ${Math.round(v * 100)}%`);
      continue;
    }
    if (k.startsWith('_')) continue;
    if (k.startsWith('score.')) {
      parts.push(`${k.slice(6)} ${v > 0 ? '+' : ''}${v}`);
    } else if (typeof v === 'number') {
      parts.push(`${k} ${v > 0 ? '+' : ''}${v}`);
    }
  }
  return parts.length ? `<div class="crisis-option-effects">💡 ${parts.slice(0, 4).join(' · ')}</div>` : '';
}

function costClass(cost) {
  if (cost.includes('高')) return 'high';
  if (cost.includes('中')) return 'med';
  return 'low';
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
function getGoalDisplay(state, hints) {
  const roleId = state.role?.id;
  if (roleId === 'cfo') {
    return {
      title: '现金不归零，撑过 12 季度',
      subtitle: 'Q5-Q7 是债务到期高峰，提前备款',
    };
  }
  if (roleId === 'im') {
    return {
      title: '净值守住 0.85，存活 12 季度',
      subtitle: '管理赎回压力，避免流动性挤兑',
    };
  }
  if (roleId === 'gov') {
    return {
      title: '债务率不破 300%，政绩不跌穿 20',
      subtitle: '化债 + 招商 + 转移支付平衡',
    };
  }
  return { title: hints?.goal || '撑过 12 季度', subtitle: '' };
}

// 本局目标 - 进度行（按角色给 2-3 个进度指标）
function getGoalRows(state) {
  const m = state.metrics || {};
  const roleId = state.role?.id;
  const quartersDone = state.quartersPassed || 0;
  const quartersPct = (quartersDone / 12) * 100;
  const rows = [{
    label: '游戏进度', value: `${quartersDone}/12 季度`,
    pct: quartersPct, tone: 'neutral',
  }];

  if (roleId === 'cfo') {
    const cashPct = Math.min(100, (m.cash || 0) * 10);
    rows.push({
      label: '现金安全垫', value: `${(m.cash || 0).toFixed(1)} 亿`,
      pct: cashPct, tone: m.cash < 2 ? 'bad' : (m.cash < 5 ? 'warn' : 'ok'),
      note: m.cash < 2 ? '⚠ 接近资金链断裂' : '维持运营',
    });
  } else if (roleId === 'im') {
    const navMargin = ((m.nav || 1) - 0.85) / 0.20 * 100;
    rows.push({
      label: '净值安全边距', value: (m.nav || 1).toFixed(3),
      pct: Math.max(0, Math.min(100, navMargin)),
      tone: m.nav < 0.88 ? 'bad' : (m.nav < 0.95 ? 'warn' : 'ok'),
      note: m.nav < 0.88 ? '⚠ 接近清盘线' : '可承受波动',
    });
  } else if (roleId === 'gov') {
    const debtPct = Math.min(100, ((m.debtRatio || 200) - 150) / 1.5);
    rows.push({
      label: '债务率距红线', value: `${(m.debtRatio || 200).toFixed(0)}%`,
      pct: debtPct, tone: m.debtRatio > 280 ? 'bad' : (m.debtRatio > 250 ? 'warn' : 'ok'),
      note: m.debtRatio > 280 ? '⚠ 接近被约谈' : '空间安全',
    });
    rows.push({
      label: '政绩评分', value: `${Math.round(m.politicalScore || 50)}/100`,
      pct: m.politicalScore || 50, tone: m.politicalScore < 30 ? 'bad' : (m.politicalScore < 45 ? 'warn' : 'ok'),
    });
  }
  return rows;
}

// 状态栏目标文本（短）
function getStatusGoalText(state) {
  const roleId = state.role?.id;
  if (roleId === 'cfo') return '存活到 2024Q4 · 现金 > 0';
  if (roleId === 'im') return '存活 12 季度 · NAV > 0.85';
  if (roleId === 'gov') return '债务率 < 300% · 政绩 > 20';
  return '存活到 2024Q4';
}

// 中栏底部"不行动 · 季末预演"面板：模拟玩家不操作时本季末关键指标变化
function renderProjectedPanel(state) {
  const m = state.metrics || {};
  const roleId = state.role?.id;
  const rows = [];
  if (roleId === 'cfo') {
    const cash = m.cash || 0;
    const due = m.debtMaturity?.[state.quartersPassed] || 0;
    const proj = (cash - due - (m.opCostRate || 0) - (m.projectGap || 0) + 2.5);
    rows.push({ label: '现金', from: `${cash.toFixed(1)} 亿`, to: `${proj.toFixed(1)} 亿`, tone: proj < 1 ? 'bad' : (proj < 3 ? 'warn' : 'ok'), note: due > cash ? 'T+5 还款日' : '正常运营' });
    const newCreditUsage = m.creditUsage || 0;
    rows.push({ label: '授信使用率', from: `${Math.round(newCreditUsage)}%`, to: `${Math.round(newCreditUsage * 1.05)}%`, tone: newCreditUsage > 85 ? 'bad' : 'warn', note: newCreditUsage > 90 ? '逼近 100% 红线' : '尚有余地' });
    rows.push({ label: '本季利润', from: `+${(2.5 - (m.opCostRate || 0) - (m.projectGap || 0)).toFixed(1)} 亿`, to: `${(2.5 - (m.opCostRate || 0) - (m.projectGap || 0) - due * 0.1).toFixed(1)} 亿`, tone: 'warn', note: '首次转亏' });
  } else if (roleId === 'im') {
    const nav = m.nav || 1;
    const projNav = nav * 0.97;
    rows.push({ label: '净值 NAV', from: nav.toFixed(3), to: projNav.toFixed(3), tone: projNav < 0.9 ? 'bad' : 'warn', note: `距死亡线 ${(projNav - 0.85).toFixed(2)}` });
    const cashRatio = m.cashRatio || 0;
    rows.push({ label: '流动性资产', from: `${getCashAvail(m).toFixed(1)} 亿`, to: `${(getCashAvail(m) - getExpectedRedeem(m)).toFixed(1)} 亿`, tone: cashRatio < 5 ? 'bad' : 'warn', note: getExpectedRedeem(m) > getCashAvail(m) ? `缺口 ${(getExpectedRedeem(m) - getCashAvail(m)).toFixed(1)}` : '可覆盖' });
    rows.push({ label: 'AA- 占比', from: `${Math.round(m.creditExposure * 0.4)}%`, to: `${Math.round(m.creditExposure * 0.4 + 4)}%`, tone: 'warn', note: '被动抬升' });
  } else if (roleId === 'gov') {
    const debt = m.debtRatio || 250;
    rows.push({ label: '综合债务率', from: `${debt.toFixed(0)}%`, to: `${(debt + 12).toFixed(0)}%`, tone: debt > 280 ? 'bad' : 'warn', note: debt + 12 > 295 ? '逼近 300% 红线' : '空间收窄' });
    rows.push({ label: '财政现金', from: `${m.cash?.toFixed(1) || '-'} 亿`, to: `${((m.cash || 0) * 0.65).toFixed(1)} 亿`, tone: 'warn', note: '工资刚性支出' });
    rows.push({ label: '政绩评分', from: `${Math.round(m.politicalScore || 60)}`, to: `${Math.round((m.politicalScore || 60) - 4)}`, tone: 'warn', note: 'Q3 考核窗口' });
  }
  if (rows.length === 0) return '';
  return `
    <div class="panel projected-panel">
      <div class="panel-title panel-title-row">
        <span><span class="section-mark">→</span> 不行动 · 季末预演</span>
        <span class="panel-kicker">PROJECTED · 仅供参考</span>
      </div>
      <div class="projected-rows">
        ${rows.map(r => `
          <div class="projected-row">
            <span class="proj-label">${escapeHtml(r.label)}</span>
            <span class="proj-from">${escapeHtml(r.from)}</span>
            <span class="proj-arrow">→</span>
            <span class="proj-to tone-${r.tone}">${escapeHtml(r.to)}</span>
            <span class="proj-note">${escapeHtml(r.note || '')}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// 中栏底部"决策日志"面板：基于 state.eventLog 显示最近 3 条
function renderDecisionLog(state) {
  const log = state.eventLog || [];
  if (log.length === 0) return `
    <div class="panel decision-log empty">
      <div class="panel-title panel-title-row">
        <span><span class="section-caret">▼</span> 决策日志</span>
        <span class="panel-kicker">0 条 · 本局</span>
      </div>
      <div class="decision-empty">暂无决策记录，做出第一个选择后这里会留痕。</div>
    </div>
  `;
  const rows = log.slice(-3).reverse().map((entry, idx) => {
    const code = getEventCode(entry.eventId || '');
    const outcomeTag = entry.uncertainOutcome === 'failed' ? '失败' : (entry.uncertainOutcome === 'succeeded' ? '成功' : '通过');
    const choiceLetter = String.fromCharCode(65 + (entry.choiceIdx || 0));
    return `
      <div class="log-row">
        <span class="log-q">Q${log.length - idx}</span>
        <span class="log-code">${escapeHtml(code)}</span>
        <span class="log-outcome ${entry.uncertainOutcome === 'failed' ? 'bad' : 'ok'}">${outcomeTag}</span>
        <span class="log-detail">选 ${choiceLetter}</span>
      </div>
    `;
  }).join('');
  return `
    <div class="panel decision-log">
      <div class="panel-title panel-title-row">
        <span><span class="section-caret">▼</span> 决策日志</span>
        <span class="panel-kicker">${log.length} 条 · 本局</span>
      </div>
      <div class="log-rows">${rows}</div>
    </div>
  `;
}

// 右栏底部"市场脉冲"小面板（角色共用，含真实金融数据估算）
// 数据来源：基于 state.policyValue 推导可信的市场指标 + 用 hashString 给小幅波动避免每次刷新跳变
function renderMarketPulsePanel(state) {
  const policy = state.policyValue || 0;
  const seed = hashString(`${state.year}${state.quarter}${state.origin?.platformName || ''}`);
  const noise = (idx) => ((seed >> idx) & 0xff) / 255 - 0.5;  // -0.5 ~ +0.5
  const roleId = state.role?.id;

  let kicker = '本地城投融资环境';
  if (roleId === 'im') kicker = '公募债基行业';
  if (roleId === 'gov') kicker = '政策与同侪';

  // 基础数据：政策紧 → 利差走阔、取消发行多、审批慢；放松反之
  const tighten = -policy;  // 政策紧时为正
  const aaSpread = Math.round(150 + tighten * 12 + noise(0) * 10);
  const spreadDelta = Math.round(tighten * 3 + noise(1) * 5);
  const cancelCount = Math.max(0, Math.round(2 + tighten * 0.7 + noise(2) * 1.5));
  const cancelDelta = Math.round(tighten * 0.5 + noise(3) * 1.5);
  const approvalDays = Math.round(12 + tighten * 2.5 + noise(4) * 3);
  const approvalDelta = Math.round(tighten * 1.2 + noise(5) * 2);

  let pulses;
  if (roleId === 'im') {
    const yield10y = (2.5 + tighten * 0.05 + noise(6) * 0.08).toFixed(2);
    const yieldBp = Math.round(tighten * 5 + noise(7) * 4);
    const redemptionRate = (5.5 + tighten * 0.6 + noise(8) * 0.5).toFixed(1);
    const redemptionDelta = (tighten * 0.4 + noise(9) * 0.5).toFixed(1);
    const repoRate = (2.0 + tighten * 0.2 + noise(10) * 0.15).toFixed(2);
    const repoBp = Math.round(tighten * 6 + noise(11) * 4);
    pulses = [
      { label: '10Y 国债收益率', value: `${yield10y}%`, delta: `${yieldBp >= 0 ? '+' : ''}${yieldBp} bp`, tone: yieldBp > 0 ? 'tight' : 'loose' },
      { label: 'AA 信用利差', value: `${aaSpread} bp`, delta: `${spreadDelta >= 0 ? '+' : ''}${spreadDelta}`, tone: spreadDelta > 0 ? 'tight' : 'loose' },
      { label: '行业平均赎回率', value: `${redemptionRate}%`, delta: `${redemptionDelta}`, tone: parseFloat(redemptionDelta) > 0 ? 'tight' : 'loose' },
      { label: '回购加权利率', value: `${repoRate}%`, delta: `${repoBp >= 0 ? '+' : ''}${repoBp} bp`, tone: repoBp > 0 ? 'tight' : 'loose' },
    ];
  } else if (roleId === 'gov') {
    const provQuota = (1.4 - tighten * 0.05 + noise(6) * 0.1).toFixed(1);
    const peerDebt = Math.round(248 + tighten * 4 + noise(7) * 6);
    const peerDelta = Math.round(tighten * 2 + noise(8) * 3);
    const transferGrowth = (3.2 - tighten * 0.4 + noise(9) * 0.4).toFixed(1);
    const transferDelta = (-tighten * 0.3 + noise(10) * 0.5).toFixed(1);
    const landAuction = Math.round(38 + tighten * -3 + noise(11) * 5);
    const landDelta = Math.round(tighten * -2 + noise(12) * 3);
    pulses = [
      { label: '全国特殊再融资额度', value: `${provQuota} 万亿`, delta: 'Q3 截止', tone: 'tight' },
      { label: '同档区均债务率', value: `${peerDebt}%`, delta: `我 ${peerDelta >= 0 ? '+' : ''}${peerDelta}pp`, tone: peerDelta > 0 ? 'tight' : 'loose' },
      { label: '省级转移支付增速', value: `+${transferGrowth}%`, delta: `${transferDelta}`, tone: parseFloat(transferDelta) < 0 ? 'tight' : 'loose' },
      { label: '土地出让流拍率', value: `${landAuction}%`, delta: `${landDelta >= 0 ? '+' : ''}${landDelta}`, tone: landDelta > 0 ? 'tight' : 'loose' },
    ];
  } else {
    // CFO
    pulses = [
      { label: 'AA 城投信用利差', value: `${aaSpread} bp`, delta: `${spreadDelta >= 0 ? '+' : ''}${spreadDelta}`, tone: spreadDelta > 0 ? 'tight' : 'loose' },
      { label: '本省取消发行', value: `${cancelCount} / 周`, delta: `${cancelDelta >= 0 ? '+' : ''}${cancelDelta}`, tone: cancelDelta > 0 ? 'tight' : 'loose' },
      { label: '银行授信审批', value: `T+${approvalDays} 天`, delta: `${approvalDelta >= 0 ? '+' : ''}${approvalDelta}`, tone: approvalDelta > 0 ? 'tight' : 'loose' },
      { label: '土地拍卖溢价率', value: `${(-2 + tighten * -0.5 + noise(9) * 1.5).toFixed(1)}%`, delta: `${(tighten * -0.3 + noise(10) * 1).toFixed(1)}`, tone: 'tight' },
    ];
  }

  return `
    <div class="chart-panel pulse-panel">
      <div class="panel-title panel-title-row">
        <span><span class="section-mark">⌁</span> 市场脉冲</span>
        <span class="panel-kicker">${escapeHtml(kicker)}</span>
      </div>
      <div class="pulse-rows">
        ${pulses.map(p => `
          <div class="pulse-row">
            <span class="pulse-label">${escapeHtml(p.label)}</span>
            <span class="pulse-value">${escapeHtml(p.value)}</span>
            <span class="pulse-delta pulse-${p.tone}">${escapeHtml(p.delta)}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

export function renderEndScreen(state, finalScore, callbacks) {
  const app = document.getElementById('app');
  const gradeClass = `grade-${finalScore.grade.grade}`;
  const rankHtml = callbacks.rank
    ? `<div style="font-size:16px;color:#ffd54f;margin-top:12px">你的排名：第 ${callbacks.rank} 名</div>`
    : '';
  app.innerHTML = `
    <div class="screen active">
      <div class="endgame-container">
        <div class="endgame-header">
          <div class="endgame-status">${state.survived ? '✓ 成功通关' : '✗ 中途失败：' + (state.deathReason || '未知原因')}</div>
          <div class="endgame-grade ${gradeClass}">${finalScore.grade.grade}</div>
          <div style="font-size:18px;color:#e0eaf8">${finalScore.grade.label}</div>
          <div style="font-size:32px;color:#4fc3f7;margin-top:8px">${finalScore.total}<span style="font-size:14px;color:#4a6080"> / 100</span></div>
          ${rankHtml}
          <div style="font-size:12px;color:#6a8aaa;margin-top:8px">${state.origin.platformName} · ${state.origin.directorName}</div>
          <div style="font-size:11px;color:#4a6080;margin-top:4px">存活 ${state.quartersPassed} / 12 季度</div>
        </div>

        <div class="radar-card">
          <div class="panel-title">六维评分</div>
          <div style="height:280px"><canvas id="chart-radar"></canvas></div>
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-top:14px">
            ${Object.entries(finalScore.dimensions).map(([k, v]) => `
              <div style="display:flex;justify-content:space-between;font-size:11px">
                <span style="color:#6a8aaa">${k}</span>
                <span style="color:${v>=70?'#81c784':v>=50?'#ffb74d':'#ef5350'}">${Math.round(v)}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="endgame-actions">
          <button id="btn-restart" class="btn-primary">再来一局</button>
          <button id="btn-leaderboard" class="btn-secondary">排行榜</button>
          <button id="btn-share" class="btn-secondary">生成分享卡片</button>
        </div>
      </div>
    </div>
  `;
  requestAnimationFrame(() => renderRadarChart('chart-radar', finalScore.dimensions));
  document.getElementById('btn-restart').addEventListener('click', callbacks.onRestart);
  document.getElementById('btn-share').addEventListener('click', () => callbacks.onShare(finalScore));
  document.getElementById('btn-leaderboard').addEventListener('click', callbacks.onLeaderboard);
}

export function generateShareCard(state, finalScore) {
  const canvas = document.createElement('canvas');
  canvas.width = 750;
  canvas.height = 1200;
  const ctx = canvas.getContext('2d');

  // 背景
  const grad = ctx.createLinearGradient(0, 0, 0, 1200);
  grad.addColorStop(0, '#0a0e1a');
  grad.addColorStop(1, '#0f1e35');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 750, 1200);

  // 顶部装饰条
  ctx.fillStyle = '#4fc3f7';
  ctx.fillRect(0, 0, 750, 4);

  // 标题
  ctx.fillStyle = '#e0eaf8';
  ctx.font = '300 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('债市生存游戏', 375, 90);
  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#6a8aaa';
  ctx.fillText('搞债 · 财务总监模式', 375, 120);

  // 评分大字
  ctx.font = '300 220px sans-serif';
  ctx.fillStyle = gradeColor(finalScore.grade.grade);
  ctx.fillText(finalScore.grade.grade, 375, 360);

  ctx.font = '24px sans-serif';
  ctx.fillStyle = '#e0eaf8';
  ctx.fillText(finalScore.grade.label, 375, 410);

  ctx.font = '60px sans-serif';
  ctx.fillStyle = '#4fc3f7';
  ctx.fillText(`${finalScore.total}`, 375, 490);
  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#6a8aaa';
  ctx.fillText('总分（满分100）', 375, 520);

  // 平台信息
  ctx.font = '18px sans-serif';
  ctx.fillStyle = '#8fa8c8';
  ctx.fillText(state.origin.platformName, 375, 580);
  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#6a8aaa';
  ctx.fillText(`${state.origin.labels.region} · ${state.origin.labels.business}`, 375, 610);

  // 状态
  ctx.font = '16px sans-serif';
  ctx.fillStyle = state.survived ? '#81c784' : '#ef5350';
  ctx.fillText(state.survived ? `✓ 成功存活 ${state.quartersPassed} 季度` : `✗ 第 ${state.quartersPassed} 季度失败`, 375, 660);

  // 六维分数列表
  ctx.textAlign = 'left';
  let y = 740;
  ctx.font = '14px sans-serif';
  Object.entries(finalScore.dimensions).forEach(([k, v]) => {
    ctx.fillStyle = '#6a8aaa';
    ctx.fillText(k, 100, y);
    ctx.fillStyle = v >= 70 ? '#81c784' : (v >= 50 ? '#ffb74d' : '#ef5350');
    ctx.textAlign = 'right';
    ctx.fillText(Math.round(v), 650, y);
    ctx.textAlign = 'left';
    // 进度条
    ctx.fillStyle = '#1e2d47';
    ctx.fillRect(100, y + 8, 550, 4);
    ctx.fillStyle = v >= 70 ? '#81c784' : (v >= 50 ? '#ffb74d' : '#ef5350');
    ctx.fillRect(100, y + 8, 550 * v / 100, 4);
    y += 50;
  });

  // 底部水印
  ctx.fillStyle = '#4a6080';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('搞债公众号出品 · 长按识别打开游戏', 375, 1150);

  // 输出图片
  return canvas.toDataURL('image/png');
}

function gradeColor(g) {
  return { S: '#ffd54f', A: '#81c784', B: '#4fc3f7', C: '#ffb74d', D: '#ef5350' }[g] || '#4fc3f7';
}

export function downloadShareCard(dataUrl, filename) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

export function renderLeaderboardModal(leaderboardData, onClose, fetchFn) {
  const overlay = document.createElement('div');
  overlay.id = 'leaderboard-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(10,14,26,0.95);z-index:1000;overflow-y:auto;padding:20px';

  function renderRows(data) {
    const rows = (data || []).map(row => {
      const name = escapeHtml(row.nickname || row.directorName);
      const regionLabel = REGION_LABELS[row.regionTier] || row.regionTier;
      const healthLabel = HEALTH_LABELS[row.healthLevel] || row.healthLevel;
      const roleLabel = ROLE_LABELS[row.role] || row.role || '财务总监';
      return `
        <tr>
          <td class="lb-rank" data-label="排名">#${row.rank}</td>
          <td class="lb-role" data-label="角色">${roleLabel}</td>
          <td class="lb-name" data-label="昵称">${name}</td>
          <td class="lb-platform" data-label="平台">${escapeHtml(row.platformName)}</td>
          <td class="lb-difficulty" data-label="难度">${regionLabel}·${healthLabel}</td>
          <td class="lb-grade grade-${row.grade}" data-label="评级">${row.grade}</td>
          <td class="lb-score" data-label="总分">${row.score}</td>
          <td class="lb-quarters" data-label="存活">${row.quartersPassed}/12</td>
        </tr>
      `;
    }).join('');

    const emptyMsg = data && data.length > 0
      ? ''
      : '<tr><td colspan="8" style="text-align:center;color:#4a6080;padding:40px">暂无记录，等你来创造历史</td></tr>';
    overlay.querySelector('tbody').innerHTML = rows + emptyMsg;
  }

  overlay.innerHTML = `
    <div class="lb-container">
      <div class="lb-header">
        <span class="lb-title">排行榜 · Top 20</span>
        <button id="btn-lb-close" class="lb-close-btn">✕</button>
      </div>
      <div class="lb-tabs">
        <button class="lb-tab active" data-role="">全部</button>
        <button class="lb-tab" data-role="cfo">财务总监</button>
        <button class="lb-tab" data-role="im">投资经理</button>
      </div>
      <table class="lb-table">
        <thead>
          <tr>
            <th>排名</th><th>角色</th><th>昵称</th><th>平台</th><th>难度</th><th>评级</th><th>总分</th><th>存活</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>
  `;

  document.body.appendChild(overlay);
  renderRows(leaderboardData || []);
  document.getElementById('btn-lb-close').addEventListener('click', () => {
    overlay.remove();
    if (onClose) onClose();
  });
  overlay.querySelectorAll('.lb-tab').forEach(tab => {
    tab.addEventListener('click', async () => {
      overlay.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      if (!fetchFn) return;
      const role = tab.dataset.role || null;
      const result = await fetchFn(role);
      renderRows(result?.data || []);
    });
  });
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
// Toast 通知系统（替代 alert()）— Plan 5 Round 3
// ============================================================
let toastContainer = null;

function ensureToastContainer() {
  if (toastContainer && document.body.contains(toastContainer)) return toastContainer;
  toastContainer = document.createElement('div');
  toastContainer.id = 'toast-container';
  document.body.appendChild(toastContainer);
  return toastContainer;
}

/**
 * 显示 Toast 通知（自动消失）
 * @param {string} message 文案，可单行或双行（用 \n 分隔）
 * @param {'success'|'error'|'info'} variant 类型（默认 info）
 * @param {number} duration 自动消失毫秒数（默认 3000，0 = 不自动消失）
 */
export function showToast(message, variant = 'info', duration = 3000) {
  const container = ensureToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${variant}`;
  const iconMap = { success: '✓', error: '✕', info: 'ⓘ' };
  const lines = String(message).split('\n');
  toast.innerHTML = `
    <span class="toast-icon">${iconMap[variant] || 'ⓘ'}</span>
    <div class="toast-body">
      ${lines.map(l => `<div>${escapeHtml(l)}</div>`).join('')}
    </div>
    <button class="toast-close" aria-label="关闭">×</button>
  `;
  container.appendChild(toast);
  // 入场动画
  requestAnimationFrame(() => toast.classList.add('toast-in'));

  const close = () => {
    toast.classList.remove('toast-in');
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 250);
  };
  toast.querySelector('.toast-close').addEventListener('click', close);
  if (duration > 0) setTimeout(close, duration);
  return close;
}

// 便捷方法
export const toast = {
  success: (msg, duration) => showToast(msg, 'success', duration),
  error: (msg, duration) => showToast(msg, 'error', duration),
  info: (msg, duration) => showToast(msg, 'info', duration),
};

// ============================================================
// 操作输入 Modal（替代 prompt()）— Plan 5 Round 3
// ============================================================

/**
 * 弹出操作输入 Modal，返回 Promise<params|null>（取消返回 null）
 * @param {object} action {id, name, desc, params: [{key, label, min, max, step, default}]}
 * @param {function} previewFn (params) => string  可选：根据当前 params 计算预计影响文案
 * @returns {Promise<object|null>}
 */
export function renderActionModal(action, previewFn) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const paramFields = (action.params || []).map(p => {
      const id = `mp-${p.key}`;
      const hasRange = Number.isFinite(p.min) && Number.isFinite(p.max);
      return `
        <div class="modal-field">
          <label class="modal-label" for="${id}">
            ${escapeHtml(p.label)}
            ${hasRange ? `<span class="modal-hint">范围 ${p.min} – ${p.max}</span>` : ''}
          </label>
          <div class="modal-input-row">
            <input type="number" id="${id}" class="modal-input" data-key="${p.key}"
              value="${p.default ?? p.min ?? 0}"
              min="${p.min ?? ''}" max="${p.max ?? ''}" step="${p.step ?? 'any'}">
            ${hasRange ? `
              <input type="range" class="modal-slider" data-key-target="${id}"
                value="${p.default ?? p.min ?? 0}"
                min="${p.min}" max="${p.max}" step="${p.step ?? 0.5}">
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    overlay.innerHTML = `
      <div class="modal-card">
        <div class="modal-header">
          <span class="modal-title">${escapeHtml(action.name)}</span>
          <button class="modal-close" aria-label="关闭">×</button>
        </div>
        ${action.desc ? `<div class="modal-desc">${escapeHtml(action.desc)}</div>` : ''}
        <div class="modal-fields">${paramFields}</div>
        <div class="modal-preview" id="modal-preview">💡 调整数值实时预览影响</div>
        <div class="modal-actions">
          <button class="btn-secondary modal-cancel">取消</button>
          <button class="btn-primary modal-confirm">确认下单</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    // 收集当前 params
    const collect = () => {
      const out = {};
      overlay.querySelectorAll('.modal-input').forEach(inp => {
        const v = parseFloat(inp.value);
        if (Number.isFinite(v)) out[inp.dataset.key] = v;
      });
      return out;
    };

    // slider ↔ input 双向绑定 + 预览刷新
    const refreshPreview = () => {
      if (typeof previewFn === 'function') {
        try {
          const txt = previewFn(collect());
          if (txt) document.getElementById('modal-preview').textContent = '💡 ' + txt;
        } catch (e) { /* 预览失败不阻塞 */ }
      }
    };

    overlay.querySelectorAll('.modal-slider').forEach(slider => {
      const target = document.getElementById(slider.dataset.keyTarget);
      slider.addEventListener('input', () => {
        target.value = slider.value;
        refreshPreview();
      });
    });
    overlay.querySelectorAll('.modal-input').forEach(inp => {
      inp.addEventListener('input', () => {
        const slider = overlay.querySelector(`.modal-slider[data-key-target="${inp.id}"]`);
        if (slider) slider.value = inp.value;
        refreshPreview();
      });
    });
    refreshPreview();

    const close = (result) => {
      overlay.remove();
      resolve(result);
    };
    overlay.querySelector('.modal-close').addEventListener('click', () => close(null));
    overlay.querySelector('.modal-cancel').addEventListener('click', () => close(null));
    overlay.querySelector('.modal-confirm').addEventListener('click', () => {
      const params = collect();
      // 校验范围
      for (const p of action.params || []) {
        const v = params[p.key];
        if (!Number.isFinite(v)) return showToast(`${p.label} 必须是数字`, 'error');
        if (Number.isFinite(p.min) && v < p.min) return showToast(`${p.label} 不能小于 ${p.min}`, 'error');
        if (Number.isFinite(p.max) && v > p.max) return showToast(`${p.label} 不能大于 ${p.max}`, 'error');
      }
      close(params);
    });
    // ESC 关闭
    const onKey = (e) => {
      if (e.key === 'Escape') { document.removeEventListener('keydown', onKey); close(null); }
    };
    document.addEventListener('keydown', onKey);
    // 自动聚焦第一个 input
    requestAnimationFrame(() => {
      const first = overlay.querySelector('.modal-input');
      if (first) { first.focus(); first.select(); }
    });
  });
}
