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
