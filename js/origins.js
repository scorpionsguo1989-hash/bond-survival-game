// js/origins.js

const REGIONS = [
  { id: 'east_core', label: '东部核心城市', score: 8 },
  { id: 'central_capital', label: '中部省会', score: 5 },
  { id: 'west_prefecture', label: '西部地级市', score: 3 },
  { id: 'northeast_old', label: '东北老工业区', score: 2 },
];

const BUSINESS = [
  { id: 'infrastructure', label: '基础设施建设为主', score: 5 },
  { id: 'land_dev', label: '土地一级开发为主', score: 7 },
  { id: 'industrial_park', label: '产业园区运营为主', score: 4 },
  { id: 'public_utility', label: '公用事业为主', score: 3 },
];

const HEALTH = [
  { id: 'good', label: '健康', score: 3 },
  { id: 'medium', label: '一般', score: 5 },
  { id: 'weak', label: '承压', score: 8 },
];

const TAGS = [
  { id: 'star_platform', label: '明星平台', score: 4, type: 'mixed' },
  { id: 'hidden_debt_zone', label: '隐债重灾区', score: 7, type: 'bad' },
  { id: 'provincial_credit', label: '有省级增信', score: 1, type: 'good' },
  { id: 'leadership_change', label: '领导班子刚换', score: 5, type: 'mixed' },
  { id: 'restructuring', label: '正在整合重组', score: 5, type: 'mixed' },
  { id: 'asset_injection', label: '优质资产注入预期', score: 2, type: 'good' },
];

const TARGET_SCORE_MIN = 15;
const TARGET_SCORE_MAX = 25;

export function computeChallengeScore(origin) {
  const r = REGIONS.find(x => x.id === origin.regionTier).score;
  const b = BUSINESS.find(x => x.id === origin.businessType).score;
  const h = HEALTH.find(x => x.id === origin.healthLevel).score;
  const t = TAGS.find(x => x.id === origin.tag).score;
  // 强区域 + 弱平台 = 不平衡，引入交互项
  // 总分目标 15-25
  return r/2 + b + h + t/2 + 5;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const PLATFORM_NAME_PARTS = {
  prefix: ['淮西', '青阳', '南漳', '滨北', '沂南', '梁州', '雁城', '汾州'],
  suffix: ['市城市建设投资', '市国有资本运营', '区基础设施投资', '市交通投资'],
};

const DIRECTOR_NAMES = ['张明远', '李振华', '王建国', '赵海涛', '陈志强', '刘伟', '孙永康', '周国栋'];

export function generateOrigin(roleId) {
  // 约束随机：内部循环直到挑战值在区间内
  for (let attempt = 0; attempt < 100; attempt++) {
    const origin = {
      role: roleId,
      regionTier: pick(REGIONS).id,
      businessType: pick(BUSINESS).id,
      healthLevel: pick(HEALTH).id,
      tag: pick(TAGS).id,
    };
    const score = computeChallengeScore(origin);
    if (score >= TARGET_SCORE_MIN && score <= TARGET_SCORE_MAX) {
      origin.platformName = pick(PLATFORM_NAME_PARTS.prefix) + pick(PLATFORM_NAME_PARTS.suffix) + '有限公司';
      origin.directorName = pick(DIRECTOR_NAMES);
      origin.challenges = generateChallenges(origin);
      origin.labels = getLabels(origin);
      return origin;
    }
  }
  // 兜底
  return generateFallbackOrigin(roleId);
}

function getLabels(origin) {
  return {
    region: REGIONS.find(x => x.id === origin.regionTier).label,
    business: BUSINESS.find(x => x.id === origin.businessType).label,
    health: HEALTH.find(x => x.id === origin.healthLevel).label,
    tag: TAGS.find(x => x.id === origin.tag).label,
  };
}

function generateChallenges(origin) {
  const challenges = [];
  // 优先级从高到低，slice(0,3) 时优先保留最影响游戏性的挑战
  if (origin.healthLevel === 'weak') challenges.push('开局即面临大额到期，现金不足以单独覆盖，必须立即行动');
  if (origin.tag === 'hidden_debt_zone') challenges.push('隐债核查压力大，非标融资被监管约谈，灰色补血渠道堵死');
  if (origin.tag === 'restructuring') challenges.push('正在整合重组期，资源调配受限，存在不确定性');
  if (origin.tag === 'leadership_change') challenges.push('新班子上任，前期决策需更谨慎，避免被指责短期主义');
  if (origin.businessType === 'land_dev') challenges.push('土地市场低迷，开发收益下滑，资金回笼周期拉长');
  if (origin.businessType === 'infrastructure') challenges.push('在建项目持续吞噬现金，停工不行，继续投也危险');
  if (origin.regionTier === 'northeast_old' || origin.regionTier === 'west_prefecture') challenges.push('区域财力有限，转移支付占比高，自给率低');

  // 兜底通用挑战
  const generic = [
    '政策环境偏紧，发债窗口收窄，融资成本上行压力明显',
    '银行授信审批周期延长，部分到期贷款续作不确定',
    '抵押物空间偏紧，新增融资需要寻找替代担保方式',
  ];
  let genericIdx = 0;
  while (challenges.length < 3) {
    challenges.push(generic[genericIdx++ % generic.length]);
  }
  return challenges.slice(0, 3);
}

function generateFallbackOrigin(roleId) {
  const origin = {
    role: roleId,
    regionTier: 'central_capital',
    businessType: 'infrastructure',
    healthLevel: 'medium',
    tag: 'leadership_change',
    platformName: '淮西市城市建设投资有限公司',
    directorName: '张明远',
  };
  origin.labels = getLabels(origin);
  origin.challenges = generateChallenges(origin);
  return origin;
}
