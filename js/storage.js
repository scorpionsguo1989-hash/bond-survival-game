// js/storage.js
import { getRole } from './roles/index.js';

const SAVE_KEY = 'bondGame_save';
const HISTORY_KEY = 'bondGame_history';

export function saveGame(state) {
  try {
    // 序列化时剔除 role（函数不可序列化，且会循环引用）
    const { role, ...persistable } = state;
    localStorage.setItem(SAVE_KEY, JSON.stringify(persistable));
    return true;
  } catch (e) {
    console.warn('Save failed:', e);
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw);
    // 反序列化时按 origin.role 重新注入 role 对象
    if (state && state.origin?.role) {
      try {
        state.role = getRole(state.origin.role);
      } catch (e) {
        console.warn('Cannot rehydrate role from save:', e);
        return null;
      }
    }
    return state;
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
