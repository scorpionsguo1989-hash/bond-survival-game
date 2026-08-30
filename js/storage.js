// js/storage.js
const SAVE_KEY = 'bondGame_save';
const HISTORY_KEY = 'bondGame_history';
const SAVE_VERSION = 2;

/**
 * 存档只写 { seed, inputs }：整局是这两者的纯函数，重放即可完整还原。
 *
 * 旧实现把整个 state 序列化再灌回去，但 RNG 游标不在存档里——续玩时掷出的
 * 随机数跟原局对不上，最后提交的 inputLog 服务端复算必然驳回。存票据没这个问题。
 */
export function saveGame(state) {
  try {
    if (!state?.seed) return false;
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      v: SAVE_VERSION,
      seed: state.seed,
      inputs: state.inputLog || [],
    }));
    return true;
  } catch (e) {
    console.warn('Save failed:', e);
    return false;
  }
}

/**
 * 读出存档票据，交给 gameLoop.replayGame 还原。
 * 读不出 / 是旧版整状态存档 → 返回 null，由调用方开新局。
 */
export function loadSaveTicket() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data.seed !== 'string' || !Array.isArray(data.inputs)) return null;
    return { seed: data.seed, inputs: data.inputs };
  } catch (e) {
    return null;
  }
}

export function clearSave() {
  localStorage.removeItem(SAVE_KEY);
}

export function pushHistoryRecord(record) {
  const history = getHistory();
  history.push({ ...record, savedAt: Date.now() });
  // 最多保留50条
  while (history.length > 50) history.shift();
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function getHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}
