// api/coaching.js — AI 辅助两个功能：爆款标题 + 决策助手
//
// 共用：DeepSeek 代理 + 缓存 + 模板兜底
// 与 portrait.js 隔离独立模块，但调用方式一致

import crypto from 'crypto';

const DEEPSEEK_URL = process.env.DEEPSEEK_URL || 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

const ROLE_NAMES_ZH = {
  cfo: '城投财务总监',
  im: '债券基金经理',
  gov: '地方政府官员',
};

// ─────────────────────────────────────────────
// 1. 入参校验
// ─────────────────────────────────────────────

export function validateHeadlinePayload(p) {
  if (!p || typeof p !== 'object') return fail('payload required');
  if (!ROLE_NAMES_ZH[p.role]) return fail('invalid role');
  if (typeof p.platformName !== 'string' || p.platformName.length > 60) return fail('platformName invalid');
  if (typeof p.directorName !== 'string' || p.directorName.length > 30) return fail('directorName invalid');
  if (typeof p.survived !== 'boolean') return fail('survived required');
  if (!Number.isInteger(p.quartersPassed) || p.quartersPassed < 1 || p.quartersPassed > 12) {
    return fail('quartersPassed must be 1-12');
  }
  if (!p.score || typeof p.score !== 'object' || typeof p.score.total !== 'number') {
    return fail('score.total required');
  }
  if (!Array.isArray(p.decisions)) return fail('decisions must be array');
  if (p.decisions.length > 30) return fail('too many decisions');
  return { valid: true };
}

export function validateCoachPayload(p) {
  if (!p || typeof p !== 'object') return fail('payload required');
  if (!ROLE_NAMES_ZH[p.role]) return fail('invalid role');
  if (!p.event || typeof p.event !== 'object') return fail('event required');
  if (typeof p.event.title !== 'string' || p.event.title.length > 200) return fail('event.title invalid');
  if (typeof p.event.body !== 'string' || p.event.body.length > 800) return fail('event.body invalid');
  if (!Array.isArray(p.event.choices) || p.event.choices.length === 0 || p.event.choices.length > 6) {
    return fail('event.choices must have 1-6 items');
  }
  if (!p.metrics || typeof p.metrics !== 'object') return fail('metrics required');
  if (!Number.isInteger(p.quartersPassed) || p.quartersPassed < 0 || p.quartersPassed > 11) {
    return fail('quartersPassed must be 0-11');
  }
  return { valid: true };
}

function fail(error) { return { valid: false, error }; }

// ─────────────────────────────────────────────
// 2. Prompt：爆款标题
// ─────────────────────────────────────────────

function buildHeadlineSystemPrompt(roleNameZh) {
  return `你正在为一位玩家撰写《债市生存游戏》本局战绩的朋友圈分享文。这位玩家扮演的是${roleNameZh}。

读者画像：投行 / 资管 / 银行从业者占主体，也有对债市好奇的公众号普通读者。

风格要求（硬性）：
- 自媒体爆款体，但**不浮夸**
- 标题用"一个 X 岁的 Y 在 Z 年的故事" 或 "我在 N 局后才学会的事" 这种第一人称叙事感
- 正文 100~130 字，像玩家本人发的朋友圈
- 必须引用至少一个具体回合（如 Q5、Q9）+ 一个具体数字
- 写得像人话，不要像 AI

严禁：
- emoji
- "在某种程度上""综合来看""值得肯定""接下来让我们看看"
- "惊心动魄""波澜壮阔""跌宕起伏" 这种修辞
- "作为一名…""我作为…"自我标签

输出格式（严格 JSON，不要任何 markdown 围栏）：
{ "headline": "10-22 字的标题", "body": "100-130 字的正文" }`;
}

function buildHeadlineUserPrompt(p) {
  const lines = [];
  lines.push('==== 本局战绩 ====');
  lines.push(`角色：${ROLE_NAMES_ZH[p.role]}`);
  lines.push(`所属：${p.platformName}`);
  lines.push(`本人：${p.directorName}`);
  lines.push('');
  lines.push(`通关结果：${p.survived ? '12 季全程' : `第 ${p.quartersPassed} 季出局，死因「${p.deathReason || '未知'}」`}`);
  lines.push(`综合得分：${p.score.total}/100，${p.score.grade} 级`);
  if (p.scriptName) lines.push(`本局剧本：${p.scriptName}`);
  lines.push('');
  if (p.decisions.length > 0) {
    lines.push(`关键决策（按时间）：`);
    p.decisions.slice(0, 6).forEach((d, i) => {
      const outcome = d.outcome ? `（${d.outcome}）` : '';
      lines.push(`${i + 1}. Q${d.quarter}「${d.eventTitle}」→ 「${d.choiceLabel}」${outcome}`);
    });
  }
  lines.push('');
  lines.push('请输出爆款标题与朋友圈正文（严格 JSON）：');
  return lines.join('\n');
}

// ─────────────────────────────────────────────
// 3. Prompt：决策助手
// ─────────────────────────────────────────────

function buildCoachSystemPrompt(roleNameZh) {
  return `你是一位资深债市从业者，被一位玩家「求助」——他正在《债市生存游戏》里面对一个决策，想听听你的看法。他扮演${roleNameZh}。

你的任务：给出**中立分析**，帮他理清考量维度。

**绝对不能直接告诉他选哪个**——这是游戏，他自己决定。

输出要求：
- 80-130 字
- 引用具体数字（他当前指标、距离死亡线多少等）
- 用一句话点出每个选项的核心权衡（成本 vs 收益 vs 风险）
- 提示"你需要权衡的关键变量是 X"
- 像同事在白板边讲思路，不像老师讲课

严禁：
- "我建议选 A""最优选项是""答案是"
- emoji
- "综合来看""总而言之""作为一名"
- 客气话（"很高兴你来咨询"等）

直接给出分析，不要任何前缀或后缀。`;
}

function buildCoachUserPrompt(p) {
  const lines = [];
  lines.push(`==== 当前局面 ====`);
  lines.push(`角色：${ROLE_NAMES_ZH[p.role]}`);
  lines.push(`回合：第 ${(p.quartersPassed || 0) + 1} / 12`);
  if (p.scriptName) lines.push(`剧本：${p.scriptName}（${p.actLabel || ''}）`);
  if (typeof p.policyValue === 'number') {
    const lbl = p.policyValue <= -2 ? '严格' : p.policyValue <= -1 ? '偏紧' : p.policyValue >= 2 ? '宽松' : p.policyValue >= 1 ? '偏松' : '中性';
    lines.push(`政策环境：${lbl}（${p.policyValue >= 0 ? '+' : ''}${p.policyValue}）`);
  }
  lines.push('');
  lines.push('当前关键指标：');
  for (const [k, v] of Object.entries(p.metrics || {})) {
    if (typeof v === 'number') lines.push(`- ${labelMetric(k)}：${v.toFixed ? v.toFixed(2) : v}`);
  }
  lines.push('');
  lines.push(`遇到的事件：「${p.event.title}」`);
  lines.push(p.event.body);
  lines.push('');
  lines.push('三个选项及预期影响：');
  p.event.choices.forEach((c, i) => {
    const fxStr = stringifyEffects(c.effects || {});
    lines.push(`${String.fromCharCode(65 + i)}. ${c.label} → ${fxStr}`);
  });
  lines.push('');
  lines.push('请给出 80-130 字的中立分析：');
  return lines.join('\n');
}

const METRIC_LABELS = {
  cash: '现金（亿）',
  leverageRatio: '资产负债率（%）',
  creditUsage: '授信使用率（%）',
  financingCost: '融资成本（%）',
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

function stringifyEffects(fx) {
  const parts = [];
  for (const [k, v] of Object.entries(fx)) {
    if (k.startsWith('_')) {
      if (k === '_uncertainty') parts.push(`不确定(${Math.round(v * 100)}%)`);
      else if (k === '_delay') parts.push(`延期${v}季`);
      continue;
    }
    if (typeof v !== 'number') continue;
    const sign = v > 0 ? '+' : '';
    if (k.startsWith('score.')) parts.push(`${k.slice(6)} ${sign}${v}`);
    else parts.push(`${labelMetric(k)} ${sign}${v}`);
  }
  return parts.length ? parts.slice(0, 4).join('，') : '影响待定';
}

// ─────────────────────────────────────────────
// 4. DeepSeek 调用（共用）
// ─────────────────────────────────────────────

async function callDeepSeek(messages, { signal, jsonMode = false, maxTokens = 500, temperature = 0.85 } = {}) {
  if (!DEEPSEEK_KEY) throw new Error('DEEPSEEK_API_KEY not configured');
  const body = {
    model: DEEPSEEK_MODEL,
    messages,
    temperature,
    top_p: 0.9,
    max_tokens: maxTokens,
    stream: false,
  };
  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }
  const resp = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DEEPSEEK_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`DeepSeek HTTP ${resp.status}: ${txt.slice(0, 200)}`);
  }
  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('DeepSeek empty response');
  return {
    text: content,
    usage: data?.usage || {},
  };
}

// ─────────────────────────────────────────────
// 5. 模板兜底：爆款标题
// ─────────────────────────────────────────────

const HEADLINE_TEMPLATES = {
  // [survived, gradeBucket] => function(p) => {headline, body}
  surv_S: (p) => ({
    headline: `${p.survived ? '一个' : '半个'}「${ROLE_NAMES_ZH[p.role].slice(0,4)}」的${currentYear()}：S 级通关，少有的稳`,
    body: `抽到「${p.scriptName || '未知剧本'}」剧本。开局起势就稳，关键 Q${pickKeyQ(p)} 那一步选了「${pickKeyChoice(p)}」让节奏没断过。最终 ${p.score.total} 分，比 95% 玩家强。这一局像走钢丝，赢得不轻松。`,
  }),
  surv_A: (p) => ({
    headline: `「${ROLE_NAMES_ZH[p.role]}」的 12 季：从${randPlatformPrefix()}走到 A 级`,
    body: `平台 ${p.platformName.slice(0, 12)} 这一局走的是「${p.scriptName || '未知'}」。Q${pickKeyQ(p)}「${pickKeyEvent(p)}」让我捏了把汗，选了「${pickKeyChoice(p)}」过了那一关。终局 ${p.score.total} 分，A 级。下次想拿 S，得在前几季更激进一点。`,
  }),
  surv_B: (p) => ({
    headline: `${ROLE_NAMES_ZH[p.role]}：B 级通关，活下来就是赢`,
    body: `这一局抽到「${p.scriptName || '未知'}」，开局就不太顺。Q${pickKeyQ(p)} 是关键拐点，选了「${pickKeyChoice(p)}」赌对了一半。终局 ${p.score.total} 分，B 级。能熬到 12 季已经是胜利，至少没出事。`,
  }),
  surv_C: (p) => ({
    headline: `${ROLE_NAMES_ZH[p.role]} 的 12 季：勉强过线`,
    body: `这局压力很大。「${p.scriptName || '未知'}」剧本下，Q${pickKeyQ(p)} 那一关差点没扛住，但还是熬到了终局，${p.score.total} 分。下次得换打法。`,
  }),
  fail_high: (p) => ({
    headline: `第 ${p.quartersPassed} 季出局：一个${ROLE_NAMES_ZH[p.role]}的失败回忆`,
    body: `没活下来。剧本是「${p.scriptName || '未知'}」，Q${p.quartersPassed} 那一关「${p.deathReason || '某项硬指标'}」直接送走了。终局 ${p.score.total} 分。回头看，Q${pickKeyQ(p)} 选「${pickKeyChoice(p)}」之后路就窄了。`,
  }),
  fail_low: (p) => ({
    headline: `${p.quartersPassed} 季就翻车：${ROLE_NAMES_ZH[p.role]}的速败局`,
    body: `开局没多久就出局了。「${p.scriptName || '未知'}」剧本下，前几步走得太激进。Q${p.quartersPassed} 死在「${p.deathReason || '硬指标'}」上。${p.score.total} 分。这游戏的城投生态不简单。`,
  }),
};

function currentYear() {
  return new Date().getFullYear();
}
function randPlatformPrefix() {
  const arr = ['8 亿现金', '紧绷开局', '中部省会', '化债压力', '低评级开局', '隐债重灾区'];
  return arr[Math.floor(Math.random() * arr.length)];
}
function pickKeyQ(p) {
  const q = p.decisions?.[Math.floor(p.decisions.length * 0.6)]?.quarter ?? Math.ceil(p.quartersPassed / 2);
  return q || 5;
}
function pickKeyChoice(p) {
  const d = p.decisions?.[Math.floor(p.decisions.length * 0.5)]?.choiceLabel || '其中一个';
  return d.length > 14 ? d.slice(0, 14) + '…' : d;
}
function pickKeyEvent(p) {
  const t = p.decisions?.[Math.floor(p.decisions.length * 0.5)]?.eventTitle || '某个关键事件';
  return t.length > 12 ? t.slice(0, 12) + '…' : t;
}

function buildFallbackHeadline(p) {
  const grade = p.score.grade;
  let key;
  if (p.survived) {
    key = grade === 'S' ? 'surv_S' : grade === 'A' ? 'surv_A' : grade === 'B' ? 'surv_B' : 'surv_C';
  } else {
    key = p.score.total >= 40 ? 'fail_high' : 'fail_low';
  }
  return HEADLINE_TEMPLATES[key](p);
}

// ─────────────────────────────────────────────
// 6. 模板兜底：决策助手
// ─────────────────────────────────────────────

function buildFallbackCoachAdvice(p) {
  const m = p.metrics || {};
  const role = p.role;
  const choices = p.event.choices || [];

  const parts = [];
  // 起手
  if (role === 'cfo' && typeof m.cash === 'number') {
    parts.push(`你现金 ${m.cash.toFixed(1)} 亿`);
    if (m.cash < 3) parts.push('，已经偏紧');
    if (typeof m.leverageRatio === 'number') parts.push(`，资产负债率 ${m.leverageRatio.toFixed(1)}%`);
  } else if (role === 'im' && typeof m.nav === 'number') {
    parts.push(`你净值 ${m.nav.toFixed(3)}`);
    if (m.nav < 0.92) parts.push('，已经接近死亡线');
  } else if (role === 'gov' && typeof m.debtRatio === 'number') {
    parts.push(`综合债务率 ${m.debtRatio.toFixed(0)}%`);
    if (m.debtRatio >= 280) parts.push('，已经临近红线');
  }
  parts.push('。');

  // 选项分析
  const tags = choices.map((c, i) => {
    const fx = c.effects || {};
    if (fx._uncertainty != null) return `${String.fromCharCode(65 + i)} 是不确定选项（${Math.round(fx._uncertainty * 100)}% 成功）`;
    if (fx._delay) return `${String.fromCharCode(65 + i)} 是延期类（成本后置）`;
    let signCount = 0, sumAbs = 0;
    for (const [k, v] of Object.entries(fx)) {
      if (k.startsWith('_') || typeof v !== 'number') continue;
      sumAbs += Math.abs(v);
      if (v > 0) signCount++;
    }
    if (sumAbs > 12) return `${String.fromCharCode(65 + i)} 影响幅度大`;
    return `${String.fromCharCode(65 + i)} 偏稳健`;
  });
  parts.push(tags.slice(0, 3).join('，'));
  parts.push('。');

  parts.push(`关键变量：你这一步要权衡是先稳节奏，还是承担一点风险博收益。`);

  return parts.join('');
}

// ─────────────────────────────────────────────
// 7. 缓存 + 主入口
// ─────────────────────────────────────────────

const HEADLINE_CACHE = new Map();
const HEADLINE_TTL = 5 * 60 * 1000;

function payloadHashHeadline(p) {
  const key = JSON.stringify({
    role: p.role,
    platform: p.platformName,
    director: p.directorName,
    survived: p.survived,
    quarters: p.quartersPassed,
    score: p.score.total,
    grade: p.score.grade,
    deci: (p.decisions || []).map(d => `${d.quarter}:${d.eventTitle}:${d.choiceLabel}`).join('|'),
  });
  return crypto.createHash('sha1').update(key).digest('hex').slice(0, 16);
}

export async function generateHeadline(payload, { force = false, timeoutMs = 25_000 } = {}) {
  const hash = payloadHashHeadline(payload);
  if (!force) {
    const c = HEADLINE_CACHE.get(hash);
    if (c && Date.now() - c.ts < HEADLINE_TTL) {
      return { ...c.value, cached: true };
    }
  }

  const messages = [
    { role: 'system', content: buildHeadlineSystemPrompt(ROLE_NAMES_ZH[payload.role]) },
    { role: 'user', content: buildHeadlineUserPrompt(payload) },
  ];

  if (!DEEPSEEK_KEY) {
    const fb = buildFallbackHeadline(payload);
    const result = { ...fb, source: 'fallback', reason: 'no_api_key' };
    HEADLINE_CACHE.set(hash, { value: result, ts: Date.now() });
    return result;
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const { text, usage } = await callDeepSeek(messages, { signal: ctrl.signal, jsonMode: true, maxTokens: 400, temperature: 0.9 });
    clearTimeout(timer);
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      // 模型偶尔不给纯 JSON，截取
      const match = text.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
      else throw new Error('parse failed');
    }
    if (!parsed.headline || !parsed.body) throw new Error('missing fields');
    const result = {
      headline: String(parsed.headline).slice(0, 50),
      body: String(parsed.body).slice(0, 200),
      source: 'deepseek',
      usage,
    };
    HEADLINE_CACHE.set(hash, { value: result, ts: Date.now() });
    return result;
  } catch (err) {
    clearTimeout(timer);
    console.warn('[coaching] headline DeepSeek failed, fallback:', err.message);
    const fb = buildFallbackHeadline(payload);
    const result = { ...fb, source: 'fallback', reason: 'api_error', errorDetail: err.message?.slice(0, 200) };
    HEADLINE_CACHE.set(hash, { value: result, ts: Date.now() });
    return result;
  }
}

export async function generateCoachAdvice(payload, { timeoutMs = 18_000 } = {}) {
  const messages = [
    { role: 'system', content: buildCoachSystemPrompt(ROLE_NAMES_ZH[payload.role]) },
    { role: 'user', content: buildCoachUserPrompt(payload) },
  ];

  if (!DEEPSEEK_KEY) {
    return { advice: buildFallbackCoachAdvice(payload), source: 'fallback', reason: 'no_api_key' };
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const { text, usage } = await callDeepSeek(messages, { signal: ctrl.signal, jsonMode: false, maxTokens: 350, temperature: 0.7 });
    clearTimeout(timer);
    return { advice: text, source: 'deepseek', usage };
  } catch (err) {
    clearTimeout(timer);
    console.warn('[coaching] coach DeepSeek failed, fallback:', err.message);
    return { advice: buildFallbackCoachAdvice(payload), source: 'fallback', reason: err.message?.includes('abort') ? 'timeout' : 'api_error' };
  }
}

// 测试用
export const _internals = {
  buildHeadlineSystemPrompt,
  buildHeadlineUserPrompt,
  buildCoachSystemPrompt,
  buildCoachUserPrompt,
  buildFallbackHeadline,
  buildFallbackCoachAdvice,
};
