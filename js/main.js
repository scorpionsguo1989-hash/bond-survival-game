// js/main.js
import { generateOrigin } from './origins/index.js';
import { createInitialState, advanceTurn, applyEventChoice, checkDeath, isGameOver, detectCrisis } from './engine.js';
import { findMainEvent, sampleRandomEvents, getPolicyDirection, loadEvents, shouldTriggerBlackSwan, sampleBlackSwan, findSagaEvent, getNextSagaEventId, getEligibleSagaStartEvents, pickOpeningEvent } from './eventEngine.js';
import { computeFinalScore } from './score.js';
import { saveGame, loadGame, clearSave, pushHistoryRecord } from './storage.js';
import { renderFateCard, renderMainScreen, renderCrisisModal, renderEndScreen, generateShareCard, downloadShareCard, renderLeaderboardModal, renderNicknamePrompt, renderActionModal, toast, showToast, showActTransition, preloadBrandAssets, ensureBrandAssets } from './ui.js';
import { getCurrentAct, getScript } from './scripts.js';
import { submitScore, fetchLeaderboard, fetchRank, fetchPortrait, fetchHeadline, fetchCoachAdvice } from './api.js';
import { renderDebtWaterfall, renderCashTrend, renderNavChart, renderHoldingsChart, renderFiscalChart, renderDebtRatioChart } from './charts.js';
import { attachGlossaryListeners } from './glossary.js';
import { checkAndUnlock, showAchievementToasts, attachAchievementsListeners } from './achievements.js';
import { initNpcLibrary, attachNpcListeners, syncNpcEncounters } from './npc-memory.js';
import { renderHomePage } from './home.js';
import { initEmbedded } from './embed.js';

let state = null;
let eventData = null;

async function init() {
  // 全局：术语 hover / tap / 抽屉。幂等，安全多次调用。
  attachGlossaryListeners();
  // 全局：成就抽屉键盘 Esc 关闭。幂等。
  attachAchievementsListeners();
  // 公众号 logo + QR 后台预加载（不阻塞游戏启动；分享时如未加载完会自动等 2 秒再 fallback）
  preloadBrandAssets();
  // iframe 嵌入主站时挂"返回主站"角标 + body.embedded class（直访 :8080 不生效）
  initEmbedded();

  try {
    eventData = await loadEvents();
  } catch (e) {
    document.getElementById('app').innerHTML = '<div style="padding:40px;color:#ef5350;font-family:sans-serif;text-align:center">事件数据加载失败，请刷新重试。<br><br>如反复出现，请检查 content/mainEvents.json 是否可访问。</div>';
    console.error('loadEvents failed:', e);
    return;
  }

  // 显性失败检测：避免 API 限流 / 网络故障 → eventData 全空 → 静默退化成 IDLE 空回合
  // 主线 23 是基线，少于 5 就肯定是加载失败（不是数据问题）
  if (!eventData || !Array.isArray(eventData.main) || eventData.main.length < 5) {
    const html = `
      <div style="padding:40px;color:#ef5350;font-family:sans-serif;text-align:center;line-height:1.6">
        <div style="font-size:18px;font-weight:600;margin-bottom:12px">事件库加载不完整</div>
        <div style="color:#98a3bd;margin-bottom:8px">收到主线 ${eventData?.main?.length || 0} / 23 条，无法开始游戏。</div>
        <div style="color:#98a3bd;font-size:13px">可能原因：API 鉴权超频，请等待 60 秒后<a href="javascript:location.reload()" style="color:#ffd54f;margin-left:6px">刷新重试</a></div>
      </div>`;
    document.getElementById('app').innerHTML = html;
    console.error('[init] eventData 加载不完整：', eventData);
    return;
  }

  // hermes 41 个 NPC 实体库：构索引 + 挂全局 hover 监听
  initNpcLibrary(eventData.npcLibrary);
  attachNpcListeners();
  // 暴露给 ui.js / 全局：NPC 记忆同步（在 enterMainScreen 前由 ui.js 读取）
  // 这里先不调，等 enterMainScreen 时再同步

  const saved = loadGame();
  if (saved && confirm('发现存档，是否继续？')) {
    state = saved;
    if (state.survived && state.quartersPassed < 12) {
      // Refresh pendingEvent in case save happened between turns
      if (!state.pendingEvent) {
        loadCurrentTurnEvent();
      }
      enterMainScreen();
    } else {
      enterEndScreen();
    }
  } else {
    clearSave();
    // 首次进入（localStorage 无 _home_seen）→ 显示首页
    // 二次起 / 「再来一局」回流 → 直接进命运卡
    if (shouldShowHome()) {
      enterHomePage();
    } else {
      startNewGame();
    }
  }
}

// ─── 首页流转 ──────────────────────────────
const HOME_SEEN_KEY = 'bond_home_seen';
function shouldShowHome() {
  try {
    return !localStorage.getItem(HOME_SEEN_KEY);
  } catch (e) {
    return false;  // localStorage 不可用 → 跳过首页直接进游戏
  }
}
function markHomeSeen() {
  try { localStorage.setItem(HOME_SEEN_KEY, '1'); } catch (e) {}
}

function enterHomePage() {
  renderHomePage({
    onStart: () => {
      markHomeSeen();
      startNewGame();
    },
    onLeaderboard: () => {
      // 复用现有 showLeaderboard，弹同一个排行榜 modal
      showLeaderboard();
    },
    // onWeChat 不传 → 走 home.js 内置 toast 提示
  });
}

function startNewGame() {
  const origin = generateOrigin();
  state = createInitialState(origin);
  loadCurrentTurnEvent();
  renderFateCard(origin, state.role, () => {
    enterMainScreen();
  }, state.scriptId, state.goalId);

  // 命运卡界面渲染后，追加排行榜按钮
  requestAnimationFrame(() => {
    const container = document.querySelector('.fate-container');
    if (container && !document.getElementById('btn-home-leaderboard')) {
      const btn = document.createElement('button');
      btn.id = 'btn-home-leaderboard';
      btn.className = 'btn-secondary';
      btn.style.cssText = 'margin-top:16px;display:block;margin-left:auto;margin-right:auto';
      btn.textContent = '查看排行榜';
      btn.addEventListener('click', showLeaderboard);
      container.appendChild(btn);
    }
  });
}

// 上次提交成绩的 row id，用于 leaderboard 高亮 me（首页打开 leaderboard 时为 null）
let _lastSubmittedScoreId = null;

async function showLeaderboard() {
  const result = await fetchLeaderboard(null);
  renderLeaderboardModal(result?.data || [], null, fetchLeaderboard, _lastSubmittedScoreId);
}

function loadCurrentTurnEvent() {
  const roleId = state.origin?.role || 'cfo';

  // 0) 多周期叙事：检测是否进入新幕，若是则触发过场（异步，不阻塞事件加载）
  const newAct = getCurrentAct(state);
  if (newAct && newAct.id !== state.currentActId) {
    state = { ...state, currentActId: newAct.id };
    const script = getScript(state.scriptId);
    // 延迟显示，让主界面先渲染出来
    setTimeout(() => showActTransition(newAct, script), 100);
  }

  // E 改造：Q1 必触发开场事件。每局只触发一次，挑过即标 openingEventConsumed。
  // 池子空 / 角色没匹配到 → 也标记 consumed，避免每季重复尝试。
  if (state.quartersPassed === 0 && !state.openingEventConsumed) {
    const opening = pickOpeningEvent(eventData.openingEvents || [], state);
    if (opening) {
      state = { ...state, pendingEvent: opening, openingEventConsumed: true };
      return;
    }
    state = { ...state, openingEventConsumed: true };
  }

  // 1) Saga 强制接续：上一季选择指向下一步时，本季不再走主线/随机抽取。
  //    如果内容文件缺失该 ID，则清空指针并继续正常事件流程，避免坏存档卡死。
  if (state.nextSagaEventId) {
    const saga = findSagaEvent(eventData.sagaEvents || [], state.nextSagaEventId, roleId);
    if (saga) {
      state = { ...state, pendingEvent: saga, nextSagaEventId: null };
      return;
    }
    state = { ...state, nextSagaEventId: null };
  }

  // 2) 黑天鹅 roll：命中则用黑天鹅取代本季事件（包括主线）
  //    主线事件本身已经够戏剧化，但如果黑天鹅命中且能找到合适候选，仍然替换
  if (shouldTriggerBlackSwan(state, roleId)) {
    const swan = sampleBlackSwan(eventData.blackSwans || [], state, roleId);
    if (swan) {
      state = {
        ...state,
        pendingEvent: swan,
        blackSwansSeen: [...(state.blackSwansSeen || []), swan.id],
        lastSwanTag: swan.swanTag || null,  // 给下一次黑天鹅的"同 tag 冷却"用
      };
      return;
    }
  }

  // 3) 主线事件优先
  const main = findMainEvent(eventData.main, state.year, state.quarter, roleId);
  if (main) {
    state = { ...state, pendingEvent: main };
  } else {
    // 4) 随机事件兜底：普通/季节/定向事件 + 符合条件的 Saga 第一步。
    const dir = getPolicyDirection(state.policyValue);
    const sagaStarts = getEligibleSagaStartEvents(eventData.sagaEvents || [], state, roleId);
    const sampled = sampleRandomEvents([...(eventData.random || []), ...sagaStarts], dir, { min: 1, max: 1 }, roleId, state);
    state = { ...state, pendingEvent: sampled[0] || null };
  }
}

function enterMainScreen() {
  // 危机检测
  const crisis = detectCrisis(state);
  if (crisis) {
    renderCrisisModal(crisis, (option) => handleCrisisChoice(option));
    return;
  }

  // NPC 记忆：把 state.npcEncounters 同步给 npc-memory 模块（让状态栏按钮和抽屉读取）
  syncNpcEncounters(state.npcEncounters || {});

  renderMainScreen(state, {
    actions: state.role.actions,
    isAvailable: id => state.role.isActionAvailable(state, id),
    onChoiceSelected: handleEventChoice,
    onActionSelected: handleActionSelected,
    onEndTurn: handleEndTurn,
    onCoachAsk: handleCoachAsk,
  });

  // 角色专属图表
  requestAnimationFrame(() => {
    if (state.role.id === 'cfo') {
      renderDebtWaterfall(state);
      renderCashTrend(state);
    } else if (state.role.id === 'im') {
      renderNavChart(state);
      renderHoldingsChart(state);
    } else if (state.role.id === 'gov') {
      renderFiscalChart(state);
      renderDebtRatioChart(state);
    }
  });

  saveGame(state);
}

function handleEventChoice(idx) {
  const currentEvent = state.pendingEvent;
  const nextSagaEventId = getNextSagaEventId(currentEvent, idx);
  state = applyEventChoice(state, currentEvent, idx);

  if (currentEvent?.saga_id) {
    const sagaSeenIds = Array.from(new Set([...(state.sagaSeenIds || []), currentEvent.id]));
    const completedSagaIds = nextSagaEventId
      ? (state.completedSagaIds || [])
      : Array.from(new Set([...(state.completedSagaIds || []), currentEvent.saga_id]));
    state = {
      ...state,
      sagaSeenIds,
      completedSagaIds,
      nextSagaEventId: nextSagaEventId || null,
    };
  }

  // NPC 记忆：本季选了某事件 → 给该事件涉及的 NPC 加 1 次互动
  const involves = currentEvent?.involves_npc;
  if (Array.isArray(involves) && involves.length) {
    const choiceLabel = currentEvent.choices?.[idx]?.label || '';
    const npcEncounters = { ...(state.npcEncounters || {}) };
    for (const npcId of involves) {
      const prev = npcEncounters[npcId] || { count: 0 };
      npcEncounters[npcId] = {
        count: prev.count + 1,
        lastQuarter: (state.quartersPassed || 0) + 1,  // 即将结束的回合
        lastEventTitle: currentEvent.title || '',
        lastChoiceLabel: choiceLabel,
      };
    }
    state = { ...state, npcEncounters };
  }

  state = { ...state, pendingEvent: null };
  enterMainScreen();
}

async function handleActionSelected(actionId) {
  const action = state.role.actions.find(a => a.id === actionId);
  if (!action) return;
  // 预览影响：模拟应用 effects 后的关键指标变化
  const previewFn = (params) => {
    try {
      const before = state.metrics;
      const sim = state.role.applyActionEffects(state, actionId, params);
      const after = sim.metrics;
      const diffs = [];
      for (const k of Object.keys(after)) {
        const a = after[k], b = before[k];
        if (typeof a !== 'number' || typeof b !== 'number') continue;
        const d = a - b;
        if (Math.abs(d) < 0.01) continue;
        const label = state.role.metricLabels?.[k] || k;
        const sign = d > 0 ? '+' : '';
        diffs.push(`${label} ${sign}${d.toFixed(2)}`);
      }
      return diffs.length ? '预计：' + diffs.slice(0, 4).join('，') : '调整数值实时预览影响';
    } catch (e) {
      return '调整数值实时预览影响';
    }
  };
  const params = await renderActionModal(action, previewFn);
  if (!params) return;  // 用户取消
  state = state.role.applyActionEffects(state, actionId, params);
  toast.success(`${action.name} 已执行`);
  enterMainScreen();
}

function handleCrisisChoice(option) {
  // 不确定性处理
  let success = true;
  if (option.effects._uncertain !== undefined) {
    success = Math.random() < option.effects._uncertain;
  }
  if (success) {
    Object.entries(option.effects).forEach(([k, v]) => {
      if (k.startsWith('_')) return;
      if (k.startsWith('score.')) {
        const dim = k.slice(6);
        state.score[dim] = (state.score[dim] || 0) + v;
      } else if (k === 'collateralRoom' && v === 'downgrade') {
        state.metrics.collateralRoom = state.metrics.collateralRoom === 'high' ? 'medium' : 'low';
      } else if (typeof v === 'number') {
        state.metrics[k] = parseFloat(((state.metrics[k] || 0) + v).toFixed(2));
      }
    });
    toast.success('处置成功，危机暂时缓解');
  } else {
    toast.error('处置失败，未能解决问题');
  }
  enterMainScreen();
}

async function handleCoachAsk() {
  // 限额检查
  if ((state.coachingUsedTotal || 0) >= 3) {
    return { ok: false, error: 'AI 配额已用完（每局上限 3 次）' };
  }
  const ev = state.pendingEvent;
  if (!ev || !Array.isArray(ev.choices)) {
    return { ok: false, error: '当前没有待决策事件' };
  }
  const roleId = state.origin?.role || state.role?.id || 'cfo';
  const script = state.scriptId ? require_script(state.scriptId) : null;
  const act = script ? findActById(script, state.currentActId) : null;
  const payload = {
    role: roleId,
    quartersPassed: state.quartersPassed || 0,
    policyValue: state.policyValue || 0,
    scriptName: script?.name || null,
    actLabel: act?.label || null,
    metrics: pickKeyMetrics(state.metrics, roleId),
    event: {
      title: ev.title,
      body: ev.body,
      choices: ev.choices.map(c => ({ label: c.label, effects: c.effects || {} })),
    },
  };
  const result = await fetchCoachAdvice(payload);
  if (result?.ok) {
    state = { ...state, coachingUsedTotal: (state.coachingUsedTotal || 0) + 1 };
    saveGame(state);
    return { ...result, newRemain: Math.max(0, 3 - state.coachingUsedTotal) };
  }
  return result;
}

// 把 state.metrics 抽取角色的关键 4-6 个数字给 AI 看
function pickKeyMetrics(m, roleId) {
  if (!m) return {};
  const keys = roleId === 'cfo' ? ['cash', 'leverageRatio', 'creditUsage', 'financingCost']
    : roleId === 'im' ? ['nav', 'duration', 'creditExposure', 'concentration', 'cashRatio', 'redemptionPressure']
    : ['cash', 'debtRatio', 'hiddenDebtRisk', 'politicalScore'];
  const out = {};
  for (const k of keys) {
    if (typeof m[k] === 'number') out[k] = m[k];
  }
  return out;
}

// 极简的脚本查找 helper（避免循环 import）
function require_script(id) {
  // 这里直接用 import；在文件顶部已经 import 了 getScript
  return getScript(id);
}
function findActById(script, actId) {
  if (!script || !actId) return null;
  return script.acts.find(a => a.id === actId) || null;
}

function handleEndTurn() {
  // 检查死亡
  const death = checkDeath(state);
  if (death.dead) {
    state.survived = false;
    state.deathReason = death.reason;
    enterEndScreen();
    return;
  }

  // 推进回合
  state = advanceTurn(state);

  // 延迟后果触发提示（advanceTurn 把到期的 _delayedEffect 应用并放在 triggeredDelayedEffects）
  if (Array.isArray(state.triggeredDelayedEffects) && state.triggeredDelayedEffects.length > 0) {
    for (const item of state.triggeredDelayedEffects) {
      const summary = Object.entries(item.effects || {})
        .filter(([k, v]) => !k.startsWith('_') && typeof v === 'number')
        .slice(0, 3)
        .map(([k, v]) => {
          const label = k.startsWith('score.') ? k.slice(6) : (state.role?.metricLabels?.[k] || k);
          return `${label} ${v > 0 ? '+' : ''}${v}`;
        })
        .join('，');
      showToast({
        kind: 'info',
        meta: '延迟',
        t1: '前情回响：' + (item.sourceTitle || '过往决策').slice(0, 18),
        t2: summary || '',
        duration: 5000,
      });
    }
    // 清掉，避免下一季再触发
    state = { ...state, triggeredDelayedEffects: [] };
  }

  // 二次死亡检查
  const death2 = checkDeath(state);
  if (death2.dead) {
    state.survived = false;
    state.deathReason = death2.reason;
    enterEndScreen();
    return;
  }

  // 游戏结束检查
  const over = isGameOver(state);
  if (over.over) {
    enterEndScreen();
    return;
  }

  // 加载下回合事件
  loadCurrentTurnEvent();
  enterMainScreen();
}

function enterEndScreen() {
  const finalScore = computeFinalScore(state);
  pushHistoryRecord({
    platformName: state.origin.platformName,
    score: finalScore.total,
    grade: finalScore.grade.grade,
    survived: state.survived,
    quartersPassed: state.quartersPassed,
  });
  clearSave();

  // 弹出昵称输入，然后提交成绩
  renderNicknamePrompt(
    (nickname) => submitAndShowEnd(nickname, finalScore),
    () => submitAndShowEnd(null, finalScore),
  );
}

async function submitAndShowEnd(nickname, finalScore) {
  // 同侪信号：把本局所有 eventLog 都打包发上去，后端聚合给后续玩家用
  const decisions = (state.eventLog || []).map(log => ({
    eventId: log.eventId,
    choiceIdx: log.choiceIdx,
    outcome: log.uncertainOutcome || null,  // 'succeeded' | 'failed' | null
  })).filter(d => typeof d.eventId === 'string' && Number.isInteger(d.choiceIdx));

  const scoreData = {
    nickname,
    directorName: state.origin.directorName,
    platformName: state.origin.platformName,
    regionTier: state.origin.regionTier,
    healthLevel: state.origin.healthLevel,
    role: state.origin.role || state.origin.roleId || 'cfo',
    score: finalScore.total,
    grade: finalScore.grade.grade,
    survived: state.survived,
    quartersPassed: state.quartersPassed,
    decisions,
  };

  // 提交成绩（失败时 rank 为 null，静默降级）
  const result = await submitScore(scoreData);
  const rank = result?.rank || null;
  // 记下本局 row id，让玩家在终局页打开 leaderboard 时能高亮自己那一行
  if (result?.id) _lastSubmittedScoreId = result.id;

  // 构建一次画像 payload；onPortraitFetch 每次重试都用这份不变的数据
  const portraitPayload = buildPortraitPayload(state, eventData, finalScore);
  const roleId = state.origin?.role || state.role?.id || 'cfo';

  // 成就检查：写 localStorage、返回本局新解锁的成就（含 lastWasFailure 等 stats 更新）
  const newAchievements = checkAndUnlock({ state, finalScore, eventData });

  renderEndScreen(state, finalScore, {
    rank,
    role: roleId,
    newAchievements,
    onAchievementsOpen: (focusId) => {
      // 由 ui.js 在 status bar / 卡片入口调用
      import('./achievements.js').then(m => m.openAchievementsDrawer(focusId));
    },
    // 用于"决策对比"卡片：[{quarter, eventId, eventTitle, choiceIdx, choiceLabel, outcome}]
    decisionDetails: portraitPayload.decisions.map((d, i) => ({
      ...d,
      eventId: state.eventLog?.[i]?.eventId,
      choiceIdx: state.eventLog?.[i]?.choiceIdx,
    })).filter(d => d.eventId && Number.isInteger(d.choiceIdx)),
    onRestart: () => { state = null; _lastHeadlineCache = null; startNewGame(); },
    onShare: async (fs) => {
      // 战报标题 + brand 资源（logo + QR）：并行等待（headline 最多 8s，brand 最多 2s）
      const [headline] = await Promise.all([
        waitForHeadline(8_000),
        ensureBrandAssets(2_000),
      ]);
      const dataUrl = generateShareCard(state, fs, { headline });
      downloadShareCard(dataUrl, `债市生存_${state.origin.directorName}_${fs.grade.grade}.png`);
    },
    onLeaderboard: showLeaderboard,
    // 由 ui.js 在终局页渲染完后异步调用，自带重试
    onPortraitFetch: async (force = false) => {
      return await fetchPortrait({ ...portraitPayload, _force: force });
    },
    // 爆款标题：复用 portrait payload + 加剧本名
    onHeadlineFetch: async (force = false) => {
      const headlinePayload = {
        ...portraitPayload,
        scriptName: state.scriptId ? getScript(state.scriptId)?.name : null,
        _force: force,
      };
      const result = await fetchHeadline(headlinePayload);
      // 缓存到模块变量，分享卡 onShare 会读它
      if (result?.ok && (result.headline || result.body)) {
        _lastHeadlineCache = { headline: result.headline || '', body: result.body || '' };
      }
      return result;
    },
  });

  // 进结束页就自动后台预取一次 headline（不阻塞 UI），分享卡可以直接读缓存
  // 用户点 ▼ 生成 时如果已经有缓存，UI 卡也能立刻显示
  preloadHeadline(portraitPayload);
}

// ──────── headline 预加载 + 缓存（给分享卡用，避免分享时空标题）────────
let _lastHeadlineCache = null;     // { headline, body }
let _headlinePreloadPromise = null; // 进行中的请求 Promise，防重复

function preloadHeadline(portraitPayload) {
  if (_lastHeadlineCache || _headlinePreloadPromise) return;
  const headlinePayload = {
    ...portraitPayload,
    scriptName: state?.scriptId ? getScript(state.scriptId)?.name : null,
  };
  _headlinePreloadPromise = fetchHeadline(headlinePayload)
    .then(result => {
      if (result?.ok && (result.headline || result.body)) {
        _lastHeadlineCache = { headline: result.headline || '', body: result.body || '' };
      }
      return result;
    })
    .catch(err => {
      console.warn('preloadHeadline failed:', err);
      return null;
    })
    .finally(() => { _headlinePreloadPromise = null; });
}

// onShare 调用：等预加载完成（最多 timeoutMs 毫秒），返回 cache（可能 null）
async function waitForHeadline(timeoutMs = 8_000) {
  if (_lastHeadlineCache) return _lastHeadlineCache;
  if (!_headlinePreloadPromise) return null;
  await Promise.race([
    _headlinePreloadPromise,
    new Promise(resolve => setTimeout(resolve, timeoutMs)),
  ]);
  return _lastHeadlineCache;  // 即使超时也尝试返回（可能已 resolve）
}

// 把 state + finalScore 提炼成 portrait API 入参
// 注意：服务端只用其中的关键字段，多余字段会被忽略；不要把整个 state 直接发上去
function buildPortraitPayload(state, eventData, finalScore) {
  const allEvents = [
    ...((eventData?.main) || []),
    ...((eventData?.random) || []),
    ...((eventData?.blackSwans) || []),
    ...((eventData?.sagaEvents) || []),
  ];
  const eventMap = new Map(allEvents.map(e => [e.id, e]));
  const roleId = state.origin?.role || state.role?.id || 'cfo';

  // eventLog -> 富化为 {quarter, eventTitle, choiceLabel, outcome}
  const decisions = (state.eventLog || []).map((log, i) => {
    const ev = eventMap.get(log.eventId);
    const title = ev?.title || '未知事件';
    const choice = ev?.roles?.[roleId]?.choices?.[log.choiceIdx];
    const outcome = log.uncertainOutcome === 'failed' ? '失败'
      : log.uncertainOutcome === 'succeeded' ? '成功' : null;
    return {
      quarter: i + 1,  // 按 eventLog 顺序，每季最多 1 个事件
      eventTitle: title,
      choiceLabel: choice?.label || `选项 ${String.fromCharCode(65 + (log.choiceIdx || 0))}`,
      outcome,
    };
  });

  // 起始 vs 终局指标快照（仅取核心字段）
  const start = state.history?.[0] || {};
  const m = state.metrics || {};
  const pickKeys = roleId === 'cfo'
    ? ['cash', 'leverageRatio', 'creditUsage', 'financingCost']
    : roleId === 'im'
    ? ['nav', 'duration', 'creditExposure', 'concentration', 'leverage', 'cashRatio']
    : ['cash', 'debtRatio', 'hiddenDebtRisk', 'politicalScore'];
  const filterMetrics = (obj) => Object.fromEntries(
    pickKeys.map(k => [k, obj[k]]).filter(([, v]) => typeof v === 'number')
  );

  const policyTrace = (state.history || []).map(h => h.policyValue).filter(v => typeof v === 'number');

  return {
    role: roleId,
    platformName: state.origin?.platformName || '',
    directorName: state.origin?.directorName || '',
    regionTier: state.origin?.regionTier || 'central_capital',
    healthLevel: state.origin?.healthLevel || 'medium',
    survived: !!state.survived,
    quartersPassed: state.quartersPassed || 0,
    deathReason: state.deathReason || null,
    score: {
      total: finalScore.total,
      grade: finalScore.grade.grade,
      gradeLabel: finalScore.grade.label,
      dimensions: finalScore.dimensions,
    },
    metrics: {
      start: filterMetrics(start),
      end: filterMetrics(m),
    },
    decisions,
    policyTrace,
  };
}

init();
