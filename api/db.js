// api/db.js
import Database from 'better-sqlite3';

export function createDb(path) {
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS scores (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      nickname        TEXT,
      director_name   TEXT    NOT NULL,
      platform_name   TEXT    NOT NULL,
      region_tier     TEXT    NOT NULL,
      health_level    TEXT    NOT NULL,
      score           INTEGER NOT NULL,
      grade           TEXT    NOT NULL,
      survived        INTEGER NOT NULL DEFAULT 0,
      quarters_passed INTEGER NOT NULL,
      created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_scores_score ON scores(score DESC);
  `);
  return db;
}

const INSERT_SQL = `
  INSERT INTO scores (nickname, director_name, platform_name, region_tier, health_level, score, grade, survived, quarters_passed)
  VALUES (@nickname, @directorName, @platformName, @regionTier, @healthLevel, @score, @grade, @survived, @quartersPassed)
`;

export function insertScore(db, data) {
  const stmt = db.prepare(INSERT_SQL);
  const result = stmt.run({
    nickname: data.nickname || null,
    directorName: data.directorName,
    platformName: data.platformName,
    regionTier: data.regionTier,
    healthLevel: data.healthLevel,
    score: data.score,
    grade: data.grade,
    survived: data.survived ? 1 : 0,
    quartersPassed: data.quartersPassed,
  });
  return result.lastInsertRowid;
}

export function getTopScores(db, limit) {
  const stmt = db.prepare(`
    SELECT id, nickname, director_name AS directorName, platform_name AS platformName,
           region_tier AS regionTier, health_level AS healthLevel,
           score, grade, survived, quarters_passed AS quartersPassed, created_at AS createdAt
    FROM scores
    ORDER BY score DESC, created_at ASC
    LIMIT ?
  `);
  return stmt.all(limit).map(row => ({
    ...row,
    survived: row.survived === 1,
  }));
}

export function getRank(db, score) {
  const countAbove = db.prepare('SELECT COUNT(*) AS cnt FROM scores WHERE score > ?').get(score);
  const total = db.prepare('SELECT COUNT(*) AS cnt FROM scores').get();
  return {
    rank: countAbove.cnt + 1,
    total: total.cnt,
  };
}
