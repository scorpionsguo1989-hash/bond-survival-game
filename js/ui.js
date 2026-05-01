// js/ui.js
import { renderRadarChart } from './charts.js';

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

export function renderCrisisModal(crisis, onSelect) {
  const overlay = document.createElement('div');
  overlay.id = 'crisis-overlay';
  overlay.innerHTML = `
    <div class="screen active" style="position:fixed;inset:0;background:#0a0e1a;z-index:1000;overflow-y:auto;padding:20px">
      <div class="crisis-banner">⚠ 危机警报 · 时间暂停 · 必须处置后继续</div>
      <div class="crisis-center">
        <div class="crisis-card">
          <div class="crisis-title">${escapeHtml(crisis.title)}</div>
          <div class="crisis-body">${escapeHtml(crisis.body)}</div>
          <div class="crisis-metrics">
            ${crisis.metrics.map(m => `
              <div class="crisis-metric">
                <div class="crisis-metric-label">${m.label}</div>
                <div class="crisis-metric-value">${m.value}</div>
              </div>
            `).join('')}
          </div>
          <div class="crisis-options">
            ${crisis.options.map((o, i) => `
              <div class="crisis-option" data-opt-idx="${i}">
                <div class="crisis-option-header">
                  <span class="crisis-option-name">${escapeHtml(o.label)}</span>
                  <span class="crisis-option-cost cost-${costClass(o.cost)}">代价：${o.cost}</span>
                </div>
                <div class="crisis-option-desc">${escapeHtml(o.desc)}</div>
              </div>
            `).join('')}
          </div>
        </div>
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

function costClass(cost) {
  if (cost.includes('高')) return 'high';
  if (cost.includes('中')) return 'med';
  return 'low';
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

export function renderLeaderboardModal(leaderboardData, onClose) {
  const overlay = document.createElement('div');
  overlay.id = 'leaderboard-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(10,14,26,0.95);z-index:1000;overflow-y:auto;padding:20px';

  const rows = (leaderboardData || []).map(row => {
    const name = escapeHtml(row.nickname || row.directorName);
    const regionLabel = REGION_LABELS[row.regionTier] || row.regionTier;
    const healthLabel = HEALTH_LABELS[row.healthLevel] || row.healthLevel;
    return `
      <tr>
        <td class="lb-rank">#${row.rank}</td>
        <td class="lb-name">${name}</td>
        <td class="lb-platform">${escapeHtml(row.platformName)}</td>
        <td class="lb-difficulty">${regionLabel}·${healthLabel}</td>
        <td class="lb-grade grade-${row.grade}">${row.grade}</td>
        <td class="lb-score">${row.score}</td>
        <td class="lb-quarters">${row.quartersPassed}/12</td>
      </tr>
    `;
  }).join('');

  const emptyMsg = leaderboardData && leaderboardData.length > 0
    ? ''
    : '<tr><td colspan="7" style="text-align:center;color:#4a6080;padding:40px">暂无记录，等你来创造历史</td></tr>';

  overlay.innerHTML = `
    <div class="lb-container">
      <div class="lb-header">
        <span class="lb-title">排行榜 · Top 20</span>
        <button id="btn-lb-close" class="lb-close-btn">✕</button>
      </div>
      <table class="lb-table">
        <thead>
          <tr>
            <th>排名</th><th>昵称</th><th>平台</th><th>难度</th><th>评级</th><th>总分</th><th>存活</th>
          </tr>
        </thead>
        <tbody>${rows}${emptyMsg}</tbody>
      </table>
    </div>
  `;

  document.body.appendChild(overlay);
  document.getElementById('btn-lb-close').addEventListener('click', () => {
    overlay.remove();
    if (onClose) onClose();
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
