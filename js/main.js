// js/main.js
import { generateOrigin } from './origins/index.js';
import { createInitialState, advanceTurn, applyEventChoice, checkDeath, isGameOver, detectCrisis } from './engine.js';
import { findMainEvent, sampleRandomEvents, getPolicyDirection, loadEvents } from './eventEngine.js';
import { computeFinalScore } from './score.js';
import { saveGame, loadGame, clearSave, pushHistoryRecord } from './storage.js';
import { renderFateCard, renderMainScreen, renderCrisisModal, renderEndScreen, generateShareCard, downloadShareCard, renderLeaderboardModal, renderNicknamePrompt, renderActionModal, toast } from './ui.js';
import { submitScore, fetchLeaderboard, fetchRank } from './api.js';
import { renderDebtWaterfall, renderCashTrend, renderNavChart, renderHoldingsChart, renderFiscalChart, renderDebtRatioChart } from './charts.js';

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
  const origin = generateOrigin();
  state = createInitialState(origin);
  loadCurrentTurnEvent();
  renderFateCard(origin, state.role, () => {
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
  const roleId = state.origin?.role || 'cfo';
  const main = findMainEvent(eventData.main, state.year, state.quarter, roleId);
  if (main) {
    state = { ...state, pendingEvent: main };
  } else {
    const dir = getPolicyDirection(state.policyValue);
    const sampled = sampleRandomEvents(eventData.random, dir, { min: 1, max: 1 }, roleId);
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
    actions: state.role.actions,
    isAvailable: id => state.role.isActionAvailable(state, id),
    onChoiceSelected: handleEventChoice,
    onActionSelected: handleActionSelected,
    onEndTurn: handleEndTurn,
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
  state = applyEventChoice(state, state.pendingEvent, idx);
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
