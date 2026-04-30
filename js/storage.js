// js/storage.js

const SAVE_KEY = 'bondGame_save';
const HISTORY_KEY = 'bondGame_history';

export function saveGame(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    console.warn('Save failed:', e);
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
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
