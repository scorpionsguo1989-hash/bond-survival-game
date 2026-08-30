// js/runTimeline.js
// 局末复盘时间轴：把一局的决策、操作、危机、指标变化按季串成一条可读的线。
//
// 原来终局页只有一个平铺的「决策对比」列表，既没有时间轴也没有转折标注，
// 玩家看不出自己是从哪一步开始走岔的。纯函数，便于测试，也便于将来做分享长图。
import { resolveEventView } from './eventEngine.js';
import { GAME_CONFIG } from './config.js';

// 每个角色的"主账户"：复盘时间轴上跟着走的那条线
const PRIMARY = {
  cfo: { key: 'cash', label: '现金', digits: 2 },
  im: { key: 'nav', label: '净值', digits: 4 },
  gov: { key: 'debtRatio', label: '债务率', digits: 1 },
};

function quarterLabel(index) {
  const total = index - 1;
  const year = GAME_CONFIG.startYear + Math.floor((GAME_CONFIG.startQuarter - 1 + total) / 4);
  const q = ((GAME_CONFIG.startQuarter - 1 + total) % 4) + 1;
  return `${year} Q${q}`;
}

/**
 * @returns {Array<{quarter, label, policyValue, event, actions, crisis, marks, primary, deathReason}>}
 */
export function buildRunTimeline(state, content) {
  if (!state) return [];
  const roleId = state.origin?.role || state.role?.id || 'cfo';
  const primarySpec = PRIMARY[roleId] || PRIMARY.cfo;

  // 反查事件：把各内容池摊平成一张表（含开场事件，否则 Q1 会显示"未知事件"）
  const all = [
    ...((content?.main) || []), ...((content?.random) || []),
    ...((content?.blackSwans) || []), ...((content?.sagaEvents) || []),
    ...((content?.openingEvents) || []),
  ];
  const eventById = new Map(all.map(e => [e.id, e]));
  const swanIds = new Set(state.blackSwansSeen || []);

  // 按季归位：eventLog 带 quarter 时按它走；老存档没有就按顺序兜底
  const eventsByQuarter = new Map();
  (state.eventLog || []).forEach((log, i) => {
    const q = Number.isInteger(log.quarter) ? log.quarter : i + 1;
    if (!eventsByQuarter.has(q)) eventsByQuarter.set(q, log);
  });
  const actionsByQuarter = new Map();
  for (const a of (state.actionLog || [])) {
    if (!actionsByQuarter.has(a.quarter)) actionsByQuarter.set(a.quarter, []);
    actionsByQuarter.get(a.quarter).push(a);
  }
  const crisisByQuarter = new Map();
  for (const c of (state.crisisLog || [])) crisisByQuarter.set(c.quarter, c);

  const rows = [];
  const totalQuarters = state.quartersPassed || 0;
  for (let q = 1; q <= totalQuarters; q++) {
    const snapshot = state.history?.[q - 1] || {};
    const prev = q >= 2 ? (state.history?.[q - 2] || {}) : null;
    const value = Number(snapshot[primarySpec.key] ?? 0);
    const delta = prev ? value - Number(prev[primarySpec.key] ?? value) : 0;

    const log = eventsByQuarter.get(q) || null;
    let event = null;
    if (log) {
      const view = resolveEventView(eventById.get(log.eventId), roleId);
      event = {
        id: log.eventId,
        title: view.title,
        choiceLabel: view.choices[log.choiceIdx]?.label
          || `选项 ${String.fromCharCode(65 + (log.choiceIdx || 0))}`,
        outcome: log.uncertainOutcome === 'failed' ? '没成'
          : log.uncertainOutcome === 'succeeded' ? '成了' : null,
      };
    }

    const crisis = crisisByQuarter.get(q) || null;
    const marks = [];
    if (log && swanIds.has(log.eventId)) marks.push('black_swan');
    if (crisis) marks.push('crisis');
    if (log?.uncertainOutcome === 'failed') marks.push('gamble_lost');
    if (!state.survived && q === totalQuarters) marks.push('death');

    rows.push({
      quarter: q,
      label: quarterLabel(q),
      policyValue: Number(snapshot.policyValue ?? 0),
      event,
      actions: actionsByQuarter.get(q) || [],
      crisis,
      marks,
      primary: {
        key: primarySpec.key,
        label: primarySpec.label,
        digits: primarySpec.digits,
        value,
        delta,
      },
      deathReason: (!state.survived && q === totalQuarters) ? state.deathReason : null,
    });
  }
  return rows;
}
