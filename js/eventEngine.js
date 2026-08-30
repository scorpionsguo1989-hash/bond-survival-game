// js/eventEngine.js
// 角色感知事件加载/筛选（Plan 3 T3）
import { getCurrentAct } from './scripts.js';
import { GAME_CONFIG } from './config.js';
import { gameRandom } from './rng.js';

/**
 * 找到指定季度的主线事件，按角色拍平后返回。
 * 旧签名 findMainEvent(events, year, quarter) 仍兼容（roleId 默认 'cfo'）。
 */
export function findMainEvent(mainEvents, year, quarter, roleId = 'cfo') {
  const matching = mainEvents.filter(e =>
    e.trigger.year === year &&
    e.trigger.quarter === quarter &&
    e.roles && e.roles[roleId]
  );
  if (matching.length === 0) return null;
  const event = matching[Math.floor(gameRandom() * matching.length)];
  return flattenForRole(event, roleId);
}

export function getPolicyDirection(axisValue) {
  if (axisValue <= -2) return 'tight';
  if (axisValue >= 2) return 'loose';
  return 'stable';
}

/**
 * 加权抽随机事件，按角色拍平。
 * 旧签名 sampleRandomEvents(pool, dir, count) 仍兼容（roleId 默认 'cfo'）。
 */
export function sampleRandomEvents(pool, policyDirection, count, roleId = 'cfo', state = null) {
  const min = count.min;
  const max = count.max;
  const targetCount = min + Math.floor(gameRandom() * (max - min + 1));
  if (targetCount === 0) return [];

  // 先按角色 + 触发条件过滤。state 为空时保持旧行为，只做角色过滤。
  const filtered = pool.filter(e =>
    e.roles && e.roles[roleId] && (!state || passesTriggerCondition(e, state, roleId))
  );
  const remaining = [...filtered];
  const result = [];
  for (let i = 0; i < targetCount && remaining.length > 0; i++) {
    const totalWeight = remaining.reduce((s, e) => s + getEventWeight(e, policyDirection), 0);
    let r = gameRandom() * totalWeight;
    let pickedIdx = 0;
    for (let j = 0; j < remaining.length; j++) {
      r -= getEventWeight(remaining[j], policyDirection);
      if (r <= 0) { pickedIdx = j; break; }
    }
    result.push(flattenForRole(remaining[pickedIdx], roleId));
    remaining.splice(pickedIdx, 1);
  }
  return result;
}

function getEventWeight(event, policyDirection) {
  if (typeof event.weight === 'number') return event.weight;
  return event.weight?.[policyDirection] ?? 1;
}

/** 把多角色嵌套事件拍平为单角色视角 */
function flattenForRole(event, roleId) {
  const r = event.roles[roleId];
  return {
    ...event,
    body: r.body,
    choices: r.choices,
    policyShift: event.policyShift || 0,
    type: event.type,
    kind: event.kind || 'normal',  // 'normal' | 'black_swan'
    swanTag: event.swanTag || null, // 黑天鹅副标题（如"区域信用重定价"）
  };
}

/**
 * 统一取事件的展示视角，抹平两套 schema：
 *  - 常规事件：choices 在 roles[roleId] 下
 *  - 开场事件：单角色专属，choices 直接在顶层
 * 终局页复盘和分享卡都要靠这个反查历史 eventLog，取不到就会显示「未知事件 / 选项 A」。
 */
export function resolveEventView(event, roleId = 'cfo') {
  if (!event) return { title: '未知事件', choices: [] };
  const nested = event.roles?.[roleId];
  const choices = nested?.choices || (Array.isArray(event.choices) ? event.choices : []);
  return {
    title: event.title || '未知事件',
    body: nested?.body ?? event.body ?? '',
    choices,
  };
}

function valueMatches(conditionValue, actualValue) {
  if (conditionValue == null) return true;
  if (Array.isArray(conditionValue)) return conditionValue.includes(actualValue);
  return conditionValue === actualValue;
}

export function passesTriggerCondition(event, state, roleId = 'cfo') {
  const tc = event?.triggerCondition;
  if (!tc) return true;
  const quarter = state.quartersPassed || 0;
  const policyValue = state.policyValue || 0;
  const origin = state.origin || {};
  const metrics = state.metrics || {};

  if (tc.minQuarter != null && quarter < tc.minQuarter) return false;
  if (tc.maxQuarter != null && quarter > tc.maxQuarter) return false;
  if (tc.requireRole != null && !valueMatches(tc.requireRole, roleId)) return false;
  if (tc.regionTier != null && !valueMatches(tc.regionTier, origin.regionTier)) return false;
  if (tc.healthLevel != null && !valueMatches(tc.healthLevel, origin.healthLevel)) return false;
  if (tc.policyMin != null && policyValue < tc.policyMin) return false;
  if (tc.policyMax != null && policyValue > tc.policyMax) return false;
  if (tc.cashMax != null && (metrics.cash ?? Infinity) > tc.cashMax) return false;
  if (tc.cashMin != null && (metrics.cash ?? -Infinity) < tc.cashMin) return false;
  if (tc.navMax != null && (metrics.nav ?? Infinity) > tc.navMax) return false;
  if (tc.navMin != null && (metrics.nav ?? -Infinity) < tc.navMin) return false;
  if (tc.debtRatioMin != null && (metrics.debtRatio ?? -Infinity) < tc.debtRatioMin) return false;
  if (tc.debtRatioMax != null && (metrics.debtRatio ?? Infinity) > tc.debtRatioMax) return false;
  if (tc.leverageRatioMin != null && (metrics.leverageRatio ?? -Infinity) < tc.leverageRatioMin) return false;
  if (tc.leverageRatioMax != null && (metrics.leverageRatio ?? Infinity) > tc.leverageRatioMax) return false;
  return true;
}

export function findSagaEvent(sagaEvents, eventId, roleId = 'cfo') {
  const event = (sagaEvents || []).find(e => e.id === eventId && e.roles?.[roleId]);
  return event ? flattenForRole(event, roleId) : null;
}

export function getNextSagaEventId(event, choiceIdx) {
  if (!event?.next_saga_step_map) return null;
  return event.next_saga_step_map[String(choiceIdx)] || null;
}

export function getEligibleSagaStartEvents(sagaEvents, state, roleId = 'cfo') {
  const seenEventIds = new Set([
    ...((state?.sagaSeenIds) || []),
    ...((state?.eventLog) || []).map(log => log.eventId).filter(Boolean),
  ]);
  const completedSagaIds = new Set((state?.completedSagaIds) || []);
  return (sagaEvents || []).filter(ev =>
    ev?.saga_step === 1 &&
    ev.roles?.[roleId] &&
    !seenEventIds.has(ev.id) &&
    !completedSagaIds.has(ev.saga_id) &&
    passesTriggerCondition(ev, state || {}, roleId)
  );
}

// ─────────────────────────────────────────────
// 黑天鹅事件抽取
// ─────────────────────────────────────────────

const BS_BASE_RATE = 0.07;          // 基础概率 7%/季
const BS_LATE_BOOST = 0.04;         // Q ≥ 6 后再加 4%
const BS_STRESS_BOOST = 0.05;       // 处于压力状态再加 5%
const BS_MAX_PER_GAME = 2;          // 一局最多触发的次数

function isUnderStress(state, roleId) {
  const m = state.metrics || {};
  if (roleId === 'cfo' && (m.cash < 3 || m.leverageRatio >= 72)) return true;
  if (roleId === 'im' && (m.nav < 0.92 || (m.redemptionPressure || 0) >= 50)) return true;
  if (roleId === 'gov' && (m.cash < 2 || m.debtRatio >= 270)) return true;
  return false;
}

/**
 * 决定本季是否触发黑天鹅。返回 boolean。
 * 触发概率：
 *   - 优先用当前幕的 swanRate（多周期叙事）
 *   - 否则按基础公式（base + 中后期 + 压力）
 *   - 已触发上限或上一回合刚出过则强制 false
 */
export function shouldTriggerBlackSwan(state, roleId) {
  const seen = (state.blackSwansSeen || []).length;
  if (seen >= BS_MAX_PER_GAME) return false;

  // 上一回合刚出过黑天鹅则跳过（避免连发）
  const lastEvent = state.eventLog?.[state.eventLog.length - 1];
  if (lastEvent && (state.blackSwansSeen || []).some(id => id === lastEvent.eventId)) {
    return false;
  }

  // 优先用当前幕的 swanRate，否则按默认公式
  const act = getCurrentAct(state);
  let p;
  if (act && typeof act.swanRate === 'number') {
    p = act.swanRate;
    // 在压力状态下额外+3%，给紧张局面更多戏剧性
    if (isUnderStress(state, roleId)) p += 0.03;
  } else {
    p = BS_BASE_RATE;
    if ((state.quartersPassed || 0) >= 6) p += BS_LATE_BOOST;
    if (isUnderStress(state, roleId)) p += BS_STRESS_BOOST;
  }

  return gameRandom() < p;
}

/**
 * 从黑天鹅池里挑一个：先过滤 (角色支持 + 触发条件 + 未见过)，再加权抽取。
 * 返回拍平后的事件，或 null（无可用候选）。
 */
// 黑天鹅冷却：相邻两次黑天鹅如果同 swanTag（同主题），后一次权重打 0.15 折
// 避免一局连发两个"区域信用重定价"或两个"流动性脉冲"，让冲击多样化
const BS_SAME_TAG_PENALTY = 0.15;

export function sampleBlackSwan(pool, state, roleId) {
  if (!Array.isArray(pool) || pool.length === 0) return null;
  const seenIds = new Set(state.blackSwansSeen || []);
  const lastSwanTag = state.lastSwanTag || null;
  const act = getCurrentAct(state);
  const actFilter = act?.swanFilter || null;

  const candidates = pool.filter(ev => {
    if (!ev?.id || seenIds.has(ev.id)) return false;
    if (!ev.roles?.[roleId]) return false;
    // 当前幕的过滤：只选满足 actFilter.policyMin/policyMax 的事件
    // （如：危机期只放悲观黑天鹅；扩张期只放积极黑天鹅）
    if (actFilter) {
      const evShift = ev.policyShift || 0;
      if (actFilter.policyMin != null && evShift < actFilter.policyMin) return false;
      if (actFilter.policyMax != null && evShift > actFilter.policyMax) return false;
    }
    // 事件级触发条件
    if (!passesTriggerCondition(ev, state, roleId)) return false;
    return true;
  });

  if (candidates.length === 0) return null;

  // 加权抽取：默认 weight 1；如果与上一个黑天鹅的 swanTag 相同 → 权重打 0.15 折
  const weightOf = (ev) => {
    let w = ev.weight || 1;
    if (lastSwanTag && ev.swanTag && ev.swanTag === lastSwanTag) {
      w *= BS_SAME_TAG_PENALTY;
    }
    return w;
  };

  const totalWeight = candidates.reduce((s, e) => s + weightOf(e), 0);
  let r = gameRandom() * totalWeight;
  for (const ev of candidates) {
    r -= weightOf(ev);
    if (r <= 0) return flattenForRole(ev, roleId);
  }
  return flattenForRole(candidates[candidates.length - 1], roleId);
}

async function fetchJsonOr(url, fallback) {
  try {
    const resp = await fetch(url);
    if (!resp || resp.ok === false) return fallback;
    const data = await resp.json();
    return data == null ? fallback : data;
  } catch (e) {
    console.warn(`[eventEngine] ${url} missing or invalid, skipping:`, e.message);
    return fallback;
  }
}

export async function loadEvents() {
  // 优先路径：从后端鉴权 API 拿 bundle（防 wget content/*.json 白嫖）
  // Fallback：旧的直接 fetch content/*.json（开发期 / 后端未改造时仍能跑）
  const apiBundle = await tryLoadFromApi();
  if (apiBundle) {
    console.log('[loadEvents] 走鉴权 API · 内容已加水印');
    return apiBundle;
  }
  console.warn('[loadEvents] API 不可用，降级到 fetch content/*.json（开发模式）');

  const [main, random, randomIm, randomGov, blackSwans, blackSwansV2, seasonalEvents, targetedEvents, sagaEvents, npcLibrary, openingEvents, historicalSagas] = await Promise.all([
    fetchJsonOr('content/mainEvents.json', []),
    fetchJsonOr('content/randomEvents.json', []),
    fetchJsonOr('content/randomEventsIM.json', []),
    fetchJsonOr('content/randomEventsGOV.json', []),
    fetchJsonOr('content/blackSwans.json', []),
    fetchJsonOr('content/blackSwansV2.json', []),
    fetchJsonOr('content/seasonalEvents.json', []),
    fetchJsonOr('content/targetedEvents.json', []),
    fetchJsonOr('content/sagaEvents.json', []),
    fetchJsonOr('content/npcLibrary.json', {}),
    fetchJsonOr('content/openingEvents.json', { events: [] }),  // E 改造：Q1 开场事件
    fetchJsonOr('content/historicalSagas.json', { events: [] }),  // 历史复盘 saga（4 万亿 / 钱荒 / 11 超日 / 43 号文 / 资管新规 / 包商 / ...）
  ]);

  // 历史 saga 合并到现有 saga 池（hermes 引擎已支持 triggerCondition / next_saga_step_map）
  const histSagaArr = Array.isArray(historicalSagas) ? historicalSagas : (historicalSagas?.events || []);

  return {
    main,
    random: [...random, ...randomIm, ...randomGov, ...seasonalEvents, ...targetedEvents],
    blackSwans: [...blackSwans, ...blackSwansV2],
    sagaEvents: [...sagaEvents, ...histSagaArr],
    npcLibrary,
    openingEvents: Array.isArray(openingEvents) ? openingEvents : (openingEvents?.events || []),
  };
}

// 走鉴权 API 取 bundle（contentVault.serveBundle 输出的结构与上面 return 1:1 对齐）
async function tryLoadFromApi() {
  try {
    // 注意：动态 import 避开 node 测试环境（没有 fetch / sessionStorage）
    const apiMod = await import('./api.js');
    const sid = await apiMod.fetchSessionId();
    if (!sid) return null;
    const bundle = await apiMod.fetchContentBundle(sid);
    if (!bundle) return null;
    return bundle;
  } catch (e) {
    console.warn('[loadEvents] tryLoadFromApi error:', e);
    return null;
  }
}

/**
 * 决定本季呈现哪个事件。这是唯一的取事件入口，main.js 只负责把 statePatch 合进 state。
 *
 * 优先级：开场事件 → saga 强制接续 → 黑天鹅 → 按 eventMix 配比在主线 / saga 链头 / 随机池之间抽签。
 *
 * 关键点：主线不再无条件优先。mainEvents 覆盖了 12 个季度 × 3 角色，如果主线优先，
 * 253 条随机事件和 189 条 saga（含 30 条历史复盘）就永远抽不到——这是原实现的行为。
 *
 * @returns {{event: object|null, source: 'opening'|'saga'|'black_swan'|'main'|'random'|null, statePatch: object}}
 */
export function pickTurnEvent(content, state, roleId = 'cfo') {
  const patch = {};
  const done = (event, source) => ({ event, source, statePatch: { ...patch, pendingEvent: event } });

  // 1) 开场事件：每局 Q1 触发一次。池子里没有匹配的也标记 consumed，避免每季重试。
  if ((state.quartersPassed || 0) === 0 && !state.openingEventConsumed) {
    patch.openingEventConsumed = true;
    const opening = pickOpeningEvent(content.openingEvents || [], state);
    if (opening) return done(opening, 'opening');
  }

  // 2) saga 强制接续：上一季的选择指向了下一步，优先级高于主线和随机池。
  //    内容文件缺该 ID 时清空指针继续走正常流程，避免坏存档卡死。
  if (state.nextSagaEventId) {
    patch.nextSagaEventId = null;
    const saga = findSagaEvent(content.sagaEvents || [], state.nextSagaEventId, roleId);
    if (saga) return done(saga, 'saga');
  }

  // 3) 黑天鹅：命中则取代本季事件（包括主线）
  if (shouldTriggerBlackSwan(state, roleId)) {
    const swan = sampleBlackSwan(content.blackSwans || [], state, roleId);
    if (swan) {
      patch.blackSwansSeen = [...(state.blackSwansSeen || []), swan.id];
      patch.lastSwanTag = swan.swanTag || null;  // 给下一次黑天鹅的"同 tag 冷却"用
      return done(swan, 'black_swan');
    }
  }

  const { mainEventRate, sagaStartRate } = GAME_CONFIG.eventMix;
  const pickMain = () => findMainEvent(content.main || [], state.year, state.quarter, roleId);

  // 4) 主线季
  if (gameRandom() < mainEventRate) {
    const main = pickMain();
    if (main) return done(main, 'main');
  }

  // 5) 非主线季：先看能不能起一条 saga 长线，否则走随机 / 季节 / 定向事件池
  const dir = getPolicyDirection(state.policyValue || 0);
  const sagaStarts = getEligibleSagaStartEvents(content.sagaEvents || [], state, roleId);
  if (sagaStarts.length && gameRandom() < sagaStartRate) {
    const [saga] = sampleRandomEvents(sagaStarts, dir, { min: 1, max: 1 }, roleId, state);
    if (saga) return done(saga, 'saga');
  }
  const [random] = sampleRandomEvents(content.random || [], dir, { min: 1, max: 1 }, roleId, state);
  if (random) return done(random, 'random');

  // 6) 兜底：池子被 triggerCondition 筛空了就回主线，主线也没有才交空回合
  const fallback = pickMain();
  return fallback ? done(fallback, 'main') : done(null, null);
}

/**
 * E 改造：从 openingEvents 池子里挑一个开场事件。
 * 优先 role + scriptId 都精准命中；没命中就找仅 role 命中且无 scriptId 的 generic 兜底。
 * 若池子空 / 角色不在池中，返回 null（main.js 会 fallback 到正常事件流程）。
 */
export function pickOpeningEvent(pool, state) {
  const roleId = state?.origin?.role || state?.role?.id || 'cfo';
  const scriptId = state?.scriptId;
  const exact   = pool.filter(e => e.role === roleId && e.scriptId === scriptId);
  const generic = pool.filter(e => e.role === roleId && !e.scriptId);
  const candidates = exact.length ? exact : generic;
  if (!candidates.length) return null;
  return candidates[Math.floor(gameRandom() * candidates.length)];
}
