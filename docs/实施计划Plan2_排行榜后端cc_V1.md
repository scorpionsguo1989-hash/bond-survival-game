# Plan 2：排行榜后端 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为债市生存游戏添加排行榜后端，玩家通关后成绩持久化，支持 Top 20 展示和个人排名查询。

**Architecture:** 后端为独立的 Node.js + Express 进程（`api/` 目录），SQLite 持久化。前端新增 `js/api.js` 封装 HTTP 调用，修改 `main.js` 和 `ui.js` 对接排行榜。部署时 nginx 托管静态文件，`/api` 路径反代到 Node.js :3000。

**Tech Stack:** Express 4.x, better-sqlite3, PM2 (部署), Vitest (测试)

**设计稿:** `docs/设计稿Plan2_排行榜后端cc_V1.md`

---

## 文件结构

### 新增文件

| 文件 | 职责 |
|------|------|
| `api/package.json` | 后端独立依赖声明 |
| `api/db.js` | SQLite 初始化 + 查询函数（纯数据层） |
| `api/validate.js` | 请求体校验逻辑（纯函数） |
| `api/server.js` | Express 入口：路由 + 中间件 + 频率限制 |
| `js/api.js` | 前端 API 调用封装（3个函数） |
| `tests/api-validate.test.js` | validate.js 校验逻辑的单元测试 |
| `tests/api-db.test.js` | db.js 数据层的单元测试 |

### 修改文件

| 文件 | 变更 |
|------|------|
| `js/main.js` | `enterEndScreen` 增加昵称输入 + 提交成绩 + 排名展示；`init` 增加排行榜按钮入口 |
| `js/ui.js` | 新增 `renderLeaderboardModal` 和 `renderNicknamePrompt` 函数 |
| `css/style.css` | 追加排行榜弹窗和昵称输入框样式 |

---

## Task 1：后端项目脚手架

**Files:**
- Create: `api/package.json`

- [ ] **Step 1: 创建 api/package.json**

```json
{
  "name": "bond-game-api",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js"
  },
  "dependencies": {
    "express": "^4.21.0",
    "better-sqlite3": "^11.7.0"
  }
}
```

- [ ] **Step 2: 安装依赖**

Run: `cd api && npm install`
Expected: `node_modules` 创建，无报错。

- [ ] **Step 3: 更新 .gitignore**

在项目根目录 `.gitignore` 末尾追加：

```
api/node_modules/
api/leaderboard.db
```

确保数据库文件和 api 的 node_modules 不入库。

- [ ] **Step 4: Commit**

```bash
git add api/package.json api/package-lock.json .gitignore
git commit -m "feat(api): scaffold backend package with express and better-sqlite3"
```

---

## Task 2：数据层（db.js）

**Files:**
- Create: `api/db.js`
- Test: `tests/api-db.test.js`

- [ ] **Step 1: 写测试**

```js
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
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- tests/api-db.test.js`
Expected: FAIL — `Cannot find module '../api/db.js'`

- [ ] **Step 3: 实现 db.js**

```js
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
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- tests/api-db.test.js`
Expected: 6 tests PASS

- [ ] **Step 5: 运行全量测试确认无破坏**

Run: `npm test`
Expected: 全量通过（原 35 + 新 6 = 41）

- [ ] **Step 6: Commit**

```bash
git add api/db.js tests/api-db.test.js
git commit -m "feat(api): database layer with insert, top-N query, and rank lookup"
```

---

## Task 3：校验层（validate.js）

**Files:**
- Create: `api/validate.js`
- Test: `tests/api-validate.test.js`

- [ ] **Step 1: 写测试**

```js
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
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- tests/api-validate.test.js`
Expected: FAIL — `Cannot find module '../api/validate.js'`

- [ ] **Step 3: 实现 validate.js**

```js
// api/validate.js

const VALID_GRADES = ['S', 'A', 'B', 'C', 'D'];
const VALID_REGIONS = ['east_core', 'central_capital', 'west_prefecture', 'northeast_old'];
const VALID_HEALTH = ['good', 'medium', 'weak'];

// 与前端 score.js getScoreGrade 保持一致
const GRADE_RANGES = {
  S: [90, 200],
  A: [75, 89],
  B: [60, 74],
  C: [40, 59],
  D: [0, 39],
};

export function validateScoreSubmission(data) {
  if (!data || typeof data !== 'object') {
    return fail('request body must be a JSON object');
  }

  // nickname: optional, max 20 chars
  if (data.nickname != null) {
    if (typeof data.nickname !== 'string' || data.nickname.length > 20) {
      return fail('nickname must be a string of at most 20 characters');
    }
  }

  // directorName: required, max 30
  if (!data.directorName || typeof data.directorName !== 'string' || data.directorName.length > 30) {
    return fail('directorName is required and must be at most 30 characters');
  }

  // platformName: required, max 30
  if (!data.platformName || typeof data.platformName !== 'string' || data.platformName.length > 30) {
    return fail('platformName is required and must be at most 30 characters');
  }

  // regionTier
  if (!VALID_REGIONS.includes(data.regionTier)) {
    return fail('regionTier must be one of: ' + VALID_REGIONS.join(', '));
  }

  // healthLevel
  if (!VALID_HEALTH.includes(data.healthLevel)) {
    return fail('healthLevel must be one of: ' + VALID_HEALTH.join(', '));
  }

  // score: integer 0-200
  if (!Number.isInteger(data.score) || data.score < 0 || data.score > 200) {
    return fail('score must be an integer between 0 and 200');
  }

  // grade
  if (!VALID_GRADES.includes(data.grade)) {
    return fail('grade must be one of: S, A, B, C, D');
  }

  // grade-score consistency
  const [min, max] = GRADE_RANGES[data.grade];
  if (data.score < min || data.score > max) {
    return fail(`grade ${data.grade} requires score ${min}-${max}, got ${data.score}`);
  }

  // quartersPassed: 1-12
  if (!Number.isInteger(data.quartersPassed) || data.quartersPassed < 1 || data.quartersPassed > 12) {
    return fail('quartersPassed must be an integer between 1 and 12');
  }

  // survived
  if (typeof data.survived !== 'boolean') {
    return fail('survived must be a boolean');
  }

  // survived + quarters consistency
  if (data.survived && data.quartersPassed !== 12) {
    return fail('survived=true requires quartersPassed=12');
  }

  return { valid: true };
}

function fail(error) {
  return { valid: false, error };
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- tests/api-validate.test.js`
Expected: 14 tests PASS

- [ ] **Step 5: 运行全量测试**

Run: `npm test`
Expected: 全量通过（原 35 + db 6 + validate 14 = 55）

- [ ] **Step 6: Commit**

```bash
git add api/validate.js tests/api-validate.test.js
git commit -m "feat(api): request validation with grade-score consistency check"
```

---

## Task 4：Express 服务入口（server.js）

**Files:**
- Create: `api/server.js`

此 Task 不写单元测试——server.js 是胶水层（组合 db + validate + Express），逻辑已在前两个 Task 中覆盖。

- [ ] **Step 1: 实现 server.js**

```js
// api/server.js
import express from 'express';
import { createDb, insertScore, getTopScores, getRank } from './db.js';
import { validateScoreSubmission } from './validate.js';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'leaderboard.db');
const PORT = process.env.PORT || 3000;

const db = createDb(DB_PATH);
const app = express();

app.use(express.json());

// --- 频率限制：同 IP 60秒内限1次 POST ---
const recentIPs = new Map(); // ip -> timestamp

function rateLimit(req, res, next) {
  const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.ip;
  const now = Date.now();
  const last = recentIPs.get(ip);
  if (last && now - last < 60_000) {
    const wait = Math.ceil((60_000 - (now - last)) / 1000);
    return res.status(429).json({ ok: false, error: `请等待 ${wait} 秒后再提交` });
  }
  recentIPs.set(ip, now);
  next();
}

// 定期清理过期条目，避免内存泄漏
setInterval(() => {
  const cutoff = Date.now() - 120_000;
  for (const [ip, ts] of recentIPs) {
    if (ts < cutoff) recentIPs.delete(ip);
  }
}, 120_000);

// --- Routes ---

app.post('/api/scores', rateLimit, (req, res) => {
  const validation = validateScoreSubmission(req.body);
  if (!validation.valid) {
    return res.status(400).json({ ok: false, error: validation.error });
  }

  try {
    insertScore(db, req.body);
    const { rank } = getRank(db, req.body.score);
    res.json({ ok: true, rank });
  } catch (err) {
    console.error('Insert score failed:', err);
    res.status(500).json({ ok: false, error: 'internal server error' });
  }
});

app.get('/api/leaderboard', (req, res) => {
  try {
    const data = getTopScores(db, 20);
    const ranked = data.map((row, i) => ({ rank: i + 1, ...row }));
    res.json({ ok: true, data: ranked });
  } catch (err) {
    console.error('Get leaderboard failed:', err);
    res.status(500).json({ ok: false, error: 'internal server error' });
  }
});

app.get('/api/rank', (req, res) => {
  const score = parseInt(req.query.score, 10);
  if (!Number.isInteger(score) || score < 0 || score > 200) {
    return res.status(400).json({ ok: false, error: 'score query parameter must be 0-200' });
  }

  try {
    const result = getRank(db, score);
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('Get rank failed:', err);
    res.status(500).json({ ok: false, error: 'internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Bond Game API running on port ${PORT}`);
});
```

- [ ] **Step 2: 手动冒烟测试**

终端 1：
```bash
cd api && node server.js
```
Expected: `Bond Game API running on port 3000`

终端 2：
```bash
# 提交成绩
curl -s -X POST http://localhost:3000/api/scores \
  -H 'Content-Type: application/json' \
  -d '{"directorName":"铁算盘","platformName":"云中城建","regionTier":"central_capital","healthLevel":"medium","score":85,"grade":"A","survived":true,"quartersPassed":12}'

# 查看排行榜
curl -s http://localhost:3000/api/leaderboard | python3 -m json.tool

# 查看排名
curl -s "http://localhost:3000/api/rank?score=85" | python3 -m json.tool

# 测试校验拒绝
curl -s -X POST http://localhost:3000/api/scores \
  -H 'Content-Type: application/json' \
  -d '{"directorName":"x","platformName":"y","regionTier":"east_core","healthLevel":"good","score":999,"grade":"S","survived":true,"quartersPassed":12}'

# 测试频率限制（60秒内重复提交）
curl -s -X POST http://localhost:3000/api/scores \
  -H 'Content-Type: application/json' \
  -d '{"directorName":"铁算盘","platformName":"云中城建","regionTier":"central_capital","healthLevel":"medium","score":85,"grade":"A","survived":true,"quartersPassed":12}'
```

Expected:
- 第一个 POST → `{"ok":true,"rank":1}`
- GET leaderboard → 包含刚提交的记录
- GET rank → `{"ok":true,"rank":1,"total":1}`
- 非法 score 999 → 400 错误
- 重复提交 → 429 频率限制

完成后 Ctrl+C 关闭服务器，删除测试数据库：`rm api/leaderboard.db`

- [ ] **Step 3: Commit**

```bash
git add api/server.js
git commit -m "feat(api): express server with scores, leaderboard, rank endpoints"
```

---

## Task 5：前端 API 封装（api.js）

**Files:**
- Create: `js/api.js`

此文件在浏览器中运行，使用 fetch API，不写单元测试（依赖网络）。

- [ ] **Step 1: 实现 api.js**

```js
// js/api.js

const API_BASE = '/api';

export async function submitScore(data) {
  try {
    const resp = await fetch(`${API_BASE}/scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch (e) {
    console.warn('submitScore failed:', e);
    return null;
  }
}

export async function fetchLeaderboard() {
  try {
    const resp = await fetch(`${API_BASE}/leaderboard`);
    if (!resp.ok) return null;
    return await resp.json();
  } catch (e) {
    console.warn('fetchLeaderboard failed:', e);
    return null;
  }
}

export async function fetchRank(score) {
  try {
    const resp = await fetch(`${API_BASE}/rank?score=${score}`);
    if (!resp.ok) return null;
    return await resp.json();
  } catch (e) {
    console.warn('fetchRank failed:', e);
    return null;
  }
}
```

- [ ] **Step 2: 运行全量测试确认无破坏**

Run: `npm test`
Expected: 全量通过（55 tests）。api.js 不被测试 import，不会影响现有测试。

- [ ] **Step 3: Commit**

```bash
git add js/api.js
git commit -m "feat: frontend API client with graceful error handling"
```

---

## Task 6：排行榜弹窗 UI + 昵称输入 UI

**Files:**
- Modify: `js/ui.js`（末尾追加两个函数）
- Modify: `css/style.css`（末尾追加样式）

- [ ] **Step 1: 在 ui.js 末尾追加排行榜弹窗渲染函数**

```js
// 追加到 js/ui.js 末尾

export function renderLeaderboardModal(leaderboardData, onClose) {
  const overlay = document.createElement('div');
  overlay.id = 'leaderboard-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(10,14,26,0.95);z-index:1000;overflow-y:auto;padding:20px';

  const rows = (leaderboardData || []).map(row => {
    const name = escapeHtml(row.nickname || row.directorName);
    const regionLabel = REGION_LABELS[row.regionTier] || row.regionTier;
    const healthLabel = HEALTH_LABELS[row.healthLevel] || row.healthLevel;
    return `
      <tr>
        <td class="lb-rank">#${row.rank}</td>
        <td class="lb-name">${name}</td>
        <td class="lb-platform">${escapeHtml(row.platformName)}</td>
        <td class="lb-difficulty">${regionLabel}·${healthLabel}</td>
        <td class="lb-grade grade-${row.grade}">${row.grade}</td>
        <td class="lb-score">${row.score}</td>
        <td class="lb-quarters">${row.quartersPassed}/12</td>
      </tr>
    `;
  }).join('');

  const emptyMsg = leaderboardData && leaderboardData.length > 0
    ? ''
    : '<tr><td colspan="7" style="text-align:center;color:#4a6080;padding:40px">暂无记录，等你来创造历史</td></tr>';

  overlay.innerHTML = `
    <div class="lb-container">
      <div class="lb-header">
        <span class="lb-title">排行榜 · Top 20</span>
        <button id="btn-lb-close" class="lb-close-btn">✕</button>
      </div>
      <table class="lb-table">
        <thead>
          <tr>
            <th>排名</th><th>昵称</th><th>平台</th><th>难度</th><th>评级</th><th>总分</th><th>存活</th>
          </tr>
        </thead>
        <tbody>${rows}${emptyMsg}</tbody>
      </table>
    </div>
  `;

  document.body.appendChild(overlay);
  document.getElementById('btn-lb-close').addEventListener('click', () => {
    overlay.remove();
    if (onClose) onClose();
  });
}

export function renderNicknamePrompt(onSubmit, onSkip) {
  const overlay = document.createElement('div');
  overlay.id = 'nickname-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(10,14,26,0.9);z-index:1000;display:flex;align-items:center;justify-content:center';

  overlay.innerHTML = `
    <div class="nickname-card">
      <div class="nickname-title">留下你的大名</div>
      <div class="nickname-subtitle">上榜后其他玩家可以看到（选填）</div>
      <input type="text" id="input-nickname" class="nickname-input" maxlength="20" placeholder="最多20个字符">
      <div class="nickname-actions">
        <button id="btn-nick-submit" class="btn-primary">提交成绩</button>
        <button id="btn-nick-skip" class="btn-secondary">跳过</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  document.getElementById('btn-nick-submit').addEventListener('click', () => {
    const val = document.getElementById('input-nickname').value.trim();
    overlay.remove();
    onSubmit(val || null);
  });
  document.getElementById('btn-nick-skip').addEventListener('click', () => {
    overlay.remove();
    onSkip();
  });
}
```

- [ ] **Step 2: 在 css/style.css 末尾追加排行榜和昵称输入样式**

```css
/* 追加到 css/style.css 末尾 */

/* === 排行榜弹窗 === */
.lb-container { max-width: 900px; margin: 30px auto; }
.lb-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.lb-title { font-size: 18px; color: #e0eaf8; letter-spacing: 2px; }
.lb-close-btn { background: none; border: 1px solid #1e2d47; color: #4a6080; width: 32px; height: 32px; border-radius: 4px; cursor: pointer; font-size: 14px; }
.lb-close-btn:hover { border-color: #4fc3f7; color: #4fc3f7; }
.lb-table { width: 100%; border-collapse: collapse; background: #0f1623; border: 1px solid #1e2d47; border-radius: 6px; overflow: hidden; }
.lb-table th { font-size: 10px; letter-spacing: 1px; color: #4a6080; text-transform: uppercase; text-align: left; padding: 10px 12px; border-bottom: 1px solid #1e2d47; background: #0a1020; }
.lb-table td { padding: 10px 12px; border-bottom: 1px solid #0d1a2e; font-size: 12px; }
.lb-rank { color: #4fc3f7; font-weight: bold; min-width: 40px; }
.lb-name { color: #e0eaf8; }
.lb-platform { color: #6a8aaa; }
.lb-difficulty { color: #4a6080; font-size: 11px; }
.lb-grade { font-weight: bold; font-size: 14px; }
.lb-score { color: #4fc3f7; font-weight: bold; }
.lb-quarters { color: #6a8aaa; }

/* === 昵称输入弹窗 === */
.nickname-card { background: #0f1623; border: 1px solid #1e2d47; border-radius: 12px; padding: 36px; text-align: center; max-width: 400px; width: 90%; }
.nickname-title { font-size: 20px; color: #e0eaf8; margin-bottom: 8px; }
.nickname-subtitle { font-size: 12px; color: #4a6080; margin-bottom: 24px; }
.nickname-input { width: 100%; padding: 12px 16px; background: #07101e; border: 1px solid #1e3a5f; border-radius: 6px; color: #e0eaf8; font-size: 14px; text-align: center; outline: none; margin-bottom: 20px; }
.nickname-input:focus { border-color: #4fc3f7; }
.nickname-input::placeholder { color: #2a4060; }
.nickname-actions { display: flex; gap: 12px; justify-content: center; }
```

- [ ] **Step 3: 运行全量测试确认无破坏**

Run: `npm test`
Expected: 全量通过（55 tests）。UI 函数不被测试 import。

- [ ] **Step 4: Commit**

```bash
git add js/ui.js css/style.css
git commit -m "feat(ui): leaderboard modal and nickname prompt components"
```

---

## Task 7：主流程对接（main.js）

**Files:**
- Modify: `js/main.js`

- [ ] **Step 1: 在 main.js 顶部追加 import**

在现有 import 块末尾追加一行：

```js
import { submitScore, fetchLeaderboard, fetchRank } from './api.js';
```

同时在 `ui.js` import 中追加两个新函数：

将：
```js
import { renderFateCard, renderMainScreen, renderCrisisModal, renderEndScreen, generateShareCard, downloadShareCard } from './ui.js';
```
改为：
```js
import { renderFateCard, renderMainScreen, renderCrisisModal, renderEndScreen, generateShareCard, downloadShareCard, renderLeaderboardModal, renderNicknamePrompt } from './ui.js';
```

- [ ] **Step 2: 改造 enterEndScreen 函数**

将整个 `enterEndScreen` 函数替换为：

```js
function enterEndScreen() {
  const finalScore = computeFinalScore(state);
  pushHistoryRecord({
    platformName: state.origin.platformName,
    score: finalScore.total,
    grade: finalScore.grade.grade,
    survived: state.survived,
    quartersPassed: state.quartersPassed,
  });
  clearSave();

  // 弹出昵称输入，然后提交成绩
  renderNicknamePrompt(
    (nickname) => submitAndShowEnd(nickname, finalScore),
    () => submitAndShowEnd(null, finalScore),
  );
}

async function submitAndShowEnd(nickname, finalScore) {
  const scoreData = {
    nickname,
    directorName: state.origin.directorName,
    platformName: state.origin.platformName,
    regionTier: state.origin.regionTier,
    healthLevel: state.origin.healthLevel,
    score: finalScore.total,
    grade: finalScore.grade.grade,
    survived: state.survived,
    quartersPassed: state.quartersPassed,
  };

  // 提交成绩（失败时 rank 为 null，静默降级）
  const result = await submitScore(scoreData);
  const rank = result?.rank || null;

  renderEndScreen(state, finalScore, {
    rank,
    onRestart: () => { state = null; startNewGame(); },
    onShare: (fs) => {
      const dataUrl = generateShareCard(state, fs);
      downloadShareCard(dataUrl, `债市生存_${state.origin.directorName}_${fs.grade.grade}.png`);
    },
    onLeaderboard: showLeaderboard,
  });
}
```

- [ ] **Step 3: 添加排行榜展示函数**

在 `enterEndScreen` 下方追加：

```js
async function showLeaderboard() {
  const result = await fetchLeaderboard();
  renderLeaderboardModal(result?.data || [], null);
}
```

- [ ] **Step 4: 修改 startNewGame，在命运卡前加排行榜入口**

将 `startNewGame` 函数替换为：

```js
function startNewGame() {
  const origin = generateOrigin('cfo');
  state = createInitialState(origin);
  loadCurrentTurnEvent();
  renderFateCard(origin, () => {
    enterMainScreen();
  });

  // 命运卡界面渲染后，追加排行榜按钮
  requestAnimationFrame(() => {
    const container = document.querySelector('.fate-container');
    if (container && !document.getElementById('btn-home-leaderboard')) {
      const btn = document.createElement('button');
      btn.id = 'btn-home-leaderboard';
      btn.className = 'btn-secondary';
      btn.style.cssText = 'margin-top:16px;display:block;margin-left:auto;margin-right:auto';
      btn.textContent = '查看排行榜';
      btn.addEventListener('click', showLeaderboard);
      container.appendChild(btn);
    }
  });
}
```

- [ ] **Step 5: 运行全量测试确认无破坏**

Run: `npm test`
Expected: 全量通过（55 tests）。main.js 不被测试 import。

- [ ] **Step 6: Commit**

```bash
git add js/main.js
git commit -m "feat(main): integrate leaderboard submission, nickname prompt, and homepage entry"
```

---

## Task 8：终局界面显示排名 + 排行榜按钮

**Files:**
- Modify: `js/ui.js`（修改 `renderEndScreen` 函数）

- [ ] **Step 1: 修改 renderEndScreen 接收并展示 rank**

在 `renderEndScreen` 函数中，`callbacks` 参数现在额外包含 `rank`（数字或 null）和 `onLeaderboard`。

将 `renderEndScreen` 函数替换为：

```js
export function renderEndScreen(state, finalScore, callbacks) {
  const app = document.getElementById('app');
  const gradeClass = `grade-${finalScore.grade.grade}`;
  const rankHtml = callbacks.rank
    ? `<div style="font-size:16px;color:#ffd54f;margin-top:12px">你的排名：第 ${callbacks.rank} 名</div>`
    : '';
  app.innerHTML = `
    <div class="screen active">
      <div class="endgame-container">
        <div class="endgame-header">
          <div class="endgame-status">${state.survived ? '✓ 成功通关' : '✗ 中途失败：' + (state.deathReason || '未知原因')}</div>
          <div class="endgame-grade ${gradeClass}">${finalScore.grade.grade}</div>
          <div style="font-size:18px;color:#e0eaf8">${finalScore.grade.label}</div>
          <div style="font-size:32px;color:#4fc3f7;margin-top:8px">${finalScore.total}<span style="font-size:14px;color:#4a6080"> / 100</span></div>
          ${rankHtml}
          <div style="font-size:12px;color:#6a8aaa;margin-top:8px">${state.origin.platformName} · ${state.origin.directorName}</div>
          <div style="font-size:11px;color:#4a6080;margin-top:4px">存活 ${state.quartersPassed} / 12 季度</div>
        </div>

        <div class="radar-card">
          <div class="panel-title">六维评分</div>
          <div style="height:280px"><canvas id="chart-radar"></canvas></div>
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-top:14px">
            ${Object.entries(finalScore.dimensions).map(([k, v]) => `
              <div style="display:flex;justify-content:space-between;font-size:11px">
                <span style="color:#6a8aaa">${k}</span>
                <span style="color:${v>=70?'#81c784':v>=50?'#ffb74d':'#ef5350'}">${Math.round(v)}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="endgame-actions">
          <button id="btn-restart" class="btn-primary">再来一局</button>
          <button id="btn-leaderboard" class="btn-secondary">排行榜</button>
          <button id="btn-share" class="btn-secondary">生成分享卡片</button>
        </div>
      </div>
    </div>
  `;
  requestAnimationFrame(() => renderRadarChart('chart-radar', finalScore.dimensions));
  document.getElementById('btn-restart').addEventListener('click', callbacks.onRestart);
  document.getElementById('btn-share').addEventListener('click', () => callbacks.onShare(finalScore));
  document.getElementById('btn-leaderboard').addEventListener('click', callbacks.onLeaderboard);
}
```

- [ ] **Step 2: 运行全量测试**

Run: `npm test`
Expected: 全量通过（55 tests）

- [ ] **Step 3: Commit**

```bash
git add js/ui.js
git commit -m "feat(ui): show player rank on endscreen and add leaderboard button"
```

---

## Task 9：部署配置文档

**Files:**
- Create: `api/DEPLOY.md`

- [ ] **Step 1: 写部署指南**

```markdown
# 排行榜后端部署指南

## 前提

- 轻量云服务器已安装 Node.js 18+
- 已安装 nginx
- 项目文件已部署到 `/var/www/game/`

## 1. 安装后端依赖

```bash
cd /var/www/game/api
npm install --production
```

## 2. 启动服务

使用 PM2 守护进程：

```bash
npm install -g pm2
cd /var/www/game/api
pm2 start server.js --name bond-game-api
pm2 save
pm2 startup  # 按照输出提示执行命令，实现开机自启
```

验证：
```bash
curl http://localhost:3000/api/leaderboard
# 应返回 {"ok":true,"data":[]}
```

## 3. 配置 nginx

在 nginx 配置中添加（或修改已有 server block）：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/game;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
        gzip on;
        gzip_types text/css application/javascript application/json;
    }

    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $host;
    }
}
```

```bash
nginx -t          # 测试配置
nginx -s reload   # 重载
```

## 4. 验证

```bash
# 从服务器外部访问
curl https://your-domain.com/api/leaderboard
```

## 5. 常用运维命令

```bash
pm2 status              # 查看状态
pm2 logs bond-game-api  # 查看日志
pm2 restart bond-game-api  # 重启
```

数据库文件位于 `api/leaderboard.db`，定期备份即可。
```

- [ ] **Step 2: Commit**

```bash
git add api/DEPLOY.md
git commit -m "docs: backend deployment guide"
```

---

## 完成检查

所有 Task 完成后，运行以下验证：

```bash
# 1. 全量测试
npm test
# Expected: 55 tests, 9 files, all pass

# 2. 文件清单
ls api/
# Expected: DEPLOY.md  db.js  leaderboard.db (if tested)  node_modules  package-lock.json  package.json  server.js  validate.js

ls js/api.js
# Expected: js/api.js

# 3. git log
git log --oneline -10
```
