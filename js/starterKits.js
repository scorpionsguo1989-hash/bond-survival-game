// js/starterKits.js — 起手包：起始 metrics 差异化（D 改造）
//
// 设计：
//   - 每角色 3 个 kit，正交于 health/region/tag。
//   - kit 影响起始 metrics（cash/lever/duration/...）+ 债务到期节奏（CFO）。
//   - origin generator 随机抽一个写到 origin.starterKit；createInitialState
//     调 role.getInitialMetrics(origin) 时各 role 内查表应用。
//   - 老存档（无 starterKit 字段）→ 默认走 'balanced'，兼容。

// ──────────── 标签：用于 fate-card tag 显示 ─────────────
export const STARTER_KIT_LABELS = {
  // CFO
  balanced:           '平衡型',
  aggressive_growth:  '扩张型',
  consolidation:      '化债攻坚型',
  // IM
  duration_long:      '久期型',
  credit_heavy:       '信用下沉型',
  // GOV
  industry_push:      '产业立市型',
  fiscal_discipline:  '财政纪律型',
};

// ──────────── 起手包定义：按角色枚举 ─────────────
export const STARTER_KITS_BY_ROLE = {
  cfo: ['balanced', 'aggressive_growth', 'consolidation'],
  im:  ['balanced', 'duration_long', 'credit_heavy'],
  gov: ['balanced', 'industry_push', 'fiscal_discipline'],
};

export function pickStarterKit(roleId) {
  const arr = STARTER_KITS_BY_ROLE[roleId] || ['balanced'];
  return arr[Math.floor(Math.random() * arr.length)];
}

// ──────────── CFO modifier 表 ─────────────
// 应用方式：在 cfoOrigin getInitialMetrics 里乘到对应字段
export const CFO_KIT_MODIFIERS = {
  balanced: {
    cashMult: 1.0, creditMult: 1.0, leverageDelta: 0, costDelta: 0, projectGapMult: 1.0,
    debtScheduleProfile: 'mid_peak',
    blurb: '平衡：起步现金、杠杆、授信都在中段，没有特别的攻防偏向。',
  },
  aggressive_growth: {
    // 现金 +10%、授信 +30%、杠杆 -3pp、成本不变、项目缺口不变
    // 债务节奏后置（前期可加杠杆扩张，到期高峰在 Q5-Q9）
    cashMult: 1.1, creditMult: 1.3, leverageDelta: -3, costDelta: 0, projectGapMult: 1.0,
    debtScheduleProfile: 'late_peak',
    blurb: '扩张：手里有钱有授信，杠杆相对低；前期可上规模，但 Q5+ 到期压力会回头压你。',
  },
  consolidation: {
    // 现金 -30%、授信 -20%、杠杆 +5pp、成本 +0.5%、项目缺口 +30%
    // 债务节奏前置（开局 Q1-Q4 就是到期高峰，必须立刻化债）
    cashMult: 0.7, creditMult: 0.8, leverageDelta: 5, costDelta: 0.5, projectGapMult: 1.3,
    debtScheduleProfile: 'early_peak',
    blurb: '化债攻坚：现金紧、杠杆高、成本贵；前 4 季就要还债，没有蜜月期。',
  },
};

// CFO 三种债务到期节奏（合计仍 = 1.0，分布形态不同）
export const CFO_DEBT_SCHEDULES = {
  // 中段高峰（默认）：Q5-Q7 是高峰
  mid_peak:   [0.05, 0.07, 0.09, 0.12, 0.14, 0.17, 0.15, 0.11, 0.06, 0.04, 0, 0],
  // 后置高峰：Q7-Q9 是高峰，前期轻
  late_peak:  [0.03, 0.05, 0.07, 0.09, 0.11, 0.14, 0.16, 0.14, 0.10, 0.07, 0.04, 0],
  // 前置高峰：Q2-Q4 就是高峰，开局压力大
  early_peak: [0.10, 0.13, 0.15, 0.14, 0.12, 0.10, 0.08, 0.06, 0.05, 0.04, 0.02, 0.01],
};

// ──────────── IM modifier 表 ─────────────
export const IM_KIT_MODIFIERS = {
  balanced: {
    duration: 2.5, cashRatioMult: 1.0, creditExposureMult: 1.0,
    concentrationMult: 1.0, leverage: 100,
    blurb: '平衡：默认久期 2.5、现金正常、信用敞口正常、无杠杆。',
  },
  duration_long: {
    // 久期 4.0、现金 -30%、信用敞口 -20%、杠杆 110%
    // 拉久期搏政策方向；松时大赚，紧时大亏
    duration: 4.0, cashRatioMult: 0.7, creditExposureMult: 0.8,
    concentrationMult: 1.0, leverage: 110,
    blurb: '久期型：duration 4.0 + 110% 杠杆，松时大赚紧时大亏；不接受窄幅震荡。',
  },
  credit_heavy: {
    // 久期 1.75（短）、信用敞口 +50%、集中度 +20%、现金 -10%、杠杆 100%
    // 信用下沉吃 yield，但单券雷炸了就完了
    duration: 1.75, cashRatioMult: 0.9, creditExposureMult: 1.5,
    concentrationMult: 1.2, leverage: 100,
    blurb: '信用下沉：久期短 + AA 及以下占比拉到 50%+；吃 yield 但抗不住单券爆雷。',
  },
};

// ──────────── GOV modifier 表 ─────────────
export const GOV_KIT_MODIFIERS = {
  balanced: {
    hiddenDebtMult: 1.0, debtRatioDelta: 0, politicalScoreDelta: 0,
    industryIndexDelta: 0, transferPaymentMult: 1.0, specialBondQuotaMult: 1.0,
    blurb: '平衡：起步政绩、化债、产业指数都中段。',
  },
  industry_push: {
    // 产业指数 +10、隐债 +20%、专项债额度 +10%、政绩 +5、转移支付 -10%
    // 重产业、轻化债：产业基数高但隐债大，要平衡
    hiddenDebtMult: 1.2, debtRatioDelta: 0, politicalScoreDelta: 5,
    industryIndexDelta: 10, transferPaymentMult: 0.9, specialBondQuotaMult: 1.1,
    blurb: '产业立市：产业指数高 + 政绩起点高；但隐债大、转移支付被砍，账要自己算。',
  },
  fiscal_discipline: {
    // 隐债 -20%、债务率 -10、产业指数 -5、政绩 -10、转移支付 +20%
    // 重化债、轻产业：起步债务清晰但政绩低、产业弱
    hiddenDebtMult: 0.8, debtRatioDelta: -10, politicalScoreDelta: -10,
    industryIndexDelta: -5, transferPaymentMult: 1.2, specialBondQuotaMult: 1.0,
    blurb: '财政纪律：隐债清晰、债务率低；但政绩起点低、产业弱，要靠 12 季度做出业绩。',
  },
};
