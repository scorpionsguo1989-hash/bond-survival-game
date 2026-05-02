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
      role            TEXT    NOT NULL DEFAULT 'cfo',
      created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_scores_score ON scores(score DESC);

    -- 决策记录：每局每个事件一条，用于同侪信号聚合
    -- total_score 与 survived 冗余存储以避免 JOIN
    CREATE TABLE IF NOT EXISTS decisions (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      score_id      INTEGER NOT NULL,
      event_id      TEXT    NOT NULL,
      role          TEXT    NOT NULL,
      choice_idx    INTEGER NOT NULL,
      outcome       TEXT,
      total_score   INTEGER NOT NULL,
      survived      INTEGER NOT NULL,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (score_id) REFERENCES scores(id)
    );
    CREATE INDEX IF NOT EXISTS idx_decisions_event_role ON decisions(event_id, role);
    CREATE INDEX IF NOT EXISTS idx_decisions_score_id ON decisions(score_id);
  `);
  try {
    db.exec(`ALTER TABLE scores ADD COLUMN role TEXT NOT NULL DEFAULT 'cfo'`);
  } catch (e) {
    // Existing databases may already have the role column.
  }
  db.exec(`CREATE INDEX IF NOT EXISTS idx_scores_role_score ON scores(role, score DESC);`);
  return db;
}

const INSERT_SQL = `
  INSERT INTO scores (nickname, director_name, platform_name, region_tier, health_level, score, grade, survived, quarters_passed, role)
  VALUES (@nickname, @directorName, @platformName, @regionTier, @healthLevel, @score, @grade, @survived, @quartersPassed, @role)
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
    role: data.role || 'cfo',
  });
  return result.lastInsertRowid;
}

export function getTopScores(db, limit = 20, role = null) {
  const where = role ? 'WHERE role = ?' : '';
  const stmt = db.prepare(`
    SELECT id, nickname, director_name AS directorName, platform_name AS platformName,
           region_tier AS regionTier, health_level AS healthLevel,
           score, grade, survived, quarters_passed AS quartersPassed, role, created_at AS createdAt
    FROM scores
    ${where}
    ORDER BY score DESC, created_at ASC
    LIMIT ?
  `);
  const rows = role ? stmt.all(role, limit) : stmt.all(limit);
  return rows.map(row => ({
    ...row,
    survived: row.survived === 1,
  }));
}

export function getRank(db, score, role = null) {
  const countAbove = role
    ? db.prepare('SELECT COUNT(*) AS cnt FROM scores WHERE role = ? AND score > ?').get(role, score)
    : db.prepare('SELECT COUNT(*) AS cnt FROM scores WHERE score > ?').get(score);
  const total = role
    ? db.prepare('SELECT COUNT(*) AS cnt FROM scores WHERE role = ?').get(role)
    : db.prepare('SELECT COUNT(*) AS cnt FROM scores').get();
  return {
    rank: countAbove.cnt + 1,
    total: total.cnt,
  };
}

// ─── 决策（同侪信号）相关 ────────────────────────

const INSERT_DECISION_SQL = `
  INSERT INTO decisions (score_id, event_id, role, choice_idx, outcome, total_score, survived)
  VALUES (@scoreId, @eventId, @role, @choiceIdx, @outcome, @totalScore, @survived)
`;

// 一次性插入一局的所有决策（用 transaction 保证原子）
// decisions: [{ eventId, choiceIdx, outcome }]
export function insertDecisions(db, { scoreId, role, totalScore, survived, decisions }) {
  if (!Array.isArray(decisions) || decisions.length === 0) return 0;
  const stmt = db.prepare(INSERT_DECISION_SQL);
  const insertMany = db.transaction((rows) => {
    for (const d of rows) {
      stmt.run({
        scoreId,
        eventId: d.eventId,
        role,
        choiceIdx: d.choiceIdx,
        outcome: d.outcome || null,
        totalScore,
        survived: survived ? 1 : 0,
      });
    }
  });
  insertMany(decisions);
  return decisions.length;
}

// 查询某事件 × 角色下，每个 choice 的真实分布
// 返回 [{choice_idx, cnt, high_cnt, survived_cnt}]
// high_cnt 定义：该选择对应的玩家本局总分 ≥ 75（即 A 级或 S 级）
const PEER_SIGNAL_SQL = `
  SELECT
    choice_idx,
    COUNT(*) AS cnt,
    SUM(CASE WHEN total_score >= 75 THEN 1 ELSE 0 END) AS high_cnt,
    SUM(CASE WHEN survived = 1 THEN 1 ELSE 0 END) AS survived_cnt
  FROM decisions
  WHERE event_id = ? AND role = ?
  GROUP BY choice_idx
  ORDER BY choice_idx ASC
`;

export function getPeerSignalRaw(db, eventId, role) {
  return db.prepare(PEER_SIGNAL_SQL).all(eventId, role);
}
