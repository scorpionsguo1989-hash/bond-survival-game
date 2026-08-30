// tests/run-timeline.test.js
// 局末复盘时间轴：把一局 12 季的决策、操作、危机、指标变化串成一条可读的线。
// 原来终局页只有一个平铺的「决策对比」列表，没有时间轴也没有转折标注，
// 玩家看不出自己是哪一步开始走岔的——分享传播的抓手也在这儿。
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createGame, applyInput } from '../js/gameLoop.js';
import { buildRunTimeline } from '../js/runTimeline.js';

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

function playOut(seed) {
  let s = createGame(seed, content);
  for (let g = 0; g < 400 && !s.gameOver; g++) {
    if (s.pendingCrisis) s = applyInput(s, { t: 'crisis', idx: 0 }, content);
    else if (s.pendingEvent) s = applyInput(s, { t: 'event', idx: 0 }, content);
    else if (s.actionsUsed === 0 && s.role.actions.some(a => s.role.isActionAvailable(s, a.id).available)) {
      const a = s.role.actions.find(x => s.role.isActionAvailable(s, x.id).available);
      const params = {};
      for (const p of (a.params || [])) params[p.key] = p.default;
      s = applyInput(s, { t: 'action', id: a.id, params }, content);
    } else s = applyInput(s, { t: 'endTurn' }, content);
  }
  return s;
}

describe('局末复盘时间轴', () => {
  it('每一季都有一条，季数与实际打过的回合对齐', () => {
    for (const seed of ['TL-1', 'TL-2', 'TL-3']) {
      const s = playOut(seed);
      const tl = buildRunTimeline(s, content);
      expect(tl.length, `seed=${seed}`).toBe(s.quartersPassed);
      tl.forEach((row, i) => expect(row.quarter).toBe(i + 1));
      expect(tl[0].label).toBe('2022 Q1');
    }
  });

  it('决策落在正确的季度上，且带得出选项文案', () => {
    const s = playOut('TL-4');
    const tl = buildRunTimeline(s, content);
    const withEvent = tl.filter(r => r.event);
    expect(withEvent.length).toBeGreaterThan(0);
    for (const row of withEvent) {
      expect(typeof row.event.title).toBe('string');
      expect(row.event.title).not.toBe('未知事件');
      expect(typeof row.event.choiceLabel).toBe('string');
      expect(row.event.choiceLabel.length).toBeGreaterThan(0);
    }
  });

  it('主动操作按季归位', () => {
    const s = playOut('TL-5');
    const tl = buildRunTimeline(s, content);
    const totalActions = tl.reduce((n, r) => n + r.actions.length, 0);
    expect(totalActions).toBe((s.actionLog || []).length);
    for (const row of tl) {
      for (const a of row.actions) expect(a.quarter).toBe(row.quarter);
    }
  });

  it('每季带主指标读数和环比变化', () => {
    const s = playOut('TL-6');
    const tl = buildRunTimeline(s, content);
    for (const row of tl) {
      expect(typeof row.primary.label).toBe('string');
      expect(Number.isFinite(row.primary.value)).toBe(true);
      expect(Number.isFinite(row.primary.delta)).toBe(true);
    }
  });

  it('转折点被标出来：黑天鹅 / 危机 / 出局季', () => {
    // 跑若干局，至少要能标出黑天鹅和出局季
    const marks = new Set();
    for (let i = 0; i < 40; i++) {
      const s = playOut(`TL-M-${i}`);
      for (const row of buildRunTimeline(s, content)) row.marks.forEach(m => marks.add(m));
    }
    expect(marks.has('black_swan'), '没有任何一局标出黑天鹅').toBe(true);
    expect(marks.has('death'), '没有任何一局标出出局季').toBe(true);
  });

  it('出局那一季带上死因', () => {
    let died = null;
    for (let i = 0; i < 60 && !died; i++) {
      const s = playOut(`TL-D-${i}`);
      if (!s.survived) died = s;
    }
    expect(died, '取样里应该有出局的局').toBeTruthy();
    const tl = buildRunTimeline(died, content);
    const last = tl[tl.length - 1];
    expect(last.marks).toContain('death');
    expect(last.deathReason).toBe(died.deathReason);
  });
});
