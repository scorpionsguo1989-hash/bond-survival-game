// js/gameLoop.js
// 一局游戏 = (seed, 玩家输入序列) 的纯函数。
//
// 这么拆有两个目的：
//   1. 服务端能按 seed + inputLog 重放整局、复算分数，排行榜才验得了；
//      在此之前分数是纯前端算的，validate.js 只查区间不复算，榜单等于装饰。
//   2. 状态流转从 main.js 的 DOM 回调里独立出来，可以被测试覆盖。
//
// main.js 只负责「拿输入 → 调 applyInput → 渲染」，不再自己改 state。
import { seedGame, gameRandom, getCursor, getSeed, restoreGame, newSeed } from './rng.js';
import { generateOrigin } from './origins/index.js';
import {
  createInitialState, advanceTurn, applyEventChoice,
  checkDeath, isGameOver, detectCrisis, canTakeAction,
} from './engine.js';
import { pickTurnEvent, getNextSagaEventId } from './eventEngine.js';
import { getCurrentAct } from './scripts.js';

/** 开一局。seed 省略时自动生成一个可分享的种子。 */
export function createGame(seed, content) {
  const usedSeed = seedGame(seed ?? newSeed());
  const origin = generateOrigin();
  const base = createInitialState(origin);
  const state = {
    ...base,
    seed: usedSeed,
    rngCursor: getCursor(),
    inputLog: [],          // [{t:'event'|'action'|'crisis'|'endTurn', ...}]
    actionLog: [],         // 主动操作明细，终局页/复盘用
    crisisLog: [],         // 危机处置明细
    pendingCrisis: null,
    lastCrisisQuarter: null,
    gameOver: false,
    newActEntered: null,   // 本季是否进入新幕，ui 用来放过场卡
  };
  return refreshCrisis(loadTurnEvent(state, content));
}

/**
 * 吃一个玩家输入，吐出新 state。非法输入原样返回且不记账——
 * 实况和重放走的是同一个函数，所以两边对"非法"的判断天然一致。
 */
export function applyInput(state, input, content) {
  if (!state || state.gameOver || !input) return state;
  ensureRngAt(state);

  let next;
  switch (input.t) {
    case 'event':   next = inputEvent(state, input); break;
    case 'crisis':  next = inputCrisis(state, input); break;
    case 'action':  next = inputAction(state, input); break;
    case 'endTurn': next = inputEndTurn(state, content); break;
    default: return state;
  }
  if (next === state) return state;

  next = {
    ...next,
    inputLog: [...(state.inputLog || []), input],
    rngCursor: getCursor(),
  };
  return refreshCrisis(next);
}

/** 从 seed + 输入序列还原整局。服务端复算就是调它。 */
export function replayGame({ seed, inputs }, content) {
  let state = createGame(seed, content);
  for (const input of (inputs || [])) {
    state = applyInput(state, input, content);
    if (state.gameOver) break;   // 多塞的输入不会把局推过 12 季
  }
  return state;
}

/**
 * 把全局随机流对齐到这个 state 的位置。
 *
 * RNG 是模块级单例（这样 origins/scripts/eventEngine 这些老函数不用逐个改签名接生成器）。
 * 代价是：交替推进两局、或从存档恢复后继续打，游标会错位。
 * 每次派发前按 state 自报的 (seed, rngCursor) 校一次，代价只在错位时发生，
 * 而游标一局也就几百步，重放很便宜。
 */
function ensureRngAt(state) {
  if (getSeed() !== state.seed || getCursor() !== (state.rngCursor || 0)) {
    restoreGame(state.seed, state.rngCursor || 0);
  }
}

// ─────────────────────────────────────────────
// 各类输入
// ─────────────────────────────────────────────

function inputEvent(state, { idx }) {
  const event = state.pendingEvent;
  if (!event || !Array.isArray(event.choices) || !event.choices[idx]) return state;

  const nextSagaEventId = getNextSagaEventId(event, idx);
  let s = applyEventChoice(state, event, idx);

  if (event.saga_id) {
    s = {
      ...s,
      sagaSeenIds: Array.from(new Set([...(s.sagaSeenIds || []), event.id])),
      completedSagaIds: nextSagaEventId
        ? (s.completedSagaIds || [])
        : Array.from(new Set([...(s.completedSagaIds || []), event.saga_id])),
      nextSagaEventId: nextSagaEventId || null,
    };
  }

  // NPC 记忆：本季选了某事件 → 给涉及的 NPC 加一次互动
  const involves = event.involves_npc;
  if (Array.isArray(involves) && involves.length) {
    const choiceLabel = event.choices[idx]?.label || '';
    const npcEncounters = { ...(s.npcEncounters || {}) };
    for (const npcId of involves) {
      const prev = npcEncounters[npcId] || { count: 0 };
      npcEncounters[npcId] = {
        count: prev.count + 1,
        lastQuarter: (s.quartersPassed || 0) + 1,
        lastEventTitle: event.title || '',
        lastChoiceLabel: choiceLabel,
      };
    }
    s = { ...s, npcEncounters };
  }

  return { ...s, pendingEvent: null };
}

function inputCrisis(state, { idx }) {
  const crisis = state.pendingCrisis;
  const option = crisis?.options?.[idx];
  if (!option) return state;

  // 不确定处置：掷骰走种子流，重放才对得上
  let success = true;
  if (option.effects?._uncertain !== undefined) {
    success = gameRandom() < option.effects._uncertain;
  }

  const metrics = { ...state.metrics };
  const score = { ...state.score };
  if (success) {
    Object.entries(option.effects || {}).forEach(([k, v]) => {
      if (k.startsWith('_')) return;
      if (k.startsWith('score.')) {
        const dim = k.slice(6);
        score[dim] = (score[dim] || 0) + v;
      } else if (k === 'collateralRoom') {
        if (v === 'downgrade') metrics.collateralRoom = metrics.collateralRoom === 'high' ? 'medium' : 'low';
        else if (v === 'upgrade') metrics.collateralRoom = metrics.collateralRoom === 'low' ? 'medium' : 'high';
      } else if (typeof v === 'number') {
        metrics[k] = parseFloat(((metrics[k] || 0) + v).toFixed(2));
      }
    });
  }

  return {
    ...state,
    metrics,
    score,
    pendingCrisis: null,
    crisisLog: [...(state.crisisLog || []), {
      quarter: (state.quartersPassed || 0) + 1,
      title: crisis.title, label: option.label, success,
    }],
    lastCrisisOutcome: { success, label: option.label },
  };
}

function inputAction(state, { id, params }) {
  const action = state.role?.actions?.find(a => a.id === id);
  if (!action) return state;
  if (!canTakeAction(state).allowed) return state;
  if (!state.role.isActionAvailable(state, id).available) return state;

  const s = state.role.applyActionEffects(state, id, params || {});
  return {
    ...s,
    actionLog: [...(state.actionLog || []), {
      quarter: (state.quartersPassed || 0) + 1, id, name: action.name, params: params || {},
    }],
  };
}

function inputEndTurn(state, content) {
  // 本季的事必须表态才能翻篇。原来直接结束回合就能把事件整个跳过
  // （实测全程不答也能走 7 季），于是"全是负面选项就不表态"成了免费规避。
  if (state.pendingCrisis?.options?.length) return state;
  if (state.pendingEvent?.choices?.length) return state;

  const dieNow = (s, reason) => ({
    ...s, survived: false, deathReason: reason,
    gameOver: true, pendingEvent: null, pendingCrisis: null,
  });

  const death = checkDeath(state);
  if (death.dead) return dieNow(state, death.reason);

  // advanceTurn 内部已结算到期的延迟后果
  let s = advanceTurn(state);

  const death2 = checkDeath(s);
  if (death2.dead) return dieNow(s, death2.reason);

  if (isGameOver(s).over) {
    return { ...s, gameOver: true, pendingEvent: null, pendingCrisis: null };
  }
  return loadTurnEvent(s, content);
}

// ─────────────────────────────────────────────
// 内部流转
// ─────────────────────────────────────────────

function loadTurnEvent(state, content) {
  const roleId = state.origin?.role || state.role?.id || 'cfo';

  // 进入新幕时记一笔，ui 拿它放过场卡（不影响随机流）
  const act = getCurrentAct(state);
  const withAct = (act && act.id !== state.currentActId)
    ? { ...state, currentActId: act.id, newActEntered: act }
    : { ...state, newActEntered: null };

  const { statePatch } = pickTurnEvent(content, withAct, roleId);
  return { ...withAct, ...statePatch };
}

// 危机每季最多弹一次：处置失败（不确定选项没成）时条件往往仍然成立，
// 不设上限会在同一季反复弹同一个危机，把玩家卡死。
function refreshCrisis(state) {
  if (state.gameOver) return { ...state, pendingCrisis: null };
  if (state.pendingCrisis) return state;
  if (state.lastCrisisQuarter === state.quartersPassed) return state;

  const crisis = detectCrisis(state);
  if (!crisis) return state;
  return { ...state, pendingCrisis: crisis, lastCrisisQuarter: state.quartersPassed };
}
