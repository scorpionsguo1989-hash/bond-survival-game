// api/peerSeeds.js — 同侪信号种子分布
//
// 工作原理：
//   1. 启动时一次性加载所有事件 JSON（main + random × 3 角色）
//   2. 对每个 (eventId, role) 计算每个 choice 的"激进度评分"
//   3. 根据激进度 → 生成预期分布（pct / highScorePct / survivedPct / archetype）
//   4. 对关键事件（HAND_PICKED）用手写值覆盖算法生成
//   5. 提供查询接口：getSeedSignal(eventId, role)
//
// 这套数据用于：
//   - 真实玩家 < 30 时直接展示"基于设计师推演"
//   - 真实玩家增多后按权重 blend，实现平滑过渡

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = path.join(__dirname, '..', 'content');

// ─────────────────────────────────────────────
// 1. 激进度评分
//    各指标的"边际激进度权重"——绝对值越大、激进度越高
// ─────────────────────────────────────────────

const METRIC_WEIGHT = {
  // CFO
  cash: 5,
  leverageRatio: 2,
  creditUsage: 1,
  financingCost: 8,
  collateralRoom: 0,   // 由 collateralRoom 字段单独处理
  // GOV
  debtRatio: 1.5,
  hiddenDebtRisk: 0.8,
  politicalScore: 0.8,
  specialBondQuota: 1.2,
  transferPayment: 0.6,
  industryIndex: 0.5,
  // IM
  nav: 250,            // 净值最敏感，0.01 = 大动作
  duration: 5,
  creditExposure: 1,
  concentration: 2,
  leverage: 1.2,
  cashRatio: 3,
  redemptionPressure: 1.5,
  fiscalRevenue: 0.5,
};

function scoreAggressiveness(choice) {
  const fx = choice.effects || {};
  let score = 0;

  // 不确定性是强激进信号
  if (typeof fx._uncertainty === 'number') {
    score += (1 - fx._uncertainty) * 40;  // 30% 成功率 → +28，70% → +12
  }

  // 数值类指标
  for (const [k, v] of Object.entries(fx)) {
    if (k.startsWith('_')) continue;
    if (k.startsWith('score.')) {
      // 维度分加成是中等信号；负向加成（自伤）也算激进
      score += Math.abs(v) * 1.2;
      continue;
    }
    if (typeof v !== 'number') continue;
    const w = METRIC_WEIGHT[k] ?? 1;
    score += Math.abs(v) * w;
  }

  // 抵押物降级 = 激进
  if (fx.collateralRoom === 'downgrade') score += 25;
  // 抵押物升级 = 偏稳健
  if (fx.collateralRoom === 'upgrade') score -= 5;

  // 延期类是中性偏稳健
  if (fx._delay) score -= 5;

  return Math.max(0, Math.min(100, score));
}

// ─────────────────────────────────────────────
// 2. 分布生成
//    输入：[choice]
//    输出：[{idx, pct, highScorePct, survivedPct, archetype}]
// ─────────────────────────────────────────────

function archetypeOf(aggr) {
  if (aggr < 15) return '保守派';
  if (aggr < 35) return '稳健派';
  if (aggr < 60) return '试探派';
  return '激进派';
}

// 群体偏好：中保守区最受欢迎；极端两头少
function popularityFromAggressiveness(aggr) {
  if (aggr < 12) return 32;
  if (aggr < 25) return 45;
  if (aggr < 40) return 48;
  if (aggr < 55) return 38;
  if (aggr < 70) return 28;
  return 18;
}

// 高分玩家偏好：偏稳健（不是极端保守，是有选择性的稳健）
function highScoreShift(aggr) {
  if (aggr < 12) return -2;   // 太保守反而不利
  if (aggr < 25) return 14;   // 稳健区高分玩家最爱
  if (aggr < 40) return 6;    // 试探区还行
  if (aggr < 60) return -8;
  return -15;                 // 极端激进，高分玩家少
}

// 存活率：激进度反相关
function survivedPctFromAggressiveness(aggr) {
  return Math.max(35, Math.min(94, 92 - aggr * 0.65));
}

// 注入小噪声，避免数据看起来太机械
function noise(seed, range = 6) {
  const h = parseInt(crypto.createHash('md5').update(String(seed)).digest('hex').slice(0, 6), 16);
  return (h % (range * 2 + 1)) - range;
}

function generateDistribution(choices, eventId, role) {
  if (!choices || choices.length === 0) return [];

  const aggrs = choices.map(scoreAggressiveness);

  // 1. 群体百分比（normalized to 100）
  const rawPop = aggrs.map((a, i) => {
    const base = popularityFromAggressiveness(a);
    return Math.max(8, base + noise(`${eventId}:${role}:${i}:pop`, 5));
  });
  const popSum = rawPop.reduce((a, b) => a + b, 0);
  const pcts = rawPop.map(v => Math.round((v / popSum) * 100));
  // 校正：保 sum = 100
  let diff = 100 - pcts.reduce((a, b) => a + b, 0);
  while (diff !== 0) {
    const sign = diff > 0 ? 1 : -1;
    const idx = sign > 0
      ? pcts.indexOf(Math.max(...pcts))
      : pcts.indexOf(Math.min(...pcts.filter(v => v > 1)));
    pcts[idx] += sign;
    diff -= sign;
  }

  // 2. 高分玩家百分比（独立 normalize）
  const rawHs = aggrs.map((a, i) => {
    const base = popularityFromAggressiveness(a) + highScoreShift(a);
    return Math.max(5, base + noise(`${eventId}:${role}:${i}:hs`, 4));
  });
  const hsSum = rawHs.reduce((a, b) => a + b, 0);
  const highScorePcts = rawHs.map(v => Math.round((v / hsSum) * 100));
  let hsDiff = 100 - highScorePcts.reduce((a, b) => a + b, 0);
  while (hsDiff !== 0) {
    const sign = hsDiff > 0 ? 1 : -1;
    const idx = sign > 0
      ? highScorePcts.indexOf(Math.max(...highScorePcts))
      : highScorePcts.indexOf(Math.min(...highScorePcts.filter(v => v > 1)));
    highScorePcts[idx] += sign;
    hsDiff -= sign;
  }

  // 3. 存活率（独立计算，不需 normalize）
  const survivedPcts = aggrs.map((a, i) =>
    Math.round(survivedPctFromAggressiveness(a) + noise(`${eventId}:${role}:${i}:sv`, 4))
  );

  return choices.map((c, i) => ({
    idx: i,
    pct: pcts[i],
    highScorePct: highScorePcts[i],
    survivedPct: Math.max(20, Math.min(96, survivedPcts[i])),
    archetype: archetypeOf(aggrs[i]),
  }));
}

// ─────────────────────────────────────────────
// 3. 关键事件手写覆盖
//    针对开局/转折/戏剧化的事件，注入"专家点评"风味
//    手写值会完全替代算法生成；同 eventId+role 唯一
// ─────────────────────────────────────────────

const HAND_PICKED = {
  // —— 开局事件（玩家最早遇到，体验影响最大）——
  'main_2022_q1_a:cfo': [
    { idx: 0, pct: 42, highScorePct: 56, survivedPct: 86, archetype: '稳健派' },
    { idx: 1, pct: 35, highScorePct: 26, survivedPct: 62, archetype: '试探派' },
    { idx: 2, pct: 23, highScorePct: 18, survivedPct: 48, archetype: '激进派' },
  ],
  'main_2022_q1_a:im': [
    { idx: 0, pct: 48, highScorePct: 64, survivedPct: 82, archetype: '稳健派' },
    { idx: 1, pct: 30, highScorePct: 24, survivedPct: 65, archetype: '试探派' },
    { idx: 2, pct: 22, highScorePct: 12, survivedPct: 38, archetype: '赌徒派' },
  ],
  'main_2022_q1_a:gov': [
    { idx: 0, pct: 52, highScorePct: 60, survivedPct: 80, archetype: '稳健派' },
    { idx: 1, pct: 28, highScorePct: 20, survivedPct: 62, archetype: '试探派' },
    { idx: 2, pct: 20, highScorePct: 20, survivedPct: 55, archetype: '改革派' },
  ],

  'main_2022_q1_b:cfo': [
    { idx: 0, pct: 58, highScorePct: 68, survivedPct: 84, archetype: '保守派' },
    { idx: 1, pct: 25, highScorePct: 18, survivedPct: 58, archetype: '试探派' },
    { idx: 2, pct: 17, highScorePct: 14, survivedPct: 42, archetype: '冒险派' },
  ],
};

// ─────────────────────────────────────────────
// 4. 加载 + 缓存
// ─────────────────────────────────────────────

let SEED_MAP = null;  // Map<"eventId:role", distribution>
let EVENT_INDEX = null; // Map<eventId, eventObj> for choice label lookup

function loadJsonSafe(filename) {
  try {
    const p = path.join(CONTENT_DIR, filename);
    if (!fs.existsSync(p)) return [];
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch (e) {
    console.warn(`[peerSeeds] failed to load ${filename}:`, e.message);
    return [];
  }
}

export function buildSeedMap() {
  if (SEED_MAP) return SEED_MAP;

  const main = loadJsonSafe('mainEvents.json');
  const randCFO = loadJsonSafe('randomEvents.json');
  const randIM = loadJsonSafe('randomEventsIM.json');
  const randGOV = loadJsonSafe('randomEventsGOV.json');

  SEED_MAP = new Map();
  EVENT_INDEX = new Map();

  // 处理 main events（roles.{cfo,im,gov}.choices 结构）
  for (const ev of main) {
    if (!ev?.id || !ev?.roles) continue;
    EVENT_INDEX.set(ev.id, ev);
    for (const role of ['cfo', 'im', 'gov']) {
      const choices = ev.roles[role]?.choices;
      if (!choices?.length) continue;
      const key = `${ev.id}:${role}`;
      const dist = HAND_PICKED[key] || generateDistribution(choices, ev.id, role);
      SEED_MAP.set(key, dist);
    }
  }

  // 处理 random events（按角色分文件，但同样可能有 roles 子结构）
  function processRandom(arr, defaultRole) {
    for (const ev of arr) {
      if (!ev?.id) continue;
      EVENT_INDEX.set(ev.id, ev);
      // random 也可能是 roles.{role}.choices 结构
      if (ev.roles) {
        for (const role of ['cfo', 'im', 'gov']) {
          const choices = ev.roles[role]?.choices;
          if (!choices?.length) continue;
          const key = `${ev.id}:${role}`;
          if (!SEED_MAP.has(key)) {
            SEED_MAP.set(key, HAND_PICKED[key] || generateDistribution(choices, ev.id, role));
          }
        }
      } else if (ev.choices) {
        // 简单结构：直接 choices（推断角色）
        const key = `${ev.id}:${defaultRole}`;
        if (!SEED_MAP.has(key)) {
          SEED_MAP.set(key, HAND_PICKED[key] || generateDistribution(ev.choices, ev.id, defaultRole));
        }
      }
    }
  }
  processRandom(randCFO, 'cfo');
  processRandom(randIM, 'im');
  processRandom(randGOV, 'gov');

  console.log(`[peerSeeds] loaded ${SEED_MAP.size} (eventId, role) seed distributions`);
  return SEED_MAP;
}

// 查询接口
export function getSeedSignal(eventId, role) {
  if (!SEED_MAP) buildSeedMap();
  return SEED_MAP.get(`${eventId}:${role}`) || null;
}

// 给 choice idx 取标签（用于终局对比页）
export function getChoiceLabel(eventId, role, choiceIdx) {
  if (!EVENT_INDEX) buildSeedMap();
  const ev = EVENT_INDEX.get(eventId);
  if (!ev) return null;
  const choices = ev.roles?.[role]?.choices || ev.choices;
  return choices?.[choiceIdx]?.label || null;
}

export function getEventTitle(eventId) {
  if (!EVENT_INDEX) buildSeedMap();
  return EVENT_INDEX.get(eventId)?.title || null;
}

// ─────────────────────────────────────────────
// 5. Blend：种子 vs 真实数据
//    输入：seedDist + realStats（来自 db）
//    realStats: [{choice_idx, cnt, high_cnt, survived_cnt}]
//    返回：{ source, samples, choices: [...] }
// ─────────────────────────────────────────────

const REAL_FULL_THRESHOLD = 100;  // ≥ 100 真实样本，完全用真实
const REAL_MIN_THRESHOLD = 10;    // < 10 真实样本，完全用种子

export function blendDistribution(seedDist, realStats) {
  if (!seedDist || seedDist.length === 0) {
    return { source: 'none', samples: 0, choices: [] };
  }
  const realByIdx = new Map((realStats || []).map(r => [r.choice_idx, r]));
  const totalSamples = (realStats || []).reduce((s, r) => s + (r.cnt || 0), 0);

  if (totalSamples < REAL_MIN_THRESHOLD) {
    return { source: 'seed', samples: totalSamples, choices: seedDist };
  }

  // 合成
  const blendWeight = Math.min(1, totalSamples / REAL_FULL_THRESHOLD);  // 0..1
  const merged = seedDist.map(s => {
    const r = realByIdx.get(s.idx);
    if (!r || r.cnt === 0) {
      return { ...s, _from: 'seed-only' };
    }
    const realPct = (r.cnt / totalSamples) * 100;
    const realHsPct = r.high_cnt > 0 ? (r.high_cnt / r.cnt) * 100 : 0;
    const realSvPct = (r.survived_cnt / r.cnt) * 100;
    return {
      idx: s.idx,
      pct: Math.round(s.pct * (1 - blendWeight) + realPct * blendWeight),
      highScorePct: Math.round(s.highScorePct * (1 - blendWeight) + realHsPct * blendWeight),
      survivedPct: Math.round(s.survivedPct * (1 - blendWeight) + realSvPct * blendWeight),
      archetype: s.archetype,
    };
  });

  // 重新归一化 pct
  const sum = merged.reduce((a, c) => a + c.pct, 0);
  if (sum !== 100 && sum > 0) {
    merged.forEach(c => { c.pct = Math.round((c.pct / sum) * 100); });
    let dd = 100 - merged.reduce((a, c) => a + c.pct, 0);
    while (dd !== 0) {
      const sign = dd > 0 ? 1 : -1;
      const idx = sign > 0
        ? merged.indexOf(merged.reduce((a, b) => a.pct > b.pct ? a : b))
        : merged.indexOf(merged.reduce((a, b) => a.pct < b.pct ? a : b));
      merged[idx].pct += sign;
      dd -= sign;
    }
  }

  return {
    source: blendWeight >= 1 ? 'real' : 'mixed',
    samples: totalSamples,
    blendWeight,
    choices: merged,
  };
}

// 给测试用
export const _internals = {
  scoreAggressiveness,
  generateDistribution,
  archetypeOf,
};
