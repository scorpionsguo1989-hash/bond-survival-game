// js/api.js

// 本地开发：前端 :8080 + 游戏 API :3001（3000 留给主站 next dev）
// 生产：nginx 反代 /api → game backend，用相对路径走同源
const API_BASE = (typeof location !== 'undefined' && location.port === '8080')
  ? 'http://localhost:3001/api'
  : '/api';

// ─── 内容鉴权下发：从后端拿 sessionId + bundle ───
// 设计：sessionId 缓存到 sessionStorage（仅本浏览器 tab、关闭即销毁，不持久化）
// 失败 fallback：直接降级到原 fetch content/*.json 路径（开发期 + 后端没改造时仍能跑）

const SESSION_KEY = 'bond_game_sid';

export async function fetchSessionId() {
  // 优先用本 tab 已有 sessionId
  const cached = (typeof sessionStorage !== 'undefined') ? sessionStorage.getItem(SESSION_KEY) : null;
  if (cached) return cached;
  try {
    const resp = await fetch(`${API_BASE}/session/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!data?.ok || !data.sessionId) return null;
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(SESSION_KEY, data.sessionId);
    }
    return data.sessionId;
  } catch (e) {
    console.warn('fetchSessionId failed:', e);
    return null;
  }
}

export async function fetchContentBundle(sessionId) {
  if (!sessionId) return null;
  // 第一次尝试：用传入的 sessionId
  let bundle = await _doBundleFetch(sessionId);
  if (bundle) return bundle;

  // 失败兜底：旧 sessionId 可能 401（过期 / 服务器重启清了 map）→ 清缓存 + 重新 init + 再试一次
  // 这覆盖最常见场景：玩家刷新页面，sessionStorage 还存着旧 sid，但服务器已经不认了
  if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(SESSION_KEY);
  const newSid = await fetchSessionId();
  if (!newSid) return null;
  bundle = await _doBundleFetch(newSid);
  return bundle;  // 即使是 null 也返回，main.js 有显性失败提示
}

async function _doBundleFetch(sessionId) {
  try {
    const resp = await fetch(`${API_BASE}/content/bundle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!data?.ok || !data.bundle) return null;
    return data.bundle;
  } catch (e) {
    console.warn('_doBundleFetch failed:', e);
    return null;
  }
}

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

export async function fetchLeaderboard(role = null) {
  try {
    const url = role ? `${API_BASE}/leaderboard?role=${encodeURIComponent(role)}` : `${API_BASE}/leaderboard`;
    const resp = await fetch(url);
    if (!resp.ok) return null;
    return await resp.json();
  } catch (e) {
    console.warn('fetchLeaderboard failed:', e);
    return null;
  }
}

export async function fetchRank(score, role = null) {
  try {
    const roleParam = role ? `&role=${encodeURIComponent(role)}` : '';
    const resp = await fetch(`${API_BASE}/rank?score=${encodeURIComponent(score)}${roleParam}`);
    if (!resp.ok) return null;
    return await resp.json();
  } catch (e) {
    console.warn('fetchRank failed:', e);
    return null;
  }
}

// 同侪信号：拉取某事件×角色的群体分布
// 返回 { ok, source: 'seed'|'mixed'|'real'|'none', samples, choices: [{idx, pct, highScorePct, survivedPct, archetype}] }
// 失败时返回 null（不阻塞游戏，UI 静默降级）
const _peerCache = new Map();  // 客户端缓存：同事件 × 角色，5 分钟内只拉一次
const _peerInflight = new Map(); // 防并发：同 key 仅一个请求在飞
const PEER_TTL = 5 * 60 * 1000;

export async function fetchPeerSignal(eventId, role) {
  if (!eventId || !role) return null;
  const key = `${eventId}:${role}`;
  const cached = _peerCache.get(key);
  if (cached && Date.now() - cached.ts < PEER_TTL) return cached.data;
  if (_peerInflight.has(key)) return await _peerInflight.get(key);

  const promise = (async () => {
    try {
      const url = `${API_BASE}/peer-signal?eventId=${encodeURIComponent(eventId)}&role=${encodeURIComponent(role)}`;
      const resp = await fetch(url);
      if (!resp.ok) return null;
      const data = await resp.json();
      if (data?.ok) {
        _peerCache.set(key, { data, ts: Date.now() });
        return data;
      }
      return null;
    } catch (e) {
      console.warn('fetchPeerSignal failed:', e);
      return null;
    } finally {
      _peerInflight.delete(key);
    }
  })();
  _peerInflight.set(key, promise);
  return await promise;
}

// 爆款标题：返回 { ok, headline, body, source, cached, reason }
export async function fetchHeadline(payload, { timeoutMs = 28_000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const resp = await fetch(`${API_BASE}/headline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      return { ok: false, error: err.error || `HTTP ${resp.status}`, status: resp.status };
    }
    return await resp.json();
  } catch (e) {
    clearTimeout(t);
    return { ok: false, error: e.message?.includes('abort') ? '请求超时' : '网络错误' };
  }
}

// 决策助手：返回 { ok, advice, source, reason }
export async function fetchCoachAdvice(payload, { timeoutMs = 22_000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const resp = await fetch(`${API_BASE}/coach`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      return { ok: false, error: err.error || `HTTP ${resp.status}`, status: resp.status };
    }
    return await resp.json();
  } catch (e) {
    clearTimeout(t);
    return { ok: false, error: e.message?.includes('abort') ? '请求超时' : '网络错误' };
  }
}

// AI 战后画像：调用后端，后端代理 DeepSeek 或走模板兜底
// 返回 { ok, portrait, source: 'deepseek'|'fallback', cached, reason }
// 网络全断时返回 { ok: false, error }，由 UI 显示重试按钮
export async function fetchPortrait(payload, { timeoutMs = 30_000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const resp = await fetch(`${API_BASE}/portrait`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      return { ok: false, error: err.error || `HTTP ${resp.status}`, status: resp.status };
    }
    return await resp.json();
  } catch (e) {
    clearTimeout(t);
    console.warn('fetchPortrait failed:', e);
    return { ok: false, error: e.message?.includes('abort') ? '请求超时' : '网络错误' };
  }
}
