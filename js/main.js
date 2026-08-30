// js/main.js
import { canTakeAction } from './engine.js';
import { createGame, applyInput, replayGame } from './gameLoop.js';
import { loadEvents, resolveEventView } from './eventEngine.js';
import { buildRunTimeline } from './runTimeline.js';
import { computeFinalScore } from './score.js';
import { saveGame, loadSaveTicket, clearSave, pushHistoryRecord } from './storage.js';
import { renderFateCard, renderMainScreen, renderCrisisModal, renderEndScreen, generateShareCard, downloadShareCard, renderLeaderboardModal, renderNicknamePrompt, renderActionModal, confirmDialog, toast, showToast, showActTransition, preloadBrandAssets, ensureBrandAssets } from './ui.js';
import { getScript } from './scripts.js';
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

  // 存档只存 { seed, inputs }，靠重放还原整局（RNG 游标也一并归位）
  const ticket = loadSaveTicket();
  const resume = ticket ? await confirmDialog({
    title: '发现未打完的存档',
    body: '继续上一局，还是重新抽一张命运卡？',
    okText: '继续这一局',
    cancelText: '重新开始',
  }) : false;
  if (resume) {
    try {
      state = replayGame(ticket, eventData);
    } catch (e) {
      console.warn('[init] 存档重放失败，开新局：', e);
      state = null;
    }
    if (state && !state.gameOver) {
      enterMainScreen();
      return;
    }
    if (state) { enterEndScreen(); return; }
    clearSave();
    startNewGame();
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
  // 整局由 gameLoop 驱动：state 自带 seed 和 inputLog，服务端才能重放复算
  state = createGame(null, eventData);
  announceActTransition();
  renderFateCard(state.origin, state.role, () => {
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

// 多周期叙事：gameLoop 进入新幕时会把幕对象放在 state.newActEntered，这里负责放过场卡
function announceActTransition() {
  const act = state.newActEntered;
  if (!act) return;
  const script = getScript(state.scriptId);
  setTimeout(() => showActTransition(act, script), 100);
}

// 所有玩家输入都从这里过一遍 reducer，state 只在这里被改写。
// 这样实况和服务端重放跑的是同一段代码，inputLog 也天然记全。
function dispatch(input) {
  state = applyInput(state, input, eventData);
}

function enterMainScreen() {
  // 危机由 gameLoop 检出并挂在 state 上（每季最多一次，避免处置失败后反复弹）
  const crisis = state.pendingCrisis;
  if (crisis) {
    renderCrisisModal(crisis, (option) => {
      const idx = crisis.options.indexOf(option);
      handleCrisisChoice(idx >= 0 ? idx : 0);
    });
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
  // saga 接续、NPC 记忆、不确定掷骰都在 gameLoop 里做，这里只负责派发和渲染
  dispatch({ t: 'event', idx });

  // 不确定选项的结果要说出来。原来赌输了页面上什么都不会变，
  // 玩家既不知道自己输了，也不知道输掉了什么。
  const outcome = state.lastUncertainOutcome;
  if (outcome) {
    const chance = Math.round((outcome.chance ?? 0) * 100);
    if (outcome.success) {
      showToast({ kind: 'ok', meta: `${chance}%`, t1: '赌赢了：这一步成了', duration: 3500 });
    } else {
      const cost = Object.entries(outcome.effects || {})
        .filter(([k, v]) => !k.startsWith('_') && typeof v === 'number')
        .slice(0, 2)
        .map(([k, v]) => {
          const label = k.startsWith('score.') ? k.slice(6) : (state.role?.metricLabels?.[k] || k);
          return `${label} ${v > 0 ? '+' : ''}${v}`;
        })
        .join('，');
      showToast({
        kind: 'error', meta: `${chance}%`,
        t1: '没成：事儿没办下来',
        t2: cost ? `代价：${cost}` : '',
        duration: 5000,
      });
    }
  }
  enterMainScreen();
}

async function handleActionSelected(actionId) {
  const action = state.role.actions.find(a => a.id === actionId);
  if (!action) return;
  // 回合行动预算：UI 之外再拦一道，键盘快捷键和旧存档都走这里
  const budget = canTakeAction(state);
  if (!budget.allowed) {
    toast.error(budget.reason);
    return;
  }
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
  dispatch({ t: 'action', id: actionId, params });
  toast.success(`${action.name} 已执行`);
  enterMainScreen();
}

function handleCrisisChoice(idx) {
  dispatch({ t: 'crisis', idx });
  const outcome = state.lastCrisisOutcome;
  if (outcome?.success === false) toast.error('处置失败，未能解决问题');
  else toast.success('处置成功，危机暂时缓解');
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
  // 死亡判定、季度推进、延迟后果、下一季取事件全在 gameLoop 里
  dispatch({ t: 'endTurn' });

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

  if (state.gameOver) {
    enterEndScreen();
    return;
  }

  announceActTransition();
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
    // 排行榜仍保留 CFO 时代的两个非空维度；IM / GOV 没有 regionTier，
    // 提交时用中性兼容值，服务端也会做同样兜底以兼容旧缓存前端。
    regionTier: state.origin.regionTier || 'central_capital',
    healthLevel: state.origin.healthLevel || 'medium',
    role: state.origin.role || state.origin.roleId || 'cfo',
    score: finalScore.total,
    grade: finalScore.grade.grade,
    survived: state.survived,
    quartersPassed: state.quartersPassed,
    decisions,
    // 服务端拿这两个字段重放整局复算，对不上就驳回
    seed: state.seed,
    inputs: state.inputLog || [],
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
    // 复盘时间轴：12 季一条线，标出黑天鹅 / 危机 / 赌输的那步 / 出局季
    timeline: buildRunTimeline(state, eventData),
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
    ...((eventData?.openingEvents) || []),  // 开场事件也要能反查，否则每局 Q1 都显示"未知事件"
  ];
  const eventMap = new Map(allEvents.map(e => [e.id, e]));
  const roleId = state.origin?.role || state.role?.id || 'cfo';

  // eventLog -> 富化为 {quarter, eventTitle, choiceLabel, outcome}
  const decisions = (state.eventLog || []).map((log, i) => {
    // resolveEventView 抹平「roles 嵌套」与「开场事件顶层 choices」两套 schema
    const view = resolveEventView(eventMap.get(log.eventId), roleId);
    const outcome = log.uncertainOutcome === 'failed' ? '失败'
      : log.uncertainOutcome === 'succeeded' ? '成功' : null;
    return {
      quarter: i + 1,  // 按 eventLog 顺序，每季最多 1 个事件
      eventTitle: view.title,
      choiceLabel: view.choices[log.choiceIdx]?.label || `选项 ${String.fromCharCode(65 + (log.choiceIdx || 0))}`,
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
