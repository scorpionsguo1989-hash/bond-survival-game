// js/scripts.js — 多周期叙事：剧本 + 三幕
//
// 设计：
//   - 命运卡阶段抽一个剧本（4 选 1，加权均匀）
//   - 每个剧本由 3 幕组成，每幕 4 季，覆盖 12 季全程
//   - 幕影响 4 个维度：
//     * policyDrift：每季政策环境的"自然倾向"
//     * swanRate：黑天鹅触发概率
//     * swanFilter：黑天鹅事件过滤（如只挑积极/悲观的）
//     * scoreMultiplier：维度分加成（鼓励本幕的"正确动作"）
//   - 每幕首回合显示过场卡

export const SCRIPTS = [
  {
    id: 'rise_and_fall',
    name: '盛极而衰',
    icon: '☀',
    accent: '#ffd54f',
    description: '资金宽松开局，逐渐收紧，最终危机。2022-2024 的真实写照——你看着辖区从风光走到挣扎。',
    acts: [
      {
        id: 'act_expansion',
        ordinal: 'ACT I',
        label: '扩张期',
        tagline: '资金宽松，化债序幕',
        quarters: [1, 2, 3, 4],
        policyDrift: 1,
        swanRate: 0.04,
        swanFilter: { policyMin: 0 },
        scoreMultiplier: { development: 1.5, costControl: 1.2 },
        transitionLine: '资金面宽松，机会窗口打开。要扩张还是要稳健，看你怎么选。',
      },
      {
        id: 'act_tightening',
        ordinal: 'ACT II',
        label: '紧缩期',
        tagline: '窗口指导收紧',
        quarters: [5, 6, 7, 8],
        policyDrift: -1,
        swanRate: 0.08,
        swanFilter: {},
        scoreMultiplier: { compliance: 1.5, liquidity: 1.2 },
        transitionLine: '监管开始打电话。窗口指导一道道下，扩张的同行已经被卡了喉咙。',
      },
      {
        id: 'act_crisis',
        ordinal: 'ACT III',
        label: '危机期',
        tagline: '违约连锁，估值闪崩',
        quarters: [9, 10, 11, 12],
        policyDrift: -2,
        swanRate: 0.15,
        swanFilter: { policyMax: 0 },
        scoreMultiplier: { crisisResponse: 1.8, compliance: 1.3 },
        transitionLine: '邻省出事了。市场开始一刀切重新定价你这片区。能不能站到最后，看你这两年留了多少底牌。',
      },
    ],
  },
  {
    id: 'v_shape',
    name: 'V 型反转',
    icon: '⌇',
    accent: '#4fc3f7',
    description: '紧缩开局，政策大转向，最终分化。考验你能不能在低位提前布局。',
    acts: [
      {
        id: 'act_tight_open',
        ordinal: 'ACT I',
        label: '紧缩开局',
        tagline: '寒意先到',
        quarters: [1, 2, 3, 4],
        policyDrift: -1,
        swanRate: 0.07,
        swanFilter: { policyMax: 0 },
        scoreMultiplier: { liquidity: 1.5, compliance: 1.3 },
        transitionLine: '市场气氛冷淡。开局四季，先活下来。',
      },
      {
        id: 'act_pivot',
        ordinal: 'ACT II',
        label: '大转向',
        tagline: '政策托举，反弹机会',
        quarters: [5, 6, 7, 8],
        policyDrift: 2,
        swanRate: 0.10,
        swanFilter: { policyMin: 0 },
        scoreMultiplier: { development: 1.6, costControl: 1.4 },
        transitionLine: '政策大转向。会议、纪要、降准接踵而来。这是难得的反弹窗口，但只给敢加仓的人。',
      },
      {
        id: 'act_diverge',
        ordinal: 'ACT III',
        label: '分化期',
        tagline: '赢家通吃',
        quarters: [9, 10, 11, 12],
        policyDrift: 0,
        swanRate: 0.08,
        swanFilter: {},
        scoreMultiplier: { development: 1.4, projectProgress: 1.3 },
        transitionLine: '反弹兑现，但水位差异巨大。被甩下的区域回不来了，前排的还在加速。',
      },
    ],
  },
  {
    id: 'slow_boil',
    name: '温水煮青蛙',
    icon: '~',
    accent: '#ef5350',
    description: '表面平稳，暗流涌动，最终突发崩盘。最危险的剧本——你以为没事，直到它来。',
    acts: [
      {
        id: 'act_calm',
        ordinal: 'ACT I',
        label: '表面平稳',
        tagline: '一切正常',
        quarters: [1, 2, 3, 4],
        policyDrift: 0,
        swanRate: 0.03,
        swanFilter: {},
        scoreMultiplier: { compliance: 1.2, projectProgress: 1.2 },
        transitionLine: '今年看起来很平静。但这种平静通常意味着什么，你心里有数。',
      },
      {
        id: 'act_undertow',
        ordinal: 'ACT II',
        label: '暗流涌动',
        tagline: '局部问题开始浮现',
        quarters: [5, 6, 7, 8],
        policyDrift: -1,
        swanRate: 0.10,
        swanFilter: {},
        scoreMultiplier: { liquidity: 1.4, crisisResponse: 1.3 },
        transitionLine: '邻省传来零星的违约消息。还没轮到你，但留给你布局的时间不多了。',
      },
      {
        id: 'act_collapse',
        ordinal: 'ACT III',
        label: '突发崩盘',
        tagline: '黑天鹅集中爆发',
        quarters: [9, 10, 11, 12],
        policyDrift: -2,
        swanRate: 0.20,
        swanFilter: { policyMax: -1 },
        scoreMultiplier: { crisisResponse: 2.0, compliance: 1.4 },
        transitionLine: '所有人都看到了的事终于发生了。前面三个季度的"没事"是骗你的。',
      },
    ],
  },
  {
    id: 'redemption',
    name: '绝处逢生',
    icon: '↻',
    accent: '#4caf50',
    description: '危机开局，政策托举，复苏分化。开局极难，但活过去就是胜利者。',
    acts: [
      {
        id: 'act_crisis_open',
        ordinal: 'ACT I',
        label: '危机开局',
        tagline: '上来就打硬仗',
        quarters: [1, 2, 3, 4],
        policyDrift: -2,
        swanRate: 0.12,
        swanFilter: { policyMax: -1 },
        scoreMultiplier: { crisisResponse: 1.8, liquidity: 1.5 },
        transitionLine: '没有蜜月期。第一季就要面对真问题。能不能撑过开局四季，看你的底子。',
      },
      {
        id: 'act_relief',
        ordinal: 'ACT II',
        label: '政策托举',
        tagline: '救助来了',
        quarters: [5, 6, 7, 8],
        policyDrift: 2,
        swanRate: 0.08,
        swanFilter: { policyMin: 0 },
        scoreMultiplier: { development: 1.4, costControl: 1.3 },
        transitionLine: '中央终于出手。化债 2.0 砸下来，但额度有限，要看你能不能挤进名单。',
      },
      {
        id: 'act_recovery',
        ordinal: 'ACT III',
        label: '复苏分化',
        tagline: '剩者为王',
        quarters: [9, 10, 11, 12],
        policyDrift: 1,
        swanRate: 0.06,
        swanFilter: {},
        scoreMultiplier: { development: 1.5, projectProgress: 1.4 },
        transitionLine: '能熬到这一幕的都是赢家。剩下的事是把领先优势变现。',
      },
    ],
  },
];

// ─────────────────────────────────────────────
// 工具函数
// ─────────────────────────────────────────────

export function pickRandomScriptId() {
  const idx = Math.floor(Math.random() * SCRIPTS.length);
  return SCRIPTS[idx].id;
}

export function getScript(id) {
  return SCRIPTS.find(s => s.id === id) || SCRIPTS[0];
}

// 当前回合所在的幕。quartersPassed 从 0 开始，当前回合 = quartersPassed + 1
export function getCurrentAct(state) {
  const script = getScript(state?.scriptId);
  if (!script) return null;
  const currentQ = (state.quartersPassed || 0) + 1;
  return script.acts.find(a => a.quarters.includes(currentQ)) || null;
}

// 给定 state 与上一回合的 quartersPassed，判断本季是否进入了新幕
// 返回新幕对象（含 transitionLine 等）或 null
export function detectNewAct(state, prevActId) {
  const act = getCurrentAct(state);
  if (!act) return null;
  if (act.id === prevActId) return null;
  return act;
}

// 把 score effects 按当前幕的 multiplier 加权
// effects: { 'score.compliance': 5, ... } | { compliance: 5, ... }
// 这里只针对 score.* 前缀的字段做乘法
export function applyActScoreMultiplier(effects, act) {
  if (!act?.scoreMultiplier || !effects) return effects;
  const out = { ...effects };
  for (const [k, v] of Object.entries(out)) {
    if (typeof v !== 'number') continue;
    let dim = null;
    if (k.startsWith('score.')) dim = k.slice(6);
    if (!dim) continue;
    const mult = act.scoreMultiplier[dim];
    if (mult && mult !== 1) {
      // 正向加成才放大；负向不缩小（避免帮玩家逃避惩罚）
      out[k] = v > 0 ? parseFloat((v * mult).toFixed(2)) : v;
    }
  }
  return out;
}
