// api/contentVault.js
// 内容服务端化：把 content/*.json 全部加载进内存，按 token 鉴权后下发 bundle。
//
// 设计目标：
//   1. 移除 /content/*.json 的直接访问 → 任何人不能 wget 下来全部内容
//   2. 必须通过 POST /api/content/bundle + 有效 sessionToken 才能拿到
//   3. 每个 bundle 嵌入零宽字符水印，标识 sessionId → 发现盗版能溯源
//   4. token 限流：1 小时 5 个 token / IP，1 个 token 1 小时只能拿 1 次 bundle
//   5. 不动 game engine 的 sample / find 逻辑，只换"数据从哪来"

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// content 目录在项目根的 ../content（api/ 上一级）
const CONTENT_DIR = path.join(__dirname, '..', 'content');

// ─── 1. 启动加载所有 content JSON 到内存 ───────
let _contentCache = null;

function readJsonOrEmpty(filename, defaultVal) {
  const fullPath = path.join(CONTENT_DIR, filename);
  try {
    const raw = fs.readFileSync(fullPath, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    console.warn(`[contentVault] ${filename} read failed:`, e.message);
    return defaultVal;
  }
}

export function loadAllContent() {
  if (_contentCache) return _contentCache;
  const main = readJsonOrEmpty('mainEvents.json', []);
  const random = readJsonOrEmpty('randomEvents.json', []);
  const randomIm = readJsonOrEmpty('randomEventsIM.json', []);
  const randomGov = readJsonOrEmpty('randomEventsGOV.json', []);
  const blackSwans = readJsonOrEmpty('blackSwans.json', []);
  const blackSwansV2 = readJsonOrEmpty('blackSwansV2.json', []);
  const seasonalEvents = readJsonOrEmpty('seasonalEvents.json', []);
  const targetedEvents = readJsonOrEmpty('targetedEvents.json', []);
  const sagaEventsRaw = readJsonOrEmpty('sagaEvents.json', []);
  const npcLibraryRaw = readJsonOrEmpty('npcLibrary.json', {});
  const openingEventsRaw = readJsonOrEmpty('openingEvents.json', { events: [] });
  const historicalSagasRaw = readJsonOrEmpty('historicalSagas.json', { events: [] });

  // 与现有 eventEngine.loadEvents 输出结构 1:1 对齐
  _contentCache = {
    main,
    random: [...random, ...randomIm, ...randomGov, ...seasonalEvents, ...targetedEvents],
    blackSwans: [...blackSwans, ...blackSwansV2],
    sagaEvents: [
      ...(Array.isArray(sagaEventsRaw) ? sagaEventsRaw : (sagaEventsRaw.events || [])),
      ...(Array.isArray(historicalSagasRaw) ? historicalSagasRaw : (historicalSagasRaw.events || [])),
    ],
    npcLibrary: npcLibraryRaw,
    openingEvents: Array.isArray(openingEventsRaw) ? openingEventsRaw : (openingEventsRaw.events || []),
  };

  const stats = {
    main: _contentCache.main.length,
    random: _contentCache.random.length,
    blackSwans: _contentCache.blackSwans.length,
    sagaEvents: _contentCache.sagaEvents.length,
    openingEvents: _contentCache.openingEvents.length,
  };
  console.log('[contentVault] loaded:', JSON.stringify(stats));
  return _contentCache;
}

// ─── 2. Session Token 管理 ───────
// sessionId → { ip, createdAt, bundleServedAt, role?, scriptId? }
const _sessions = new Map();
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;          // 2 小时 token 过期
const PER_IP_SESSION_WINDOW_MS = 60 * 60 * 1000;    // 1 小时窗口
// 容量规划：2000 同时在线 · 最差 NAT 一出口 200+ 玩家挤同一公司白领上班点开微信
// 500/h 兜得住公司级 NAT，挡爬虫靠 token-level 5s 冷却 + 水印溯源
const PER_IP_MAX_SESSIONS = 500;
// 同一 token 拿 bundle 的冷却：5 秒。
// 之前设 1 小时太严 —— 玩家刷新页面就被卡（同 token 重复请求）。
// 反正同 token 拿 N 次 bundle 的水印一样，溯源效果不变；爬虫也不会通过同 token 多拿。
// 真正约束爬虫的是 PER_IP_MAX_SESSIONS 50/小时（不同 token 才能拿到不同水印）。
const PER_TOKEN_BUNDLE_INTERVAL_MS = 5_000;

// 定期清理过期 session
setInterval(() => {
  const cutoff = Date.now() - SESSION_TTL_MS;
  for (const [id, s] of _sessions) {
    if (s.createdAt < cutoff) _sessions.delete(id);
  }
}, 10 * 60 * 1000);

// IP → [createdAt, ...]（统计 1 小时内此 IP 创建过的 session）
function countRecentSessionsByIp(ip) {
  const cutoff = Date.now() - PER_IP_SESSION_WINDOW_MS;
  let n = 0;
  for (const s of _sessions.values()) {
    if (s.ip === ip && s.createdAt > cutoff) n++;
  }
  return n;
}

export function createSession(ip) {
  if (countRecentSessionsByIp(ip) >= PER_IP_MAX_SESSIONS) {
    return { ok: false, error: '请求过于频繁，请 1 小时后重试' };
  }
  const sessionId = crypto.randomBytes(16).toString('hex'); // 32 hex chars
  _sessions.set(sessionId, {
    ip,
    createdAt: Date.now(),
    bundleServedAt: 0,
  });
  return { ok: true, sessionId, ttlSec: Math.floor(SESSION_TTL_MS / 1000) };
}

export function getSession(sessionId) {
  if (!sessionId || typeof sessionId !== 'string') return null;
  const s = _sessions.get(sessionId);
  if (!s) return null;
  if (Date.now() - s.createdAt > SESSION_TTL_MS) {
    _sessions.delete(sessionId);
    return null;
  }
  return s;
}

// ─── 3. 水印：零宽字符把 sessionId 前 4 字节嵌入 event body ───────
// ZWSP (U+200B) = bit 0；ZWNJ (U+200C) = bit 1
// 8 hex chars = 32 bit = 32 个零宽字符尾巴，肉眼不可见
function makeWatermark(sessionId) {
  // 取 sessionId 前 8 hex chars = 32 bit
  const hexHead = (sessionId || '').slice(0, 8).padEnd(8, '0');
  const bigInt = BigInt('0x' + hexHead);
  let mark = '';
  for (let i = 31; i >= 0; i--) {
    const bit = Number((bigInt >> BigInt(i)) & 1n);
    mark += bit ? '‌' : '​';
  }
  return mark;
}

// 解码（运营反查盗版用）：从一段含水印的文本里抽出 sessionId 前 8 hex
export function extractWatermark(textWithMark) {
  const matches = textWithMark.match(/[​‌]{32}/);
  if (!matches) return null;
  let bigInt = 0n;
  for (const c of matches[0]) {
    bigInt = (bigInt << 1n) | (c === '‌' ? 1n : 0n);
  }
  return bigInt.toString(16).padStart(8, '0');
}

function watermarkEvent(ev, mark) {
  // 不动原对象，深 clone 简单字段；roles 内 body 末尾追加 mark
  const cloned = JSON.parse(JSON.stringify(ev));
  if (cloned.roles && typeof cloned.roles === 'object') {
    for (const r of Object.keys(cloned.roles)) {
      if (cloned.roles[r] && typeof cloned.roles[r].body === 'string') {
        cloned.roles[r].body += mark;
      }
    }
  }
  if (typeof cloned.body === 'string') {
    cloned.body += mark;
  }
  return cloned;
}

function watermarkBundle(content, sessionId) {
  const mark = makeWatermark(sessionId);
  return {
    main: content.main.map(e => watermarkEvent(e, mark)),
    random: content.random.map(e => watermarkEvent(e, mark)),
    blackSwans: content.blackSwans.map(e => watermarkEvent(e, mark)),
    sagaEvents: content.sagaEvents.map(e => watermarkEvent(e, mark)),
    openingEvents: content.openingEvents.map(e => watermarkEvent(e, mark)),
    npcLibrary: content.npcLibrary,  // NPC 库不打水印（结构不同 + 短文本）
    _meta: { watermarked: true, mark_length: mark.length },
  };
}

// ─── 4. 对外接口：拿 bundle ───────
export function serveBundle(sessionId) {
  const s = getSession(sessionId);
  if (!s) {
    return { ok: false, status: 401, error: 'session 无效或已过期，请刷新页面重新开始' };
  }
  // 同一 token 5 秒冷却（防爆破，但不影响刷新）
  if (s.bundleServedAt && Date.now() - s.bundleServedAt < PER_TOKEN_BUNDLE_INTERVAL_MS) {
    const wait = Math.ceil((PER_TOKEN_BUNDLE_INTERVAL_MS - (Date.now() - s.bundleServedAt)) / 1000);
    return { ok: false, status: 429, error: `请等待 ${wait} 秒后再请求内容` };
  }
  const content = loadAllContent();
  const bundle = watermarkBundle(content, sessionId);
  s.bundleServedAt = Date.now();
  return { ok: true, status: 200, bundle };
}
