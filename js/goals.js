// js/goals.js — 本局目标池
//
// 设计：
//   - 简报右上角「本局目标」原本是 buildGoal() 硬编码每角色一句。
//     玩家反馈"开局感觉就那几样"——目标永远不变是元凶之一。
//   - 这里按 role × scriptId 各准备 3 个变体，开局抽 1 个写到 state.goalId 持久化。
//   - 目标只是 BRIEFING 文案的"叙事锚"，不改变 engine 死亡判定（死亡仍由 role.deathConditions 控）。
//   - 36 个变体分布：3 角色 × 4 剧本 × 3 变体。
//   - 每个变体形态对齐 buildGoal 旧返回值：{ text, q, suffix }，外层加 id 用于持久化。

export const GOAL_POOLS = {
  // ─── CFO ─────────────────────────────────────
  cfo: {
    // 盛极而衰：扩张→紧缩→危机
    rise_and_fall: [
      { id: 'cfo_rise_survive', text: '存活', q: 12, suffix: '季度，期末现金不归零' },
      { id: 'cfo_rise_safety',  text: '安全垫', q: 3, suffix: '亿，期末现金保持在 3 亿之上' },
      { id: 'cfo_rise_lever',   text: '压', q: 5, suffix: 'pp 杠杆，Q12 资产负债率比开局低 5 个百分点' },
    ],
    // V 型反转：紧缩→大转向→分化
    v_shape: [
      { id: 'cfo_v_survive', text: '存活', q: 12, suffix: '季度，期末现金不归零' },
      { id: 'cfo_v_cost',    text: '降本', q: 100, suffix: 'bps，Q12 综合融资成本较开局下行 100 个基点' },
      { id: 'cfo_v_window',  text: '抓窗口', q: 2, suffix: '次低成本融资，Q5-Q8 反弹期内完成' },
    ],
    // 温水煮青蛙：平稳→暗流→突崩
    slow_boil: [
      { id: 'cfo_slow_survive', text: '存活', q: 12, suffix: '季度，期末现金不归零' },
      { id: 'cfo_slow_ammo',    text: 'Q9 储备', q: 3, suffix: '亿现金，崩盘期来临前要有子弹' },
      { id: 'cfo_slow_credit',  text: '压敞口', q: 30, suffix: '%，Q12 非标 + 信托敞口较开局降近三成' },
    ],
    // 绝处逢生：危机开局→政策托举→分化
    redemption: [
      { id: 'cfo_redm_survive', text: '存活', q: 12, suffix: '季度，期末现金不归零' },
      { id: 'cfo_redm_rating',  text: '守评级', q: 6.5, suffix: '%上限，Q12 综合融资成本不破 6.5%' },
      { id: 'cfo_redm_revive',  text: '翻盘', q: 1.5, suffix: '倍现金，Q12 现金恢复至 Q4 低点的 1.5 倍' },
    ],
  },
  // ─── IM ──────────────────────────────────────
  im: {
    rise_and_fall: [
      { id: 'im_rise_survive', text: '守住', q: 0.85, suffix: '净值，12 季度不破清盘线' },
      { id: 'im_rise_alpha',   text: '跑赢', q: 1.05, suffix: '净值，Q12 净值 ≥ 1.05' },
      { id: 'im_rise_lever',   text: '控杠杆', q: 110, suffix: '%上限，Q12 杠杆率不破 110%' },
    ],
    v_shape: [
      { id: 'im_v_survive', text: '守住', q: 0.85, suffix: '净值，12 季度不破清盘线' },
      { id: 'im_v_dur',     text: '拉久期', q: 4, suffix: '年，Q5-Q8 至少一季 duration ≥ 4 抓住反弹' },
      { id: 'im_v_yield',   text: '收益', q: 1.10, suffix: '净值，Q12 净值 ≥ 1.10' },
    ],
    slow_boil: [
      { id: 'im_slow_survive', text: '守住', q: 0.85, suffix: '净值，12 季度不破清盘线' },
      { id: 'im_slow_credit',  text: '压信用', q: 20, suffix: '%敞口，Q9 前 AA 及以下占比降到 20%' },
      { id: 'im_slow_cash',    text: '现金', q: 15, suffix: '%以上，Q9 cashRatio ≥ 15% 应对崩盘' },
    ],
    redemption: [
      { id: 'im_redm_survive', text: '守住', q: 0.85, suffix: '净值，12 季度不破清盘线' },
      { id: 'im_redm_open',    text: '撑开局', q: 0.92, suffix: '净值，Q4 不破 0.92 才能等到反弹' },
      { id: 'im_redm_yield',   text: '翻盘', q: 1.05, suffix: '净值，Q12 净值 ≥ 1.05' },
    ],
  },
  // ─── GOV ─────────────────────────────────────
  gov: {
    rise_and_fall: [
      { id: 'gov_rise_debt',   text: '压', q: 30, suffix: 'pp 债务率，Q12 较开局低 30 个百分点' },
      { id: 'gov_rise_pol',    text: '守', q: 70, suffix: '政绩分，Q12 政绩评分 ≥ 70' },
      { id: 'gov_rise_hidden', text: '化债', q: 100, suffix: '亿以下，Q12 隐债敞口压到 100 亿之内' },
    ],
    v_shape: [
      { id: 'gov_v_debt',     text: '压', q: 25, suffix: 'pp 债务率，Q12 较开局低 25 个百分点' },
      { id: 'gov_v_window',   text: '抓窗口', q: 2, suffix: '次特殊再融资，Q5-Q8 政策松时完成申报' },
      { id: 'gov_v_industry', text: '升产业', q: 65, suffix: '指数，Q12 产业发展指数 ≥ 65' },
    ],
    slow_boil: [
      { id: 'gov_slow_debt',   text: '压', q: 20, suffix: 'pp 债务率，Q12 较开局低 20 个百分点' },
      { id: 'gov_slow_hidden', text: '防风险', q: 100, suffix: '亿以下，Q8 隐债敞口压到 100 亿之内' },
      { id: 'gov_slow_pol',    text: '政绩', q: 60, suffix: '以上，Q12 政绩评分 ≥ 60' },
    ],
    redemption: [
      { id: 'gov_redm_open',   text: '撑开局', q: 250, suffix: '亿以下，Q4 隐债敞口不超 250 亿' },
      { id: 'gov_redm_pilot',  text: '进试点', q: 1, suffix: '次专项债置换，Q5-Q8 完成至少一次' },
      { id: 'gov_redm_revive', text: '翻盘', q: 30, suffix: 'pp 债务率，Q12 较 Q4 高点压降 30 个百分点' },
    ],
  },
};

// 兜底：scriptId 未知 / 老存档 / 新角色没配 → 退回基础"存活"目标
const FALLBACK_GOAL = {
  cfo: { id: 'cfo_fallback', text: '存活', q: 12,   suffix: '季度，期末现金不归零' },
  im:  { id: 'im_fallback',  text: '守住', q: 0.85, suffix: '净值，12 季度不破清盘线' },
  gov: { id: 'gov_fallback', text: '压降', q: 50,   suffix: '个百分点债务率，并完成化债任务' },
};

// 扁平索引：goalId → goal 对象，给 ui.js 通过 state.goalId 反查
const _GOAL_INDEX = {};
(function buildIndex() {
  Object.values(GOAL_POOLS).forEach(roleMap => {
    Object.values(roleMap).forEach(arr => {
      arr.forEach(g => { _GOAL_INDEX[g.id] = g; });
    });
  });
  Object.values(FALLBACK_GOAL).forEach(g => { _GOAL_INDEX[g.id] = g; });
})();

/**
 * 抽取本局目标。在 createInitialState 调用一次，结果 id 写到 state.goalId。
 * @param {string} roleId   - 'cfo' | 'im' | 'gov'
 * @param {string} scriptId - 'rise_and_fall' | 'v_shape' | 'slow_boil' | 'redemption'
 * @returns {{id, text, q, suffix}}
 */
export function pickGoalForGame(roleId, scriptId) {
  const roleMap = GOAL_POOLS[roleId];
  if (!roleMap) return FALLBACK_GOAL[roleId] || FALLBACK_GOAL.cfo;
  const arr = roleMap[scriptId];
  if (!arr || !arr.length) return FALLBACK_GOAL[roleId] || FALLBACK_GOAL.cfo;
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * 通过持久化的 goalId 反查目标对象。老存档没有 goalId 时返回 null。
 */
export function getGoalById(goalId) {
  if (!goalId) return null;
  return _GOAL_INDEX[goalId] || null;
}
