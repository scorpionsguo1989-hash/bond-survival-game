// tests/api-db.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { createDb, insertScore, getTopScores, getRank } from '../api/db.js';

function freshDb() {
  return createDb(':memory:');
}

describe('insertScore', () => {
  it('inserts a score and returns the id', () => {
    const db = freshDb();
    const id = insertScore(db, {
      nickname: '债王',
      directorName: '铁算盘',
      platformName: '云中城建',
      regionTier: 'central_capital',
      healthLevel: 'medium',
      score: 85,
      grade: 'A',
      survived: true,
      quartersPassed: 12,
    });
    expect(id).toBeGreaterThan(0);
  });

  it('allows null nickname', () => {
    const db = freshDb();
    const id = insertScore(db, {
      nickname: null,
      directorName: '老城墙',
      platformName: '星河基投',
      regionTier: 'east_core',
      healthLevel: 'good',
      score: 92,
      grade: 'S',
      survived: true,
      quartersPassed: 12,
    });
    expect(id).toBeGreaterThan(0);
  });
});

describe('getTopScores', () => {
  it('returns scores sorted descending, limited to N', () => {
    const db = freshDb();
    for (let i = 1; i <= 25; i++) {
      insertScore(db, {
        nickname: null,
        directorName: `花名${i}`,
        platformName: `平台${i}`,
        regionTier: 'east_core',
        healthLevel: 'good',
        score: i * 4,
        grade: 'B',
        survived: true,
        quartersPassed: 12,
      });
    }
    const top = getTopScores(db, 20);
    expect(top).toHaveLength(20);
    expect(top[0].score).toBe(100);
    expect(top[19].score).toBe(24);
  });

  it('returns empty array when no scores exist', () => {
    const db = freshDb();
    expect(getTopScores(db, 20)).toEqual([]);
  });
});

describe('getRank', () => {
  it('returns rank and total for a given score', () => {
    const db = freshDb();
    insertScore(db, { nickname: null, directorName: 'a', platformName: 'p', regionTier: 'east_core', healthLevel: 'good', score: 90, grade: 'S', survived: true, quartersPassed: 12 });
    insertScore(db, { nickname: null, directorName: 'b', platformName: 'p', regionTier: 'east_core', healthLevel: 'good', score: 70, grade: 'B', survived: true, quartersPassed: 12 });
    insertScore(db, { nickname: null, directorName: 'c', platformName: 'p', regionTier: 'east_core', healthLevel: 'good', score: 50, grade: 'C', survived: true, quartersPassed: 12 });

    const result = getRank(db, 70);
    expect(result.rank).toBe(2);
    expect(result.total).toBe(3);
  });

  it('returns rank 1 for the highest score', () => {
    const db = freshDb();
    insertScore(db, { nickname: null, directorName: 'a', platformName: 'p', regionTier: 'east_core', healthLevel: 'good', score: 95, grade: 'S', survived: true, quartersPassed: 12 });

    const result = getRank(db, 95);
    expect(result.rank).toBe(1);
    expect(result.total).toBe(1);
  });

  it('returns total+1 rank when score is lower than all', () => {
    const db = freshDb();
    insertScore(db, { nickname: null, directorName: 'a', platformName: 'p', regionTier: 'east_core', healthLevel: 'good', score: 90, grade: 'S', survived: true, quartersPassed: 12 });

    const result = getRank(db, 10);
    expect(result.rank).toBe(2);
    expect(result.total).toBe(1);
  });
});
