// api/server.js
import express from 'express';
import { createDb, insertScore, getTopScores, getRank } from './db.js';
import { validateScoreSubmission, VALID_ROLES } from './validate.js';
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
  const data = { ...req.body };
  if (!data.role) {
    data.role = 'cfo';
    console.warn('[BC-FALLBACK] POST /api/scores without role, defaulted to cfo');
  }

  const validation = validateScoreSubmission(data);
  if (!validation.valid) {
    return res.status(400).json({ ok: false, error: validation.error });
  }

  try {
    const id = insertScore(db, data);
    const { rank } = getRank(db, data.score, data.role);
    res.json({ ok: true, rank, id });
  } catch (err) {
    console.error('Insert score failed:', err);
    res.status(500).json({ ok: false, error: 'internal server error' });
  }
});

app.get('/api/leaderboard', (req, res) => {
  const role = req.query.role || null;
  if (role && !VALID_ROLES.includes(role)) {
    return res.status(400).json({ ok: false, error: 'invalid role' });
  }

  try {
    const data = getTopScores(db, 20, role);
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
  const role = req.query.role || null;
  if (role && !VALID_ROLES.includes(role)) {
    return res.status(400).json({ ok: false, error: 'invalid role' });
  }

  try {
    const result = getRank(db, score, role);
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('Get rank failed:', err);
    res.status(500).json({ ok: false, error: 'internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Bond Game API running on port ${PORT}`);
});
