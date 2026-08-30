// js/config.js

export const GAME_CONFIG = {
  totalQuarters: 12,         // 3年=12季度
  startYear: 2022,
  startQuarter: 1,
  actionsPerTurn: 2,         // 每回合最多2次主动操作
  randomEventsPerTurn: { min: 0, max: 2 },
  policyAxisRange: { min: -5, max: 5 },
  policyAxisStart: -2,       // 开局偏紧
  // 每季事件配比。旧实现是「主线优先，主线为空才走池子」，而主线覆盖了全部
  // 12 个季度 × 3 角色，于是随机事件池和 saga 链头永远抽不到。改成按概率分配。
  // 实测配比（12 季/局）：主线 4.3 · saga 3.6 · 随机 2.3 · 黑天鹅 0.8 · 开场 1
  eventMix: {
    mainEventRate: 0.55,     // 本季走 2022-2024 主线剧情的概率
    sagaStartRate: 0.3,      // 非主线季里，优先起一条 saga 长线（而非单发随机事件）的概率
  },
};

/**
 * 难度旋钮。立项口径：**称职玩家通关率 ≈ 70%（约 30% 的人过不了关），
 * 而且乱点必须过不了** —— 差距要来自"看懂 effects、按专业判断做选择"。
 *
 * 改这里的任何一个数，都要重跑 `node scripts/balance-check.mjs` 复核三档通关率，
 * 并让 tests/balance.test.js 保持绿色。每个旋钮都对应一个有业务含义的量，
 * 不要加"纯粹调难度"的隐形系数。
 */
export const DIFFICULTY = {
  cfo: {
    // 12 季里玩家必须自己补上的融资缺口（亿），按 challengeScore 15→25 线性取值。
    // 参照：一局最多 24 次主动操作，单次续贷 0.5-5 亿、发债 1-8 亿。
    gapAtEasiest: 9.0,
    gapAtHardest: 26.0,
  },
  im: {
    // 票息保持在债券基金的现实区间（年化 ~2.4%）。难度不从"票息变没了"来——
    // 那不真实。真实杀伤是紧缩期估值波动 + 信用下沉被打，见下面两个系数。
    baseYieldPerQuarter: 0.006,
    policyImpactRate: 0.005,     // 政策每档对净值的影响（久期放大）
    creditPenaltyRate: 0.024,    // 紧缩期 AA 及以下占比的惩罚率
    redemptionThreshold: 55,     // 赎回压力触发线（原 60）
  },
  gov: {
    // 刚性支出占一般公共预算收入的比例。现实中地方本级支出常年大于本级收入、
    // 靠转移支付和土地出让补口子；原值 0.55 会让财政现金无限增长，等于没有约束。
    rigidSpendRatio: 0.95,
    debtServiceRate: 0.05,       // 每季化债任务的一档：隐债敞口 × 该系数
    // 另一档：省里按本级财力压任务（现实中化债任务是按财力分解的，不是按隐债余额）。
    // 两档取大者。这是让"财政现金"真正变成稀缺资源的关键——原来转移支付+土地收入
    // 远大于化债任务，现金无限增长，玩家没有任何要权衡的预算。
    debtServiceRevenueShare: 0.16,
    debtServiceMax: 30,          // 化债任务上限（原 6，重债区被封顶后压力失真）
    // 债务率漂移：隐债显性化推高债务率；完成常规化债任务只抵扣一小部分。
    // 原来抵扣系数是 0.5，导致"化债任务越重、债务率降得越快"——加压反而更安全。
    // 想真正把债务率压下来只能靠主动置换（专项债 / 隐债置换操作）。
    debtRatioDriftPerHiddenDebt: 0.05,
    debtRatioCreditPerDebtService: 0.12,
    // 债务率 = 债务余额 / 综合财力。政策收紧 → 土地出让缩水 → 分母变小 → 债务率被动抬升。
    // 这才是 2022-2024 城投债务率普遍上行的主因（不是新增债务），
    // 也是让政策轴对地方官真正有意义的机制：紧缩期不主动置换就会被分母推过红线。
    debtRatioCapacitySensitivity: 0.24,
    // 产业指数 → 税源。指数高于基准线，一般公共预算收入逐季增长；低于则萎缩。
    // 原来 industryIndex 只会自然衰减、不接任何机制，招商引资对生死零影响，
    // 等于把"做大分母"这条正路堵死，玩家只能在分子上腾挪。
    industryBaseline: 50,
    industryRevenueSensitivity: 0.010,
    // 专项债额度逐年下达（现实中不是一次性给完）。原来全局只有 9-28 亿，
    // 隐债置换全程最多压 3-8 个点债务率，对着 +50 以上的漂移完全不成比例。
    annualQuotaRefillShare: 0.12,   // 每年补充额度 = 一般公共预算收入 × 该比例
    missedDebtServicePenalty: 5, // 化债任务没完成时隐债的累积增量（原 3）
    missedPoliticalPenalty: 3,   // 化债任务没完成时的政绩扣分（原 2）
    politicalDecayPerQuarter: 5.0, // 政绩自然衰减（原 0.8，12 季只掉 9.6 分，形同无衰减）
  },
};

export const POLICY_LEVELS = [
  { range: [-5, -3], label: '严格', color: '#c62828', signal: '↓↓' },
  { range: [-2, -1], label: '偏紧', color: '#f57c00', signal: '↓' },
  { range: [0, 0],   label: '中性', color: '#9e9e9e', signal: '—' },
  { range: [1, 2],   label: '偏松', color: '#7cb342', signal: '↑' },
  { range: [3, 5],   label: '宽松', color: '#388e3c', signal: '↑↑' },
];

export const SCORE_DIMENSIONS = [
  '流动性管理',
  '融资成本控制',
  '项目推进',
  '合规指数',
  '危机应对',
  '综合发展',
];
