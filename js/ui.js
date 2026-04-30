// js/ui.js

const REGION_LABELS = {
  east_core: '东部核心', central_capital: '中部省会',
  west_prefecture: '西部地级市', northeast_old: '东北老工业区'
};
const HEALTH_LABELS = { good: '财务健康', medium: '财务一般', weak: '财务承压' };

export function renderFateCard(origin, onAccept) {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="screen active">
      <div class="fate-container">
        <div class="fate-title">债市生存游戏</div>
        <div class="fate-subtitle">你的命运已定</div>
        <div class="fate-card">
          <div class="role-badge">角色 · 城投财务总监</div>
          <div class="role-name">${escapeHtml(origin.directorName)}</div>
          <div class="role-org">${escapeHtml(origin.platformName)}</div>
          <div class="fate-tags">
            <span class="tag tag-region">${origin.labels.region}</span>
            <span class="tag tag-type">${origin.labels.business}</span>
            <span class="tag tag-warn">⚠ ${origin.labels.tag}</span>
          </div>
          <div class="challenges">
            <div class="challenges-title">你这局的三大挑战</div>
            ${origin.challenges.map((c, i) => `
              <div class="challenge-item">
                <span class="challenge-num">0${i+1}</span>
                <span class="challenge-text">${escapeHtml(c)}</span>
              </div>
            `).join('')}
          </div>
          <button id="btn-accept-fate" class="start-btn">接受命运，开始游戏 →</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('btn-accept-fate').addEventListener('click', onAccept);
}

export function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

export function renderMainScreen(state, callbacks) {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="screen active">
      ${renderTopBar(state)}
      <div class="main-grid">
        <div>${renderMetricsPanel(state)}${renderActionPanel(state)}</div>
        <div class="event-area" id="event-area">${renderEventArea(state)}</div>
        <div id="chart-area">${renderChartArea(state)}</div>
      </div>
      ${renderStatusBar(state)}
    </div>
  `;
  bindMainScreenEvents(state, callbacks);
}

function renderTopBar(state) {
  const policyPct = ((state.policyValue + 5) / 10) * 100;
  const policyLabel = getPolicyLabelText(state.policyValue);
  return `
    <div class="topbar">
      <div class="topbar-left">
        <span class="game-id">债市生存 · 财务总监</span>
        <span class="quarter-badge">${state.year}年 Q${state.quarter}</span>
        <div class="policy-axis">
          <span class="policy-label">政策环境</span>
          <div class="axis-track">
            <div class="axis-fill" style="width:100%"></div>
            <div class="axis-marker" style="left:${policyPct}%"></div>
          </div>
          <span class="policy-status">${policyLabel}</span>
        </div>
      </div>
      <span class="timer">剩余操作：${2 - state.actionsUsed}次 / 本回合</span>
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
  return `
    <div class="panel">
      <div class="panel-title">核心指标</div>
      ${metricRow('现金余量', m.cash.toFixed(1) + '亿', cashColor(m.cash), Math.min(100, m.cash * 10))}
      ${metricRow('资产负债率', m.leverageRatio.toFixed(1) + '%', levColor(m.leverageRatio), m.leverageRatio)}
      ${metricRow('授信使用率', m.creditUsage + '%', creditColor(m.creditUsage), m.creditUsage)}
      ${metricRow('综合融资成本', m.financingCost.toFixed(2) + '%', costColor(m.financingCost), Math.min(100, m.financingCost * 10))}
      ${metricRow('抵押物剩余', collLabel(m.collateralRoom), collColor(m.collateralRoom), collValue(m.collateralRoom))}
      <div class="metric">
        <div class="metric-row">
          <span class="metric-name">项目投资缺口</span>
          <span class="metric-value val-bad">-${m.projectGap.toFixed(1)}亿/季</span>
        </div>
      </div>
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
    return `<div class="event-card"><div class="event-type">本回合无主线事件</div>
            <div class="event-body">你可以使用主动操作或直接结束本季度。</div></div>`;
  }
  const e = state.pendingEvent;
  const isMain = e.id.startsWith('main_');
  return `
    <div class="event-card">
      <div class="event-type">${isMain ? '📌 主线事件' : '📎 支线事件'} · ${state.year} Q${state.quarter}</div>
      <div class="event-title">${escapeHtml(e.title)}</div>
      <div class="event-body">${escapeHtml(e.body).replace(/\n/g, '<br>')}</div>
      <div class="event-choices">
        ${e.choices.map((c, i) => `
          <button class="choice-btn" data-choice-idx="${i}">
            <span class="choice-tag">[${String.fromCharCode(65+i)}]</span>${escapeHtml(c.label)}
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

function renderActionPanel(state) {
  // 在这里调用，假设CFO_ACTIONS和isActionAvailable通过callbacks注入
  return `
    <div class="panel" style="margin-top:14px">
      <div class="panel-title">主动操作</div>
      <div class="ops-remain">本回合剩余操作：<span style="color:#4fc3f7">${2 - state.actionsUsed}次</span></div>
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
    actionList.innerHTML = callbacks.actions.map(a => {
      const avail = callbacks.isAvailable(a.id);
      const disabled = !avail.available || state.actionsUsed >= 2 || state.pendingEvent;
      return `
        <div class="action-slot" data-action-id="${a.id}" style="${disabled ? 'opacity:0.4;pointer-events:none' : ''}">
          <span class="action-name">${a.name}</span>
          <span class="action-cost">${avail.available ? '消耗1次' : avail.reason}</span>
        </div>
      `;
    }).join('');
    document.querySelectorAll('.action-slot[data-action-id]').forEach(slot => {
      slot.addEventListener('click', () => callbacks.onActionSelected(slot.dataset.actionId));
    });
  }
}

function renderStatusBar(state) {
  return `
    <div class="statusbar">
      <span class="status-item">目标：存活至 <span>2024年Q4</span></span>
      <span class="status-item">已过回合：<span>${state.quartersPassed}/12</span></span>
      <span class="status-item">政策环境：<span>${getPolicyLabelText(state.policyValue)}</span></span>
    </div>
  `;
}

function renderChartArea(state) {
  return `
    <div class="chart-panel">
      <div class="panel-title">债务到期瀑布图（亿）</div>
      <div style="height:90px"><canvas id="chart-debt"></canvas></div>
    </div>
    <div class="chart-panel">
      <div class="panel-title">现金余量走势（亿）</div>
      <div style="height:90px"><canvas id="chart-cash"></canvas></div>
    </div>
  `;
}
