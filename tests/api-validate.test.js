// tests/api-validate.test.js
import { describe, it, expect } from 'vitest';
import { validateScoreSubmission } from '../api/validate.js';

const validData = {
  nickname: '债王',
  directorName: '铁算盘',
  platformName: '云中城建',
  regionTier: 'central_capital',
  healthLevel: 'medium',
  score: 85,
  grade: 'A',
  survived: true,
  quartersPassed: 12,
};

describe('validateScoreSubmission', () => {
  it('accepts valid data', () => {
    const result = validateScoreSubmission(validData);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('accepts null nickname', () => {
    const result = validateScoreSubmission({ ...validData, nickname: null });
    expect(result.valid).toBe(true);
  });

  it('accepts missing nickname', () => {
    const { nickname, ...noNick } = validData;
    const result = validateScoreSubmission(noNick);
    expect(result.valid).toBe(true);
  });

  it('rejects score below 0', () => {
    const result = validateScoreSubmission({ ...validData, score: -1 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('score');
  });

  it('rejects score above 200', () => {
    const result = validateScoreSubmission({ ...validData, score: 201 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('score');
  });

  it('rejects non-integer score', () => {
    const result = validateScoreSubmission({ ...validData, score: 'abc' });
    expect(result.valid).toBe(false);
  });

  it('rejects quartersPassed below 1', () => {
    const result = validateScoreSubmission({ ...validData, quartersPassed: 0, survived: false });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('quartersPassed');
  });

  it('rejects quartersPassed above 12', () => {
    const result = validateScoreSubmission({ ...validData, quartersPassed: 13 });
    expect(result.valid).toBe(false);
  });

  it('rejects invalid grade', () => {
    const result = validateScoreSubmission({ ...validData, grade: 'X' });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('grade');
  });

  it('rejects grade-score mismatch: grade S but score 50', () => {
    const result = validateScoreSubmission({ ...validData, grade: 'S', score: 50 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('grade');
  });

  it('rejects survived=true with quartersPassed < 12', () => {
    const result = validateScoreSubmission({ ...validData, survived: true, quartersPassed: 8 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('survived');
  });

  it('accepts survived=false with quartersPassed < 12', () => {
    const result = validateScoreSubmission({ ...validData, survived: false, quartersPassed: 8, score: 30, grade: 'D' });
    expect(result.valid).toBe(true);
  });

  it('accepts missing role (defaults to cfo)', () => {
    const { role, ...noRole } = validData;
    const result = validateScoreSubmission(noRole);
    expect(result.valid).toBe(true);
  });

  it('accepts role=cfo', () => {
    const result = validateScoreSubmission({ ...validData, role: 'cfo' });
    expect(result.valid).toBe(true);
  });

  it('accepts role=im', () => {
    const result = validateScoreSubmission({ ...validData, role: 'im' });
    expect(result.valid).toBe(true);
  });

  it('accepts role=gov for future compatibility', () => {
    const result = validateScoreSubmission({ ...validData, role: 'gov' });
    expect(result.valid).toBe(true);
  });

  it('rejects invalid role', () => {
    const result = validateScoreSubmission({ ...validData, role: 'xxx' });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('role');
  });

  it('rejects nickname longer than 20 chars', () => {
    const result = validateScoreSubmission({ ...validData, nickname: 'a'.repeat(21) });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('nickname');
  });

  it('rejects missing directorName', () => {
    const result = validateScoreSubmission({ ...validData, directorName: '' });
    expect(result.valid).toBe(false);
  });

  it('rejects missing platformName', () => {
    const result = validateScoreSubmission({ ...validData, platformName: undefined });
    expect(result.valid).toBe(false);
  });
});
