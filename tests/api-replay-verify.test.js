// tests/api-replay-verify.test.js
// 排行榜可信度：服务端必须按 seed + inputs 自己重放复算，
// 不能像原来那样只查 score 落在 0-200、grade 与 score 自洽就收下。
import { describe, it, expect } from 'vitest';
import { verifySubmission, MAX_INPUTS } from '../api/replayVerify.js';
import { loadAllContent } from '../api/contentVault.js';
import { createGame, applyInput } from '../js/gameLoop.js';
import { computeFinalScore } from '../js/score.js';

const content = loadAllContent();

function bot(botSeed) {
  let s = botSeed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

/** 老老实实打一局，产出一份诚实的提交体 */
function honestSubmission(seed, botSeed = 7) {
  const rand = bot(botSeed);
  let state = createGame(seed, content);
  for (let g = 0; g < 400 && !state.gameOver; g++) {
    if (state.pendingCrisis) {
      state = applyInput(state, { t: 'crisis', idx: Math.floor(rand() * state.pendingCrisis.options.length) }, content);
    } else if (state.pendingEvent) {
      state = applyInput(state, { t: 'event', idx: Math.floor(rand() * state.pendingEvent.choices.length) }, content);
    } else if (rand() < 0.4) {
      const acts = state.role.actions.filter(a => state.role.isActionAvailable(state, a.id).available);
      if (!acts.length) { state = applyInput(state, { t: 'endTurn' }, content); continue; }
      const a = acts[Math.floor(rand() * acts.length)];
      const params = {};
      for (const p of (a.params || [])) params[p.key] = p.default;
      state = applyInput(state, { t: 'action', id: a.id, params }, content);
    } else {
      state = applyInput(state, { t: 'endTurn' }, content);
    }
  }
  const fs = computeFinalScore(state);
  return {
    submission: {
      seed: state.seed,
      inputs: state.inputLog,
      role: state.origin.role,
      score: fs.total,
      grade: fs.grade.grade,
      survived: state.survived,
      quartersPassed: state.quartersPassed,
    },
    state, fs,
  };
}

describe('服务端重放复算', () => {
  it('诚实提交能通过，并回填服务端自己算出来的分', () => {
    for (const seed of ['V-1', 'V-2', 'V-3']) {
      const { submission, fs } = honestSubmission(seed);
      const out = verifySubmission(submission, content);
      expect(out.ok, `seed=${seed} ${out.error}`).toBe(true);
      expect(out.verified.score).toBe(fs.total);
      expect(out.verified.grade).toBe(fs.grade.grade);
      expect(out.verified.survived).toBe(submission.survived);
      expect(out.verified.quartersPassed).toBe(submission.quartersPassed);
    }
  });

  it('虚报高分会被驳回', () => {
    const { submission } = honestSubmission('CHEAT-1');
    const forged = { ...submission, score: 99, grade: 'S' };
    const out = verifySubmission(forged, content);
    expect(out.ok).toBe(false);
    expect(out.error).toMatch(/分数|不一致|复算/);
  });

  it('虚报"通关"会被驳回', () => {
    const { submission, state } = honestSubmission('CHEAT-2', 3);
    // 挑一局实际没打满 12 季的，谎称通关
    if (state.quartersPassed >= 12) return;
    const forged = { ...submission, survived: true, quartersPassed: 12 };
    const out = verifySubmission(forged, content);
    expect(out.ok).toBe(false);
  });

  it('缺 seed 或 inputs 直接拒收，不再放过无法验证的提交', () => {
    const { submission } = honestSubmission('V-4');
    expect(verifySubmission({ ...submission, seed: undefined }, content).ok).toBe(false);
    expect(verifySubmission({ ...submission, inputs: undefined }, content).ok).toBe(false);
    expect(verifySubmission({ ...submission, inputs: 'not-an-array' }, content).ok).toBe(false);
  });

  it('超长输入序列拒收，不给 DoS 留口子', () => {
    const { submission } = honestSubmission('V-5');
    const flood = { ...submission, inputs: Array.from({ length: MAX_INPUTS + 1 }, () => ({ t: 'endTurn' })) };
    const out = verifySubmission(flood, content);
    expect(out.ok).toBe(false);
    expect(out.error).toMatch(/过长|上限/);
  });

  it('伪造的输入结构不会让服务端崩', () => {
    const { submission } = honestSubmission('V-6');
    const junk = [{ t: 'event', idx: 999 }, { t: 'action', id: '不存在' }, { t: '???' }, null, 42];
    expect(() => verifySubmission({ ...submission, inputs: junk }, content)).not.toThrow();
    expect(verifySubmission({ ...submission, inputs: junk }, content).ok).toBe(false);
  });
});
