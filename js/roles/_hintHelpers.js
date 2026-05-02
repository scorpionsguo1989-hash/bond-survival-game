// js/roles/_hintHelpers.js
// 共用：onboarding hints 池子的过滤 + 抽样工具
//
// 设计：
//   - 每个 role 模块定义 TIPS_POOL（推荐首操作）+ RISKS_POOL（致命风险）
//   - 每个 entry 形如：{ id, text, when?: { script, health, tag, region, business, fiscal, political, inst, scale } }
//   - when 缺省 = 通用条目；when 字段全部要 AND 命中才适用
//   - tip 抽 1（优先有 when 命中的；都不命中走无 when 兜底）
//   - risks 抽 3：1 条核心死亡（无 when 的第一条）+ 2 条情境（when 命中的随机抽）+ 不足时再用核心补齐

/**
 * 过滤判定。when 字段：
 *   - script:   string | string[] —— 匹配 scriptId
 *   - health:   string | string[] —— 匹配 origin.healthLevel
 *   - tag:      string | string[] —— 匹配 origin.tag
 *   - region:   string | string[] —— 匹配 origin.regionTier
 *   - business: string | string[] —— 匹配 origin.businessType
 *   - fiscal:   string | string[] —— 匹配 origin.fiscalStatus
 *   - political:string | string[] —— 匹配 origin.political
 *   - inst:     string | string[] —— 匹配 origin.institutionType
 *   - scale:    string | string[] —— 匹配 origin.scale
 */
export function matchesHints(when, profile, scriptId) {
  if (!when) return true;
  const inFilter = (val, field) => {
    if (val == null) return true;
    const arr = Array.isArray(val) ? val : [val];
    return arr.includes(field);
  };
  if (!inFilter(when.script,    scriptId))                return false;
  if (!inFilter(when.health,    profile?.healthLevel))    return false;
  if (!inFilter(when.tag,       profile?.tag))            return false;
  if (!inFilter(when.region,    profile?.regionTier))     return false;
  if (!inFilter(when.business,  profile?.businessType))   return false;
  if (!inFilter(when.fiscal,    profile?.fiscalStatus))   return false;
  if (!inFilter(when.political, profile?.political))      return false;
  if (!inFilter(when.inst,      profile?.institutionType))return false;
  if (!inFilter(when.scale,     profile?.scale))          return false;
  return true;
}

// Fisher-Yates 取前 n 条
function shuffleSlice(arr, n) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

/**
 * 从 TIPS_POOL 抽 1 条首操作。
 * 优先抽通过 when 过滤的；若无匹配，从无 when 的通用条目抽；都没有就 fallback。
 */
export function sampleTip(pool, profile, scriptId, fallback = '观察主线事件再决定首操作时机') {
  const matched  = pool.filter(t => t.when && matchesHints(t.when, profile, scriptId));
  const generics = pool.filter(t => !t.when);
  const candidates = matched.length ? matched : generics;
  if (!candidates.length) return fallback;
  return candidates[Math.floor(Math.random() * candidates.length)].text;
}

/**
 * 从 RISKS_POOL 抽 3 条：1 条核心死亡 + 2 条情境 + 不足时核心补齐。
 * - 核心 = 无 when 的条目（按文件中出现顺序，第一条最严重）
 * - 情境 = when 命中的条目（随机抽）
 * 返回纯文本数组，length = 3（如池子不够则少于 3）
 */
export function sampleRisks(pool, profile, scriptId, n = 3) {
  const core = pool.filter(r => !r.when);
  const ctx  = pool.filter(r => r.when && matchesHints(r.when, profile, scriptId));
  const picked = [];
  if (core.length) picked.push(core[0]);                    // 必带最严重核心
  picked.push(...shuffleSlice(ctx, Math.max(0, n - picked.length)));
  // 用其余 core 补足
  for (let i = 1; i < core.length && picked.length < n; i++) {
    picked.push(core[i]);
  }
  return picked.slice(0, n).map(r => r.text);
}
