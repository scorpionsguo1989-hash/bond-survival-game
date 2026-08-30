// tests/replay.test.js
// 排行榜可信化：一局游戏必须是 (seed, 玩家输入序列) 的纯函数，
// 服务端才能重放复算、拒收伪造分数。
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createGame, applyInput, replayGame } from '../js/gameLoop.js';
import { computeFinalScore } from '../js/score.js';

const readJson = (p) => JSON.parse(readFileSync(new URL(`../content/${p}`, import.meta.url), 'utf8'));
const asArray = (d) => (Array.isArray(d) ? d : d.events || []);

const content = {
  main: readJson('mainEvents.json'),
  random: [
    ...readJson('randomEvents.json'), ...readJson('randomEventsIM.json'),
    ...readJson('randomEventsGOV.json'), ...readJson('seasonalEvents.json'),
    ...readJson('targetedEvents.json'),
  ],
  blackSwans: [...readJson('blackSwans.json'), ...readJson('blackSwansV2.json')],
  sagaEvents: [...readJson('sagaEvents.json'), ...asArray(readJson('historicalSagas.json'))],
  openingEvents: asArray(readJson('openingEvents.json')),
};

// 测试里的"玩家"用自己的 LCG，跟游戏 RNG 完全无关，保证用例本身可复现
function bot(botSeed) {
  let s = botSeed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

/** 一个会做完整决策（选事件、处置危机、偶尔用主动操作）的机器人，打完一整局 */
function playFullGame(seed, botSeed) {
  const rand = bot(botSeed);
  let state = createGame(seed, content);
  for (let guard = 0; guard < 400; guard++) {
    if (state.gameOver) break;
    if (state.pendingCrisis) {
      state = applyInput(state, { t: 'crisis', idx: Math.floor(rand() * state.pendingCrisis.options.length) }, content);
    } else if (state.pendingEvent) {
      state = applyInput(state, { t: 'event', idx: Math.floor(rand() * state.pendingEvent.choices.length) }, content);
    } else {
      // 有一定概率用一次主动操作，覆盖 actionLog 路径
      const acts = state.role.actions.filter(a => state.role.isActionAvailable(state, a.id).available);
      if (acts.length && rand() < 0.5) {
        const a = acts[Math.floor(rand() * acts.length)];
        const params = {};
        for (const p of (a.params || [])) params[p.key] = p.default;
        state = applyInput(state, { t: 'action', id: a.id, params }, content);
      } else {
        state = applyInput(state, { t: 'endTurn' }, content);
      }
    }
  }
  return state;
}

describe('确定性：同种子同输入必须得到同一局', () => {
  it('同 seed 生成同样的出身、角色和剧本', () => {
    const a = createGame('SEED-ALPHA', content);
    const b = createGame('SEED-ALPHA', content);
    expect(a.origin).toEqual(b.origin);
    expect(a.scriptId).toBe(b.scriptId);
    expect(a.goalId).toBe(b.goalId);
  });

  it('不同 seed 会开出不同的局', () => {
    const seeds = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'];
    const fingerprints = new Set(seeds.map(s => {
      const g = createGame(s, content);
      return `${g.origin.role}|${g.origin.platformName}|${g.scriptId}`;
    }));
    expect(fingerprints.size).toBeGreaterThan(1);
  });

  it('跑两遍同一局，最终分完全一致', () => {
    for (const seed of ['R-1', 'R-2', 'R-3']) {
      const a = playFullGame(seed, 42);
      const b = playFullGame(seed, 42);
      expect(computeFinalScore(a).total, `seed=${seed}`).toBe(computeFinalScore(b).total);
      expect(a.quartersPassed).toBe(b.quartersPassed);
      expect(a.survived).toBe(b.survived);
    }
  });
});

describe('重放：从 seed + inputLog 能还原整局', () => {
  it('state 自带 seed 和 inputLog，重放后分数一致', () => {
    for (const [seed, botSeed] of [['P-1', 7], ['P-2', 99], ['P-3', 1234]]) {
      const played = playFullGame(seed, botSeed);
      expect(played.seed).toBe(seed);
      expect(Array.isArray(played.inputLog)).toBe(true);
      expect(played.inputLog.length).toBeGreaterThan(0);

      const replayed = replayGame({ seed: played.seed, inputs: played.inputLog }, content);
      expect(computeFinalScore(replayed).total, `seed=${seed}`).toBe(computeFinalScore(played).total);
      expect(replayed.metrics).toEqual(played.metrics);
      expect(replayed.survived).toBe(played.survived);
      expect(replayed.quartersPassed).toBe(played.quartersPassed);
    }
  });

  it('主动操作也在 inputLog 里，否则重放算不出同样的指标', () => {
    const played = playFullGame('ACT-1', 5);
    expect(played.inputLog.some(i => i.t === 'action'), '这局机器人应该用过主动操作').toBe(true);
    const replayed = replayGame({ seed: 'ACT-1', inputs: played.inputLog }, content);
    expect(replayed.metrics).toEqual(played.metrics);
  });

  it('篡改任何一个选择，重放出的分数就对不上', () => {
    const played = playFullGame('TAMPER-1', 11);
    const tampered = played.inputLog.map((i, idx) => {
      if (i.t !== 'event') return i;
      return idx === played.inputLog.findIndex(x => x.t === 'event') ? { ...i, idx: (i.idx + 1) % 3 } : i;
    });
    const replayed = replayGame({ seed: 'TAMPER-1', inputs: tampered }, content);
    const diff = computeFinalScore(replayed).total !== computeFinalScore(played).total
      || replayed.quartersPassed !== played.quartersPassed
      || JSON.stringify(replayed.metrics) !== JSON.stringify(played.metrics);
    expect(diff, '改了决策却重放出一模一样的局，说明重放没吃输入').toBe(true);
  });

  it('输入序列比实际长（多塞几步）不会把局推过 12 季', () => {
    const played = playFullGame('OVER-1', 3);
    const padded = [...played.inputLog, { t: 'endTurn' }, { t: 'endTurn' }, { t: 'endTurn' }];
    const replayed = replayGame({ seed: 'OVER-1', inputs: padded }, content);
    expect(replayed.quartersPassed).toBeLessThanOrEqual(12);
  });
});
