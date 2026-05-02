// api/portrait.js — AI 战后画像（DeepSeek 代理 + 模板兜底）
//
// 设计原则：
//   1. 服务端代理：DeepSeek API key 永远不暴露给前端
//   2. 优雅降级：无 key / API 失败时，自动走模板兜底，玩家依然能看到一段画像
//   3. 缓存：同一战绩 5 分钟内重复请求直接返回（避免重试时重复扣费）
//   4. 限流：单次调用上限 600 token 输出，约 ¥0.0012/次

import crypto from 'crypto';

// ─────────────────────────────────────────────
// 1. 配置
// ─────────────────────────────────────────────

const DEEPSEEK_URL = process.env.DEEPSEEK_URL || 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

const ROLE_NAMES_ZH = {
  cfo: '城投财务总监',
  im: '债券基金经理',
  gov: '地方政府官员',
};

const REGION_LABELS = {
  east_core: '东部核心',
  central_capital: '中部省会',
  west_prefecture: '西部地级市',
  northeast_old: '东北老工业区',
};

const HEALTH_LABELS = {
  good: '财务健康',
  medium: '财务一般',
  weak: '财务承压',
};

// ─────────────────────────────────────────────
// 2. 入参校验
// ─────────────────────────────────────────────

export function validatePortraitPayload(p) {
  if (!p || typeof p !== 'object') return fail('payload required');
  if (!ROLE_NAMES_ZH[p.role]) return fail('invalid role');
  if (typeof p.platformName !== 'string' || p.platformName.length > 60) return fail('platformName invalid');
  if (typeof p.directorName !== 'string' || p.directorName.length > 30) return fail('directorName invalid');
  if (!REGION_LABELS[p.regionTier]) return fail('invalid regionTier');
  if (!HEALTH_LABELS[p.healthLevel]) return fail('invalid healthLevel');
  if (typeof p.survived !== 'boolean') return fail('survived must be boolean');
  if (!Number.isInteger(p.quartersPassed) || p.quartersPassed < 1 || p.quartersPassed > 12) {
    return fail('quartersPassed must be 1-12');
  }
  if (!p.score || typeof p.score !== 'object') return fail('score object required');
  if (typeof p.score.total !== 'number') return fail('score.total required');
  if (typeof p.score.grade !== 'string') return fail('score.grade required');
  if (!Array.isArray(p.decisions)) return fail('decisions must be array');
  if (p.decisions.length > 30) return fail('too many decisions (max 30)');
  return { valid: true };
}

function fail(error) { return { valid: false, error }; }

// ─────────────────────────────────────────────
// 3. Prompt 构建
// ─────────────────────────────────────────────

function buildSystemPrompt(roleNameZh) {
  return `你是中国债券市场的资深观察者，写过多年市场评论。你正在点评一位玩家在《债市生存游戏》里扮演${roleNameZh}的本局表现。

读者构成：
- 主体是 DCM、资管、银行机构的真实从业者，你说话不必避讳行业黑话
- 也包括对债市好奇的公众号读者，但不要为他们刻意降智或解释术语

写作风格（硬性约束）：
- 客观、克制、略带辛辣，像同行之间的私下点评
- 用具体的回合数、决策、数字说话，不堆砌形容词
- 严禁出现："值得肯定" "需要警惕" "综合来看" "总而言之" "在未来" 之类的公文话
- 严禁使用 emoji 和排比句
- 严禁出现"作为 AI" "本人" "笔者"等自我指代

输出结构（必须遵守，但不要写"第一段""段落 1"这类显式标号）：
- 第一段（约 130 字）：本局做对的一两件事，必须引用至少一个具体回合的具体决策
- 第二段（约 120 字）：关键失误或潜在风险，必须引用至少一个具体数字（指标、得分、季度都可以）
- 第三段（约 100 字）：这种风格如果换到真实业务场景，长期会是什么类型的从业者，给一个具体类比

总长度 320–400 字。直接输出三段正文，段落之间空一行。`;
}

function buildUserPrompt(p) {
  const lines = [];
  lines.push('==== 本局战绩 ====');
  lines.push('');
  lines.push(`角色：${ROLE_NAMES_ZH[p.role]}`);
  lines.push(`所属：${p.platformName}（${REGION_LABELS[p.regionTier]} · ${HEALTH_LABELS[p.healthLevel]}）`);
  lines.push(`本人：${p.directorName}`);
  lines.push('');
  lines.push('终局结果：');
  if (p.survived) {
    lines.push(`- 通关：12 季全程存活`);
  } else {
    lines.push(`- 出局：第 ${p.quartersPassed} 季 · 死因「${p.deathReason || '未知'}」`);
  }
  lines.push(`- 综合得分：${p.score.total}/100，${p.score.grade} 级（${p.score.gradeLabel || ''}）`);
  lines.push('');

  if (p.score.dimensions && Object.keys(p.score.dimensions).length) {
    lines.push('六维评分（满分 100）：');
    for (const [k, v] of Object.entries(p.score.dimensions)) {
      lines.push(`- ${k}：${Math.round(v)}`);
    }
    lines.push('');
  }

  if (p.metrics) {
    const start = p.metrics.start || {};
    const end = p.metrics.end || {};
    lines.push('终局核心指标 vs 起始：');
    for (const k of Object.keys(end)) {
      const startVal = start[k];
      const endVal = end[k];
      if (typeof endVal !== 'number') continue;
      const startStr = typeof startVal === 'number' ? startVal.toFixed(1) : '—';
      const arrow = (typeof startVal === 'number' && Math.abs(endVal - startVal) > 0.05)
        ? (endVal > startVal ? '↑' : '↓') : '·';
      lines.push(`- ${labelMetric(k)}：${startStr} ${arrow} ${endVal.toFixed(1)}`);
    }
    lines.push('');
  }

  if (p.decisions.length) {
    lines.push(`关键决策记录（按时间顺序，共 ${p.decisions.length} 条）：`);
    p.decisions.slice(0, 8).forEach((d, i) => {
      const outcome = d.outcome ? `（${d.outcome}）` : '';
      lines.push(`${i + 1}. Q${d.quarter}「${d.eventTitle}」→ 选择「${d.choiceLabel}」${outcome}`);
    });
    lines.push('');
  }

  if (Array.isArray(p.policyTrace) && p.policyTrace.length) {
    lines.push(`政策环境轨迹（-3 紧 ... +3 松）：${p.policyTrace.join(', ')}`);
    lines.push('');
  }

  lines.push('==== 请直接输出三段战后画像 ====');
  return lines.join('\n');
}

const METRIC_LABELS = {
  cash: '现金（亿）',
  leverageRatio: '资产负债率（%）',
  creditUsage: '授信使用率（%）',
  financingCost: '综合融资成本（%）',
  debtRatio: '综合债务率（%）',
  hiddenDebtRisk: '隐债敞口（亿）',
  politicalScore: '政绩评分',
  nav: '净值',
  redemptionPressure: '赎回压力',
  duration: '组合久期',
  creditExposure: 'AA 及以下占比（%）',
  concentration: '持仓集中度（%）',
  leverage: '基金杠杆率（%）',
  cashRatio: '现金比例（%）',
};
function labelMetric(k) { return METRIC_LABELS[k] || k; }

// ─────────────────────────────────────────────
// 4. DeepSeek 调用
// ─────────────────────────────────────────────

async function callDeepSeek(messages, { signal } = {}) {
  if (!DEEPSEEK_KEY) throw new Error('DEEPSEEK_API_KEY not configured');

  const resp = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DEEPSEEK_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages,
      temperature: 0.85,
      top_p: 0.9,
      max_tokens: 600,
      stream: false,
    }),
    signal,
  });

  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`DeepSeek HTTP ${resp.status}: ${txt.slice(0, 200)}`);
  }

  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('DeepSeek empty response');

  const usage = data?.usage || {};
  return {
    text: content,
    usage: {
      inputTokens: usage.prompt_tokens || 0,
      outputTokens: usage.completion_tokens || 0,
      // DeepSeek-chat 价格：缓存命中 ¥0.5/M、未命中 ¥2/M 输入；输出 ¥8/M
      // 这里按未命中的保守上限估算
      costCNY: ((usage.prompt_tokens || 0) * 2 + (usage.completion_tokens || 0) * 8) / 1_000_000,
    },
  };
}

// ─────────────────────────────────────────────
// 5. 模板兜底
//    （在 DeepSeek 不可用时也能给玩家一段像样的画像）
// ─────────────────────────────────────────────

function buildFallbackPortrait(p) {
  const role = ROLE_NAMES_ZH[p.role];
  const grade = p.score.grade;
  const survived = p.survived;
  const dim = p.score.dimensions || {};
  const dimEntries = Object.entries(dim).sort((a, b) => b[1] - a[1]);
  const topDim = dimEntries[0];
  const lowDim = dimEntries[dimEntries.length - 1];
  const decisions = p.decisions || [];
  const firstDecision = decisions[0];
  const lastDecision = decisions[decisions.length - 1];

  // ── 段落 1：做对了什么 ──
  const p1Parts = [];
  if (survived && (grade === 'S' || grade === 'A')) {
    p1Parts.push(`你这局打得不慌。`);
    if (firstDecision) {
      p1Parts.push(`从 Q${firstDecision.quarter}「${firstDecision.eventTitle}」开始，你选了「${firstDecision.choiceLabel}」——这一步把节奏拉住了。`);
    }
    if (topDim) {
      p1Parts.push(`六个维度里${topDim[0]}给到 ${Math.round(topDim[1])} 分，是你这局真正的护城河，整局没有把它跌穿过。`);
    } else {
      p1Parts.push(`12 季走完，主要指标始终在合理区间，没有被某一次冲击带歪。`);
    }
  } else if (survived) {
    p1Parts.push(`你这局熬下来了，但是肉眼可见地紧。`);
    if (firstDecision) {
      p1Parts.push(`Q${firstDecision.quarter}「${firstDecision.eventTitle}」选「${firstDecision.choiceLabel}」是个不算激进的开局，给后面留了空间。`);
    }
    if (topDim) {
      p1Parts.push(`${topDim[0]}最终拿到 ${Math.round(topDim[1])} 分，这是你为数不多守住的阵地。`);
    }
  } else {
    p1Parts.push(`这局你没走完。`);
    if (firstDecision) {
      p1Parts.push(`从 Q${firstDecision.quarter}「${firstDecision.eventTitle}」选「${firstDecision.choiceLabel}」开始，方向其实没明显错。`);
    }
    if (topDim) {
      p1Parts.push(`${topDim[0]}还有 ${Math.round(topDim[1])} 分，说明你不是不会做事，是节奏没踩对。`);
    }
  }
  const p1 = p1Parts.join('');

  // ── 段落 2：失误或风险 ──
  const p2Parts = [];
  if (!survived) {
    p2Parts.push(`真正的问题出在第 ${p.quartersPassed} 季：${p.deathReason || '某一项硬指标穿线'}。`);
    if (lowDim) {
      p2Parts.push(`回头看，${lowDim[0]}只有 ${Math.round(lowDim[1])} 分，提示你之前那几次决策的代价已经在账上累着了，只是你没及时止损。`);
    }
  } else if (lowDim && lowDim[1] < 60) {
    p2Parts.push(`但代价也写在六维评分上：${lowDim[0]}只有 ${Math.round(lowDim[1])} 分。`);
    if (lastDecision) {
      p2Parts.push(`尤其 Q${lastDecision.quarter}「${lastDecision.eventTitle}」那一步选了「${lastDecision.choiceLabel}」，短期度过去了，长期是要还的。`);
    }
    p2Parts.push(`真实业务里这种结构，再来一次外部冲击大概率扛不住。`);
  } else if (lowDim) {
    p2Parts.push(`要挑刺只能挑 ${lowDim[0]}（${Math.round(lowDim[1])} 分）——你为了平衡其他维度，在这上面付出了代价，但还在可接受区间。`);
  } else {
    p2Parts.push(`如果一定要挑问题，是综合分${p.score.total}还差 ${100 - p.score.total} 分到满分，留给你的优化空间已经不多。`);
  }
  const p2 = p2Parts.join('');

  // ── 段落 3：长期画像 ──
  const archetype = pickArchetype(p);
  const p3 = ARCHETYPES[archetype];

  return [p1, p2, p3].join('\n\n');
}

function pickArchetype(p) {
  const grade = p.score.grade;
  const survived = p.survived;
  const dim = p.score.dimensions || {};
  const compliance = (dim['合规指数'] || dim['合规'] || dim['合规度'] || 50);
  const liquidity = (dim['流动性管理'] || dim['流动性'] || 50);
  const crisis = (dim['危机应对'] || 50);

  if (!survived) return 'casualty';
  if (grade === 'S') return 'master';
  if (grade === 'A' && compliance < 60) return 'aggressive_winner';
  if (grade === 'A') return 'steady_winner';
  if (grade === 'B' && crisis > 70) return 'firefighter';
  if (grade === 'B') return 'plodder';
  return 'survivor';
}

const ARCHETYPES = {
  master: '换到真实岗位上，你大概率是那种能在年会上被董事长直接点名的角色——业务条线认可你，监管也找不到你的茬。这种位置稀缺，能稳定坐住的，往往是把所有"看起来不重要"的小事都当回事的人。',
  steady_winner: '换到真实岗位上，你是那种风评里"他做事我们放心"的中层骨干——每年没有特别耀眼的业绩，但每次行业暴雷你都不在名单里。年轻同事会觉得你保守，但行长信你。',
  aggressive_winner: '换到真实岗位上，你是那种业绩榜年年靠前、合规会议年年被点名的人——能为公司挣到大钱，但带新人的时候手把手要教三遍"这个动作不能学"。再下行一个周期，你就要面临是接受规训还是另起炉灶的选择。',
  firefighter: '换到真实岗位上，你是项目组里那个"出事先想到他"的人——不是职位最高，但每次危机会议都不能少。你享受这种被需要感，但长期看，这种角色在升迁通道上往往没有走纯业绩路线的同事走得快。',
  plodder: '换到真实岗位上，你是个稳定的螺丝钉——干活靠谱，但很难拿到大项目主导权。优势是抗周期能力强，劣势是每次行业风口你都只能眼睁睁看着别人吃肉。慢慢熬，能熬到副总那一档，再上去就要换一种打法。',
  survivor: '换到真实岗位上，你属于"活下来就是胜利"那种打工人——领导不会特别记住你，但裁员名单上也轮不到你。这种位置不够耀眼，但在债市这种行业，能干满 10 年的人里，70% 都是你这种风格。',
  casualty: '换到真实岗位上，你这一局像是一个真实存在过的从业者——他可能很努力、决策也不算荒唐，但赶上了某个不可抗的拐点。这个市场每隔几年就要洗一批这样的人，幸存者并不一定比他们更聪明，只是更幸运。',
};

// ─────────────────────────────────────────────
// 6. 缓存（内存版）
// ─────────────────────────────────────────────

const CACHE = new Map();  // hash -> { portrait, source, ts }
const CACHE_TTL = 5 * 60 * 1000;

function payloadHash(p) {
  // 用核心字段算 hash，避免 nickname 等无关字段影响命中
  const key = JSON.stringify({
    role: p.role,
    platform: p.platformName,
    director: p.directorName,
    survived: p.survived,
    quarters: p.quartersPassed,
    score: p.score.total,
    grade: p.score.grade,
    decisions: (p.decisions || []).map(d => `${d.quarter}:${d.eventTitle}:${d.choiceLabel}`).join('|'),
  });
  return crypto.createHash('sha1').update(key).digest('hex').slice(0, 16);
}

function getCached(hash) {
  const c = CACHE.get(hash);
  if (!c) return null;
  if (Date.now() - c.ts > CACHE_TTL) {
    CACHE.delete(hash);
    return null;
  }
  return c;
}

function setCached(hash, value) {
  CACHE.set(hash, { ...value, ts: Date.now() });
  // 简单 LRU：超过 200 条时清最旧
  if (CACHE.size > 200) {
    const oldest = [...CACHE.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
    if (oldest) CACHE.delete(oldest[0]);
  }
}

// ─────────────────────────────────────────────
// 7. 主入口
// ─────────────────────────────────────────────

export async function generatePortrait(payload, options = {}) {
  const { force = false, timeoutMs = 25_000 } = options;
  const hash = payloadHash(payload);

  if (!force) {
    const cached = getCached(hash);
    if (cached) {
      return { ...cached, cached: true };
    }
  }

  const roleNameZh = ROLE_NAMES_ZH[payload.role];
  const messages = [
    { role: 'system', content: buildSystemPrompt(roleNameZh) },
    { role: 'user', content: buildUserPrompt(payload) },
  ];

  // DeepSeek 没配 key 直接走 fallback
  if (!DEEPSEEK_KEY) {
    const portrait = buildFallbackPortrait(payload);
    const result = { portrait, source: 'fallback', reason: 'no_api_key' };
    setCached(hash, result);
    return result;
  }

  // 调 DeepSeek，带超时
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const { text, usage } = await callDeepSeek(messages, { signal: ctrl.signal });
    clearTimeout(timer);
    const result = {
      portrait: text,
      source: 'deepseek',
      usage,
    };
    setCached(hash, result);
    return result;
  } catch (err) {
    clearTimeout(timer);
    console.warn('[portrait] DeepSeek failed, fallback:', err.message);
    const portrait = buildFallbackPortrait(payload);
    const result = {
      portrait,
      source: 'fallback',
      reason: err.message?.includes('abort') ? 'timeout' : 'api_error',
      errorDetail: err.message?.slice(0, 200),
    };
    setCached(hash, result);
    return result;
  }
}

// 测试用：暴露内部函数
export const _internals = {
  buildSystemPrompt,
  buildUserPrompt,
  buildFallbackPortrait,
  pickArchetype,
  payloadHash,
};
