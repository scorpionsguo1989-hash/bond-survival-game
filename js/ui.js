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
  // role 可选；若未传，按 origin.role 兜底
  const roleName = role?.name || ROLE_LABELS[origin.role] || '城投财务总监';
  // 命运卡 onboarding（Plan 3 §3.10）
  const hints = role?.getOnboardingHints ? role.getOnboardingHints(origin) : null;
  // 通用 fate-tags 渲染：CFO/IM origin 字段集不同，挑选可用的
  const tagsHtml = renderFateTags(origin);
  // 通用 challenges：CFO 有 challenges 字段，IM 无 → fallback 用 onboarding.topRisks 显示
  const challengesList = origin.challenges && origin.challenges.length > 0
    ? origin.challenges
    : (hints ? hints.topRisks : []);
  // 角色色（CFO 青蓝 / IM 金黄 / GOV 朱红）
  const roleAccent = { cfo: '#4fc3f7', im: '#ffd54f', gov: '#ef5350' }[origin.role] || '#4fc3f7';
  app.innerHTML = `
    <div class="screen active">
      <div class="fate-container fate-role-${origin.role}" style="--role-accent:${roleAccent}">
        <div class="fate-title">债市生存游戏</div>
        <div class="fate-subtitle">命运由你改写</div>
        <div class="fate-card">
          <div class="role-badge">角色 · ${escapeHtml(roleName)}</div>
          <div class="role-name">${escapeHtml(origin.directorName)}</div>
          <div class="role-org">${escapeHtml(origin.platformName)}</div>
          <div class="fate-tags">${tagsHtml}</div>
          <div class="challenges">
            <div class="challenges-title">你这局的三大挑战</div>
            ${challengesList.slice(0, 3).map((c, i) => `
              <div class="challenge-row">
                <span class="challenge-num">0${i+1}</span>
                <span class="challenge-rail" aria-hidden="true"></span>
                <span class="challenge-text">${escapeHtml(c)}</span>
              </div>
            `).join('')}
          </div>
          ${hints ? renderOnboardingCard(hints) : ''}
          <button id="btn-accept-fate" class="start-btn">接受命运，开始游戏 →</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('btn-accept-fate').addEventListener('click', onAccept);
}

function renderFateTags(origin) {
  const tags = [];
  if (origin.labels?.region) tags.push(`<span class="tag tag-region">${escapeHtml(origin.labels.region)}</span>`);
  if (origin.labels?.business) tags.push(`<span class="tag tag-type">${escapeHtml(origin.labels.business)}</span>`);
  if (origin.labels?.inst) tags.push(`<span class="tag tag-region">${escapeHtml(origin.labels.inst)}</span>`);
  if (origin.labels?.scale) tags.push(`<span class="tag tag-type">${escapeHtml(origin.labels.scale)}</span>`);
  if (origin.labels?.health) tags.push(`<span class="tag tag-type">${escapeHtml(origin.labels.health)}</span>`);
  if (origin.labels?.tag) tags.push(`<span class="tag tag-warn">⚠ ${escapeHtml(origin.labels.tag)}</span>`);
  return tags.join('');
}

function renderOnboardingCard(hints) {
  return `
    <div class="onboarding-card">
      <div class="onb-section">
        <div class="onb-title">🎯 本局目标</div>
        <div class="onb-content">${escapeHtml(hints.goal)}</div>
      </div>
      <div class="onb-section">
        <div class="onb-title">⚠ 致命风险</div>
        <ul class="onb-list">
          ${hints.topRisks.map(r => `<li>${escapeHtml(r)}</li>`).join('')}
        </ul>
      </div>
      <div class="onb-section">
        <div class="onb-title">💡 推荐首操作</div>
        <div class="onb-content">${escapeHtml(hints.firstActionHint)}</div>
      </div>
    </div>
  `;
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
        ${metricTile('现金 (亿)', m.cash.toFixed(1), '', toneFromClass(cashColor(m.cash)), Math.min(100, m.cash * 10), m.cash < due ? '覆盖不足' : '可覆盖')}
        ${metricTile('本季到期 (亿)', due.toFixed(1), '', due > m.cash ? 'bad' : 'warn', Math.min(100, due * 10), `未来合计 ${sumDebt(m.debtMaturity, state.quartersPassed, 4).toFixed(1)}`)}
        ${metricTile('资产负债率', m.leverageRatio.toFixed(1), '%', toneFromClass(levColor(m.leverageRatio)), m.leverageRatio, '监管观察')}
        ${metricTile('授信使用率', Math.round(m.creditUsage), '%', toneFromClass(creditColor(m.creditUsage)), m.creditUsage, `${m.creditUsed?.toFixed?.(1) || '-'} / ${m.creditTotal || '-'}`)}
        ${metricTile('综合融资成本', m.financingCost.toFixed(2), '%', toneFromClass(costColor(m.financingCost)), Math.min(100, m.financingCost * 10), '加权成本')}
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
        ${metricTile('净值 (NAV)', m.nav.toFixed(3), '', toneFromClass(navColor), navPct, `${(m.nav - 1).toFixed(3)}`)}
        ${metricTile('组合久期', m.duration.toFixed(1), 'Y', 'neutral', Math.min(100, m.duration * 14), '利率暴露')}
        ${metricTile('AA 及以下', m.creditExposure.toFixed(0), '%', toneFromClass(ceColor), m.creditExposure, '信用敞口')}
        ${metricTile('持仓集中度', m.concentration.toFixed(1), '%', toneFromClass(concColor), Math.min(100, m.concentration * 4), '单券上限 25%')}
        ${metricTile('回购杠杆', m.leverage.toFixed(0), '%', toneFromClass(levColor), Math.min(100, (m.leverage - 80) * 1.6), '监管线 140%')}
        ${metricTile('流动性资产', liquidAssets.toFixed(1), '亿', m.cashRatio < 5 ? 'bad' : (m.cashRatio < 10 ? 'warn' : 'ok'), Math.min(100, m.cashRatio * 5), `现金 ${m.cashRatio.toFixed(1)}%`)}
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
        ${metricTile('财政现金 (亿)', m.cash.toFixed(1), '', toneFromClass(cashColor), Math.min(100, m.cash * 4), '本季可用')}
        ${metricTile('综合债务率', m.debtRatio.toFixed(0), '%', toneFromClass(debtColor), Math.min(100, (m.debtRatio - 150) / 1.5), '红线 300%')}
        ${metricTile('隐债债务 (亿)', m.hiddenDebtRisk.toFixed(0), '', toneFromClass(hiddenColor), Math.min(100, m.hiddenDebtRisk / 2), '巡查风险')}
        ${metricTile('政绩评分', Math.round(m.politicalScore), '/100', toneFromClass(polColor), m.politicalScore, '免职线 20')}
        ${metricTile('专项债额度', m.specialBondQuota.toFixed(0), '亿', m.specialBondQuota < 5 ? 'warn' : 'ok', Math.min(100, m.specialBondQuota * 4), '可置换')}
        ${metricTile('产业指数', Math.round(m.industryIndex), '', m.industryIndex < 30 ? 'warn' : 'ok', m.industryIndex, '发展动能')}
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

function metricTile(label, value, unit, tone, pct, meta) {
  return `
    <div class="metric-tile tone-${tone || 'neutral'}">
      <div class="metric-tile-head">
        <span class="metric-name">${escapeHtml(label)}</span>
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
    return `<div class="event-card"><div class="event-header"><div><span class="event-code">IDLE</span><span class="event-badge">季末预演</span></div><span class="event-time">T+0</span></div>
            <div class="event-title">本回合无主线事件</div>
            <div class="event-body">你可以使用主动操作或直接结束本季度。</div></div>`;
  }
  const e = state.pendingEvent;
  const isMain = e.id.startsWith('main_');
  const eventCode = getEventCode(e.id);
  const badge = getEventBadge(state, e);
  return `
    <div class="event-card">
      <div class="event-header">
        <div class="event-id-line">
          <span class="event-code">${eventCode}</span>
          <span class="event-badge">${badge}</span>
          <span class="event-source">来源 · ${isMain ? '主线' : '市场'}</span>
        </div>
        <span class="event-time">T+0 · ${state.role?.id === 'im' ? '14:08' : (state.role?.id === 'gov' ? '10:00' : '09:32')}</span>
      </div>
      <div class="event-title">${escapeHtml(e.title)}</div>
      <div class="event-body">${escapeHtml(e.body).replace(/\n/g, '<br>')}</div>
      <div class="event-choices">
        ${e.choices.map((c, i) => `
          <button class="choice-btn" data-choice-idx="${i}">
            <div class="choice-head">
              <span class="choice-tag">${String.fromCharCode(65+i)} ▸</span>
              ${renderChoiceMeta(c)}
            </div>
            <span class="choice-label">${escapeHtml(c.label)}</span>
            ${renderChoicePreview(c, state.role)}
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

// 选项 effects 预告（设计稿 §3.11.3）
// 把数值型 effects 翻译成"赎回压力 -8 / 现金 +1.5%"等可读字串
function renderChoicePreview(choice, role) {
  const fx = choice.effects || {};
  const previews = [];
  const labels = role?.metricLabels || {};
  const dimLabels = role?.dimensionLabels || {};
  for (const [k, v] of Object.entries(fx)) {
    if (k.startsWith('_') || typeof v !== 'number') continue;
    if (k.startsWith('score.')) {
      const dim = k.slice(6);
      const lbl = dimLabels[dim] || dim;
      previews.push(`${lbl} ${v > 0 ? '+' : ''}${v}`);
    } else {
      const lbl = labels[k] || k;
      previews.push(`${lbl} ${v > 0 ? '+' : ''}${v}`);
    }
  }
  if (previews.length === 0) return '';
  return `<div class="choice-preview"><span>PREDICTED · 预计</span>${escapeHtml(previews.slice(0, 4).join('，'))}</div>`;
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

// 右栏底部"市场脉冲"小面板（角色共用）
function renderMarketPulsePanel(state) {
  const policy = state.policyValue || 0;
  const dir = policy < -1 ? '收紧' : (policy > 1 ? '放松' : '震荡');
  const dirTone = policy < -1 ? 'tight' : (policy > 1 ? 'loose' : 'neutral');
  const pulses = [
    { label: '政策方向', value: dir, tone: dirTone },
    { label: '政策值', value: `${policy >= 0 ? '+' : ''}${policy}`, tone: 'neutral' },
    { label: '本回合事件', value: state.pendingEvent ? '已推送' : '空窗', tone: state.pendingEvent ? 'tight' : 'neutral' },
  ];
  return `
    <div class="chart-panel pulse-panel">
      <div class="panel-title panel-title-row">
        <span><span class="section-mark">⌁</span> 市场脉冲</span>
        <span class="panel-kicker">PULSE</span>
      </div>
      <div class="pulse-rows">
        ${pulses.map(p => `
          <div class="pulse-row">
            <span class="pulse-label">${escapeHtml(p.label)}</span>
            <span class="pulse-value pulse-${p.tone}">${escapeHtml(p.value)}</span>
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
