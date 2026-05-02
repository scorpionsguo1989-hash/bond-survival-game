// api/server.js
import express from 'express';
import { createDb, insertScore, getTopScores, getRank, insertDecisions, getPeerSignalRaw } from './db.js';
import { validateScoreSubmission, VALID_ROLES } from './validate.js';
import { generatePortrait, validatePortraitPayload } from './portrait.js';
import { generateHeadline, generateCoachAdvice, validateHeadlinePayload, validateCoachPayload } from './coaching.js';
import { buildSeedMap, getSeedSignal, blendDistribution } from './peerSeeds.js';
import { loadAllContent, createSession, serveBundle } from './contentVault.js';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'leaderboard.db');
const PORT = process.env.PORT || 3000;

const db = createDb(DB_PATH);
const app = express();

// portrait 请求 body 略大（含 decisions 列表），上限放 64 KB
app.use(express.json({ limit: '64kb' }));

// CORS 仅本地开发使用（生产 nginx 反向代理走同源）
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// --- 频率限制：通用工厂，按窗口分别限速 ---
function makeRateLimit(windowMs, label = 'submit') {
  const recent = new Map();
  setInterval(() => {
    const cutoff = Date.now() - windowMs * 2;
    for (const [ip, ts] of recent) if (ts < cutoff) recent.delete(ip);
  }, Math.max(windowMs, 60_000));
  return (req, res, next) => {
    const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.ip;
    const now = Date.now();
    const last = recent.get(ip);
    if (last && now - last < windowMs) {
      const wait = Math.ceil((windowMs - (now - last)) / 1000);
      return res.status(429).json({ ok: false, error: `请等待 ${wait} 秒后再${label}` });
    }
    recent.set(ip, now);
    next();
  };
}

const rateLimit = makeRateLimit(60_000, '提交');           // POST /api/scores
const portraitRateLimit = makeRateLimit(20_000, '生成画像'); // POST /api/portrait（20s 一次，留重试空间）
const headlineRateLimit = makeRateLimit(15_000, '生成标题'); // POST /api/headline（15s 一次）
const coachRateLimit = makeRateLimit(10_000, '请教 AI');     // POST /api/coach（10s 一次，玩家可能想换决策再问）
// session init 限流：3 秒一次（防爆破创建 token，同时不挡正常重试）
const sessionInitRateLimit = makeRateLimit(3_000, '创建 session');
// bundle 接口本身**不**加外层限流：contentVault 内部已有 PER_IP_MAX_SESSIONS=50/小时 +
// 每 token 只能拿 1 次 bundle 的双重约束，外层再加 6s 窗口会卡死正常 init→bundle 串行流程

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
    // 同步写 decisions（如果客户端提供了）。失败不影响 score 提交。
    if (Array.isArray(data.decisions) && data.decisions.length > 0) {
      try {
        insertDecisions(db, {
          scoreId: id,
          role: data.role,
          totalScore: data.score,
          survived: data.survived,
          decisions: data.decisions,
        });
      } catch (decErr) {
        console.warn('[decisions] insert failed, score still saved:', decErr.message);
      }
    }
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

// --- 同侪信号：种子分布 + 真实分布 blend ---
app.get('/api/peer-signal', (req, res) => {
  const eventId = req.query.eventId;
  const role = req.query.role;
  if (!eventId || typeof eventId !== 'string' || eventId.length > 80) {
    return res.status(400).json({ ok: false, error: 'eventId required (1-80 chars)' });
  }
  if (!role || !VALID_ROLES.includes(role)) {
    return res.status(400).json({ ok: false, error: 'role must be one of: ' + VALID_ROLES.join(', ') });
  }
  try {
    const seed = getSeedSignal(eventId, role);
    if (!seed) {
      return res.json({ ok: true, source: 'none', samples: 0, choices: [] });
    }
    const realStats = getPeerSignalRaw(db, eventId, role);
    const blended = blendDistribution(seed, realStats);
    res.json({ ok: true, ...blended });
  } catch (err) {
    console.error('Get peer signal failed:', err);
    res.status(500).json({ ok: false, error: 'internal server error' });
  }
});

// --- AI 战后画像（DeepSeek 代理 + 模板兜底） ---
app.post('/api/portrait', portraitRateLimit, async (req, res) => {
  const payload = req.body;
  const v = validatePortraitPayload(payload);
  if (!v.valid) {
    return res.status(400).json({ ok: false, error: v.error });
  }
  try {
    const result = await generatePortrait(payload);
    res.json({
      ok: true,
      portrait: result.portrait,
      source: result.source,         // 'deepseek' | 'fallback'
      cached: !!result.cached,
      reason: result.reason || null, // 'no_api_key' | 'timeout' | 'api_error'
    });
  } catch (err) {
    console.error('Generate portrait failed:', err);
    res.status(500).json({ ok: false, error: 'portrait generation failed' });
  }
});

// --- 爆款标题生成（朋友圈分享用） ---
app.post('/api/headline', headlineRateLimit, async (req, res) => {
  const payload = req.body;
  const v = validateHeadlinePayload(payload);
  if (!v.valid) return res.status(400).json({ ok: false, error: v.error });
  try {
    const result = await generateHeadline(payload);
    res.json({
      ok: true,
      headline: result.headline,
      body: result.body,
      source: result.source,
      cached: !!result.cached,
      reason: result.reason || null,
    });
  } catch (err) {
    console.error('Generate headline failed:', err);
    res.status(500).json({ ok: false, error: 'headline generation failed' });
  }
});

// --- 决策助手（中立分析，不给答案） ---
app.post('/api/coach', coachRateLimit, async (req, res) => {
  const payload = req.body;
  const v = validateCoachPayload(payload);
  if (!v.valid) return res.status(400).json({ ok: false, error: v.error });
  try {
    const result = await generateCoachAdvice(payload);
    res.json({
      ok: true,
      advice: result.advice,
      source: result.source,
      reason: result.reason || null,
    });
  } catch (err) {
    console.error('Generate coach advice failed:', err);
    res.status(500).json({ ok: false, error: 'coach advice failed' });
  }
});

// ───────────────────────────────────────────────────
// 内容鉴权下发（防 wget content/*.json 白嫖）
//
// POST /api/session/init
//   body: {} （未来可以传 mainSiteToken 接入主站统一鉴权）
//   resp: { ok, sessionId, ttlSec }
//
// POST /api/content/bundle
//   body: { sessionId }
//   resp: { ok, bundle: { main, random, blackSwans, sagaEvents, openingEvents, npcLibrary } }
//
// 限流：每 IP 6s 一次接口调用 + contentVault 内部 1IP/小时 5 token + 1 token/小时 1 bundle
// 水印：bundle 里每个 event.body 末尾嵌入零宽字符标识，溯源盗版
// ───────────────────────────────────────────────────
app.post('/api/session/init', sessionInitRateLimit, (req, res) => {
  const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.ip;
  const result = createSession(ip);
  if (!result.ok) {
    return res.status(429).json({ ok: false, error: result.error });
  }
  res.json({ ok: true, sessionId: result.sessionId, ttlSec: result.ttlSec });
});

// bundle 不加外层 6s 限流：vault 内部约束已经够（每 token 仅 1 次）
app.post('/api/content/bundle', (req, res) => {
  const sessionId = req.body?.sessionId;
  if (!sessionId || typeof sessionId !== 'string' || sessionId.length !== 32) {
    return res.status(400).json({ ok: false, error: 'sessionId required (32 hex chars)' });
  }
  const result = serveBundle(sessionId);
  if (!result.ok) {
    return res.status(result.status || 401).json({ ok: false, error: result.error });
  }
  res.json({ ok: true, bundle: result.bundle });
});

// 启动时预热种子分布 + 内容仓库
buildSeedMap();
loadAllContent();  // 把 content/*.json 全部读到 memory，避免首次请求时 IO 慢

app.listen(PORT, () => {
  console.log(`Bond Game API running on port ${PORT}`);
  console.log(`DeepSeek key configured: ${process.env.DEEPSEEK_API_KEY ? 'yes' : 'NO (will use fallback)'}`);
});
