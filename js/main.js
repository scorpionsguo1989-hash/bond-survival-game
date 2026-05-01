// js/main.js
import { generateOrigin } from './origins.js';
import { createInitialState, advanceTurn, applyEventChoice, checkDeath, isGameOver, detectCrisis } from './engine.js';
import { findMainEvent, sampleRandomEvents, getPolicyDirection, loadEvents } from './eventEngine.js';
import { CFO_ACTIONS, applyAction, isActionAvailable } from './actions.js';
import { computeFinalScore } from './score.js';
import { saveGame, loadGame, clearSave, pushHistoryRecord } from './storage.js';
import { renderFateCard, renderMainScreen, renderCrisisModal, renderEndScreen, generateShareCard, downloadShareCard, renderLeaderboardModal, renderNicknamePrompt } from './ui.js';
import { submitScore, fetchLeaderboard, fetchRank } from './api.js';
import { renderDebtWaterfall, renderCashTrend } from './charts.js';

let state = null;
let eventData = null;

async function init() {
  try {
    eventData = await loadEvents();
  } catch (e) {
    document.getElementById('app').innerHTML = '<div style="padding:40px;color:#ef5350;font-family:sans-serif;text-align:center">事件数据加载失败，请刷新重试。<br><br>如反复出现，请检查 content/mainEvents.json 是否可访问。</div>';
    console.error('loadEvents failed:', e);
    return;
  }

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
    startNewGame();
  }
}

function startNewGame() {
  const origin = generateOrigin('cfo');
  state = createInitialState(origin);
  loadCurrentTurnEvent();
  renderFateCard(origin, () => {
    enterMainScreen();
  });

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

async function showLeaderboard() {
  const result = await fetchLeaderboard(null);
  renderLeaderboardModal(result?.data || [], null, fetchLeaderboard);
}

function loadCurrentTurnEvent() {
  const main = findMainEvent(eventData.main, state.year, state.quarter);
  if (main) {
    state = { ...state, pendingEvent: main };
  } else {
    const dir = getPolicyDirection(state.policyValue);
    const sampled = sampleRandomEvents(eventData.random, dir, { min: 1, max: 1 });
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

  renderMainScreen(state, {
    actions: CFO_ACTIONS,
    isAvailable: id => isActionAvailable(state, id),
    onChoiceSelected: handleEventChoice,
    onActionSelected: handleActionSelected,
    onEndTurn: handleEndTurn,
  });

  requestAnimationFrame(() => {
    renderDebtWaterfall(state);
    renderCashTrend(state);
  });

  saveGame(state);
}

function handleEventChoice(idx) {
  state = applyEventChoice(state, state.pendingEvent, idx);
  state = { ...state, pendingEvent: null };
  enterMainScreen();
}

function handleActionSelected(actionId) {
  const action = CFO_ACTIONS.find(a => a.id === actionId);
  const params = {};
  let aborted = false;
  for (const p of action.params) {
    const input = prompt(`${p.label}（${p.min}-${p.max}）`, p.default);
    if (input === null) {
      aborted = true;
      break;
    }
    const v = parseFloat(input);
    if (!Number.isFinite(v) || v < p.min || v > p.max) {
      alert(`请输入${p.min}-${p.max}之间的数字`);
      aborted = true;
      break;
    }
    params[p.key] = v;
  }
  if (aborted || Object.keys(params).length === 0) return;
  state = applyAction(state, actionId, params);
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
    alert('处置成功');
  } else {
    alert('处置失败，未能解决问题');
  }
  enterMainScreen();
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
  };

  // 提交成绩（失败时 rank 为 null，静默降级）
  const result = await submitScore(scoreData);
  const rank = result?.rank || null;

  renderEndScreen(state, finalScore, {
    rank,
    onRestart: () => { state = null; startNewGame(); },
    onShare: (fs) => {
      const dataUrl = generateShareCard(state, fs);
      downloadShareCard(dataUrl, `债市生存_${state.origin.directorName}_${fs.grade.grade}.png`);
    },
    onLeaderboard: showLeaderboard,
  });
}

init();
