// scripts/balance-lib.mjs
// 平衡体检的测量内核。CLI 见 balance-check.mjs，扫参数见 balance-tune.mjs。
//
// 设计目标（沿用立项口径，见 roles/im.js 注释）：**称职玩家通关率 ~70%**，
// 也就是大约 30% 的人过不了关。改任何影响难度的数值后都应该重跑这个脚本。
//
//   node scripts/balance-check.mjs [每档每角色局数，默认 400]
import { readFileSync } from 'node:fs';
import { createGame, applyInput } from '../js/gameLoop.js';
import { computeFinalScore } from '../js/score.js';

const readJson = (p) => JSON.parse(readFileSync(new URL(`../content/${p}`, import.meta.url), 'utf8'));
const asArray = (d) => (Array.isArray(d) ? d : d.events || []);
const content = {
  main: readJson('mainEvents.json'),
  random: [
    ...readJson('randomEvents.json'), ...readJson('randomEventsIM.json'),
    ...readJson('randomEventsGOV.json'), ...readJson('seasonalEvents.json'),
    ...readJson('targetedEvents.json'),
  ],
  blackSwans: [...readJson('blackSwans.json'), ...readJson('blackSwansV2.json')],
  sagaEvents: [...readJson('sagaEvents.json'), ...asArray(readJson('historicalSagas.json'))],
  openingEvents: asArray(readJson('openingEvents.json')),
};

// 玩家自己的伪随机，跟游戏种子流无关，保证体检结果可复现
function lcg(seed) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

// ── 生存压力：离死亡条件还有多远，越大越危险（0-1）
function danger(state) {
  const m = state.metrics, role = state.role.id;
  if (role === 'cfo') return clamp01(1 - (m.cash ?? 0) / 6);
  if (role === 'im') return Math.max(clamp01(1 - ((m.nav ?? 1) - 0.85) / 0.15),
                                     clamp01(((m.concentration ?? 0) - 15) / 10),
                                     clamp01(((m.leverage ?? 100) - 110) / 30));
  return Math.max(clamp01(((m.debtRatio ?? 200) - 240) / 60),
                  clamp01((50 - (m.politicalScore ?? 60)) / 30),
                  clamp01(1 - (m.cash ?? 0) / 5));
}
function clamp01(v) { return Math.max(0, Math.min(1, v)); }

// 一个选项对"活下去"的即时贡献。称职玩家看得懂 effects 面板，所以按 effects 估。
function survivalValue(state, effects) {
  const role = state.role.id;
  const e = effects || {};
  const p = e._uncertainty === undefined ? 1 : e._uncertainty;   // 期望值口径
  let v = 0;
  if (role === 'cfo') v = (e.cash || 0) * 3 - (e.financingCost || 0) * 2 - (e.leverageRatio || 0) * 0.2;
  else if (role === 'im') v = (e.nav || 0) * 200 - (e.redemptionPressure || 0) * 0.15
                             - (e.concentration || 0) * 2 - (e.leverage || 0) * 0.3 + (e.cashRatio || 0) * 0.2;
  else v = (e.cash || 0) * 2 - (e.debtRatio || 0) * 0.5 + (e.politicalScore || 0) * 0.4
           - (e.hiddenDebtRisk || 0) * 0.05;
  return v * p;
}
// 分数向的价值（活得下去之后才追求的东西）
function scoreValue(effects) {
  return Object.entries(effects || {})
    .filter(([k]) => k.startsWith('score.'))
    .reduce((s, [, v]) => s + v, 0) * ((effects?._uncertainty) ?? 1);
}

// ── 三档玩家 ──────────────────────────────────────
// random：乱点，不看 effects
// decent：看 effects，危险时优先保命、安全时追分，缺钱会主动融资（"称职玩家"基准）
// sharp ：decent + 更早备款、更积极用满行动次数
const TIERS = {
  random: { look: false, actAt: 1.1, actionsPerTurn: 0 },
  decent: { look: true,  actAt: 0.55, actionsPerTurn: 1 },
  sharp:  { look: true,  actAt: 0.35, actionsPerTurn: 2 },
};

function chooseIdx(state, choices, tier, rand) {
  if (!tier.look) return Math.floor(rand() * choices.length);
  const d = danger(state);
  let best = 0, bestScore = -Infinity;
  choices.forEach((c, i) => {
    const s = survivalValue(state, c.effects) * (0.4 + d * 2) + scoreValue(c.effects) * (1.2 - d);
    if (s > bestScore) { bestScore = s; best = i; }
  });
  return best;
}

/**
 * 常规维持性操作：称职玩家不会等到爆雷才动手，有明显该做的事就会做。
 * 这跟"危险时补血"是两种行为，分开建模，否则会把玩家模拟成"不到爆雷不做事"，
 * 从而严重低估技能差距（GOV 就是这么被误测成 +1.7pp 的）。
 */
function routineAction(state, tier) {
  if (!tier.look) return null;
  const m = state.metrics, role = state.role.id;
  const pick = (id, useMax = false) => {
    const a = state.role.actions.find(x => x.id === id);
    if (!a || !state.role.isActionAvailable(state, id).available) return null;
    const params = {};
    for (const p of (a.params || [])) params[p.key] = useMax ? (p.max ?? p.default) : p.default;
    return { t: 'action', id, params };
  };
  if (role === 'gov') {
    // 债务率往红线走就置换；早期财力允许就投产业做大分母
    if ((m.debtRatio ?? 0) > 230) { const a = pick('hidden_debt_swap', true); if (a) return a; }
    if ((state.quartersPassed ?? 0) < 8 && (m.cash ?? 0) > 8) { const a = pick('attract_investment'); if (a) return a; }
    return null;
  }
  if (role === 'cfo') {
    // 到期高峰前提前备款（Q5-Q7 是默认节奏的高峰）
    const nextDue = m.debtMaturity?.[state.quartersPassed] ?? 0;
    if (nextDue > (m.cash ?? 0) * 0.6) { const a = pick('bank_loan'); if (a) return a; }
    return null;
  }
  // im：信用敞口偏高就调结构
  if ((m.creditExposure ?? 0) > 45) { const a = pick('restructure'); if (a) return a; }
  return null;
}

// 危险时用主动操作补血
function pickAction(state, tier) {
  if (!tier.actionsPerTurn) return null;
  if (danger(state) < tier.actAt) return routineAction(state, tier);
  const avail = state.role.actions.filter(a => state.role.isActionAvailable(state, a.id).available);
  if (!avail.length) return null;
  // 危险时的对症操作顺序（都是真实存在的 action id）
  const prefer = {
    cfo: ['bank_loan', 'bond_issue', 'asset_disposal', 'pre_funding', 'non_standard'],
    im: ['restructure', 'manage_expectation', 'sell_bond', 'buy_bond'],
    // 置换排在发债前面：专项债额度既能换现金也能置换隐债，但只有置换压得住债务率。
    // 把额度烧在换现金上是真实的误判，会让"更激进"反而更差。
    gov: ['hidden_debt_swap', 'transfer_appeal', 'land_auction', 'issue_special_bond', 'attract_investment'],
  }[state.role.id] || [];
  for (const id of prefer) {
    const a = avail.find(x => x.id === id);
    if (a) {
      const params = {};
      for (const p of (a.params || [])) params[p.key] = p.default;
      return { t: 'action', id: a.id, params };
    }
  }
  return null;
}

function playOne(tierName, seedNo) {
  const tier = TIERS[tierName];
  const rand = lcg(seedNo * 7919 + 13);
  let state = createGame(`BAL-${tierName}-${seedNo}`, content);
  let actionsThisTurn = 0;

  for (let guard = 0; guard < 500 && !state.gameOver; guard++) {
    if (state.pendingCrisis) {
      state = applyInput(state, { t: 'crisis', idx: chooseIdx(state, state.pendingCrisis.options, tier, rand) }, content);
      continue;
    }
    if (state.pendingEvent) {
      state = applyInput(state, { t: 'event', idx: chooseIdx(state, state.pendingEvent.choices, tier, rand) }, content);
      continue;
    }
    if (actionsThisTurn < tier.actionsPerTurn) {
      const act = pickAction(state, tier);
      if (act) {
        const before = state.actionsUsed;
        state = applyInput(state, act, content);
        if (state.actionsUsed !== before) { actionsThisTurn++; continue; }
      }
    }
    actionsThisTurn = 0;
    state = applyInput(state, { t: 'endTurn' }, content);
  }
  return {
    survived: state.survived && state.quartersPassed >= 12,
    quartersPassed: state.quartersPassed,
    reason: state.deathReason,
    role: state.origin.role,
    total: computeFinalScore(state).total,
  };
}


/** 跑批。返回 { tierName: [{survived, quartersPassed, reason, role, total}] } */
export function runBalance(runsPerRole = 300) {
  const byTier = {};
  for (const tierName of Object.keys(TIERS)) {
    const runs = [];
    for (let i = 0; i < runsPerRole * 3; i++) runs.push(playOne(tierName, i));
    byTier[tierName] = runs;
  }
  return byTier;
}

/** 汇总成通关率表：{ tier: { all, cfo, im, gov } }（0-1 小数） */
export function summarize(byTier) {
  const out = {};
  for (const [tier, runs] of Object.entries(byTier)) {
    const rate = (rs) => rs.length ? rs.filter(r => r.survived).length / rs.length : 0;
    out[tier] = {
      all: rate(runs),
      cfo: rate(runs.filter(r => r.role === 'cfo')),
      im: rate(runs.filter(r => r.role === 'im')),
      gov: rate(runs.filter(r => r.role === 'gov')),
    };
  }
  return out;
}
export { TIERS };
