// tests/storage.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';

// storage.js 直接用全局 localStorage，这里给个内存桩
class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) { this.map.set(k, String(v)); }
  removeItem(k) { this.map.delete(k); }
}
globalThis.localStorage = new MemoryStorage();

const { saveGame, loadSaveTicket, clearSave } = await import('../js/storage.js');
const { createGame, applyInput, replayGame } = await import('../js/gameLoop.js');
const { computeFinalScore } = await import('../js/score.js');

const readJson = (p) => JSON.parse(readFileSync(new URL(`../content/${p}`, import.meta.url), 'utf8'));
const asArray = (d) => (Array.isArray(d) ? d : d.events || []);
const content = {
  main: readJson('mainEvents.json'),
  random: [...readJson('randomEvents.json'), ...readJson('randomEventsIM.json'),
    ...readJson('randomEventsGOV.json'), ...readJson('seasonalEvents.json'), ...readJson('targetedEvents.json')],
  blackSwans: [...readJson('blackSwans.json'), ...readJson('blackSwansV2.json')],
  sagaEvents: [...readJson('sagaEvents.json'), ...asArray(readJson('historicalSagas.json'))],
  openingEvents: asArray(readJson('openingEvents.json')),
};

describe('存档：只存种子和输入序列，靠重放还原', () => {
  beforeEach(() => { globalThis.localStorage = new MemoryStorage(); });

  it('存读一轮后，续玩的局与原局完全一致', () => {
    let played = createGame('SAVE-1', content);
    // 打几步再存
    for (let i = 0; i < 6 && !played.gameOver; i++) {
      if (played.pendingCrisis) played = applyInput(played, { t: 'crisis', idx: 0 }, content);
      else if (played.pendingEvent) played = applyInput(played, { t: 'event', idx: 0 }, content);
      else played = applyInput(played, { t: 'endTurn' }, content);
    }
    saveGame(played);

    const ticket = loadSaveTicket();
    expect(ticket.seed).toBe('SAVE-1');
    const restored = replayGame(ticket, content);

    expect(restored.metrics).toEqual(played.metrics);
    expect(restored.quartersPassed).toBe(played.quartersPassed);
    expect(restored.pendingEvent?.id).toBe(played.pendingEvent?.id);
    expect(computeFinalScore(restored).total).toBe(computeFinalScore(played).total);
  });

  it('续玩后再存再读，仍然一致（RNG 游标没跑偏）', () => {
    let played = createGame('SAVE-2', content);
    for (let i = 0; i < 4 && !played.gameOver; i++) {
      played = applyInput(played, played.pendingEvent ? { t: 'event', idx: 0 } : { t: 'endTurn' }, content);
    }
    saveGame(played);
    let restored = replayGame(loadSaveTicket(), content);
    // 从存档继续打
    for (let i = 0; i < 5 && !restored.gameOver; i++) {
      restored = applyInput(restored, restored.pendingEvent ? { t: 'event', idx: 0 } : { t: 'endTurn' }, content);
      played = applyInput(played, played.pendingEvent ? { t: 'event', idx: 0 } : { t: 'endTurn' }, content);
    }
    expect(restored.metrics).toEqual(played.metrics);
    expect(restored.inputLog).toEqual(played.inputLog);
  });

  it('旧版存档（没有 seed）读不出来，走开新局而不是崩', () => {
    globalThis.localStorage.setItem('bondGame_save', JSON.stringify({ quartersPassed: 3, metrics: { cash: 5 } }));
    expect(loadSaveTicket()).toBeNull();
  });

  it('存档损坏时返回 null', () => {
    globalThis.localStorage.setItem('bondGame_save', '{不是 JSON');
    expect(loadSaveTicket()).toBeNull();
  });

  it('clearSave 之后读不到', () => {
    saveGame(createGame('SAVE-3', content));
    expect(loadSaveTicket()).not.toBeNull();
    clearSave();
    expect(loadSaveTicket()).toBeNull();
  });
});
