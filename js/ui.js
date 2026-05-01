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
  return `
    <div class="topbar">
      <div class="tb-left">
        <span class="tb-role-dot"></span>
        <span class="tb-role-name mono">${escapeHtml(short)} · ${escapeHtml(name)}</span>
        <span class="tb-sep"></span>
        <span class="tb-game-name">债市生存</span>
        <span class="tb-quarter mono">${escapeHtml(quarter)} · <b>第 ${state.quartersPassed + 1}/12 回合</b></span>
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
      <span class="k">${escapeHtml(m.k)}</span>
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

  return `
    <div class="event">
      <div class="event-head">
        <div class="event-meta">
          <span class="id mono">${escapeHtml(eventCode)}</span>
          <span class="sev ${sevInfo.cls}">${escapeHtml(sevInfo.label)}</span>
          <span class="src">来源 · ${ev.id?.startsWith('main_') ? '主线' : '市场'}</span>
        </div>
        <span class="event-time">T+0 · ${timeStr}</span>
      </div>
      <div class="event-title">${escapeHtml(ev.title)}</div>
      <div class="event-body">${highlightEventBody(ev.body)}</div>
      <div class="event-options">
        ${ev.choices.map((c, i) => `
          <button class="opt" data-choice-idx="${i}">
            <div class="opt-head">
              <span class="opt-key mono">${String.fromCharCode(65 + i)} ▸</span>
              <span class="opt-cost">${escapeHtml(getChoiceBusinessMeta(c, state.role))}</span>
            </div>
            <div class="opt-title">${escapeHtml(c.label)}</div>
            <div class="opt-foot">
              <span class="pred-label">PREDICTED · 预计</span>
              <span class="pred-text">${renderUIChoicePred(c, state.role)}</span>
            </div>
          </button>
        `).join('')}
      </div>
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
      lbl = dimLabels[dim] || dim;
    } else {
      lbl = labels[k] || k;
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
      <span class="sb-item"><span class="k">目标</span><b>${escapeHtml(goalText)}</b></span>
      <span class="sb-item"><span class="k">回合</span><b>${state.quartersPassed} / 12</b></span>
      <span class="sb-item"><span class="k">政策</span><b>${escapeHtml(policyLabelClean(state.policyValue))}</b></span>
      <span class="sb-spacer"></span>
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
