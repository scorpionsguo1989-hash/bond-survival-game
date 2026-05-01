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
