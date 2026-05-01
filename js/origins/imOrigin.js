// js/origins/imOrigin.js

const INSTITUTIONS = [
  { id: 'bank_wm', label: '银行理财', score: 4 },
  { id: 'mutual', label: '公募基金', score: 6 },
  { id: 'insur', label: '保险资管', score: 5 },
  { id: 'private', label: '私募基金', score: 7 },
];

const SCALES = [
  { id: 'large', label: '大规模（500亿+）', score: 5 },
  { id: 'medium', label: '中规模（100-500亿）', score: 4 },
  { id: 'small', label: '小规模（<100亿）', score: 7 },
];

const HEALTH = [
  { id: 'good', label: '干净', score: 3 },
  { id: 'medium', label: '有问题券', score: 5 },
  { id: 'weak', label: '重仓弱资质', score: 8 },
];

const TAGS = [
  { id: 'fresh_product', label: '新发产品建仓期', score: 4 },
  { id: 'pending_redemption', label: '大额赎回压力中', score: 7 },
  { id: 'recent_drawdown', label: '刚经历净值回撤', score: 6 },
  { id: 'star_pm', label: '明星基金经理光环', score: 3 },
  { id: 'concentrated_clients', label: '机构客户集中度高', score: 6 },
  { id: 'eval_period', label: '即将考核节点', score: 5 },
];

const PM_NAMES = ['周稳健', '李进取', '陈防御', '王激进', '赵均衡', '钱套利', '孙下沉', '吴久期', '郑流动', '钱择时'];
const FUND_NAMES = ['鼎信稳健债', '华瑞精选债', '泰盈优选债', '信达增益债', '永丰纯债', '安诚信用债', '宏远利率债', '同泰增强债'];

const TARGET_MIN = 16;
const TARGET_MAX = 26;

export function generateImOrigin() {
  for (let i = 0; i < 50; i++) {
    const inst = pick(INSTITUTIONS);
    const scale = pick(SCALES);
    const health = pick(HEALTH);
    const tag = pick(TAGS);
    const score = inst.score + scale.score + health.score + tag.score;
    if (score >= TARGET_MIN && score <= TARGET_MAX) {
      return buildOrigin(inst, scale, health, tag, score);
    }
  }
  return buildOrigin(
    { id: 'mutual', label: '公募基金', score: 6 },
    { id: 'medium', label: '中规模（100-500亿）', score: 4 },
    { id: 'medium', label: '有问题券', score: 5 },
    { id: 'fresh_product', label: '新发产品建仓期', score: 4 },
    19,
  );
}

function buildOrigin(inst, scale, health, tag, score) {
  const origin = {
    role: 'im',
    institutionType: inst.id,
    scale: scale.id,
    healthLevel: health.id,
    tag: tag.id,
    directorName: pick(PM_NAMES),
    platformName: pick(FUND_NAMES),
    labels: {
      inst: inst.label,
      scale: scale.label,
      health: health.label,
      tag: tag.label,
      region: inst.label,
      business: scale.label,
    },
    challengeScore: score,
  };
  origin.challenges = generateChallenges(origin);
  return origin;
}

function generateChallenges(origin) {
  const challenges = [];
  if (origin.healthLevel === 'weak') challenges.push('组合重仓弱资质城投，政策收紧时估值回撤和赎回压力会同步放大');
  if (origin.tag === 'pending_redemption') challenges.push('当前处于大额赎回压力中，现金比例不足会快速演变为流动性挤兑');
  if (origin.tag === 'recent_drawdown') challenges.push('刚经历净值回撤，渠道和客户对下一次波动更敏感');
  if (origin.tag === 'concentrated_clients') challenges.push('机构客户集中度高，单一客户赎回会直接冲击组合现金');
  if (origin.scale === 'small') challenges.push('小规模产品灵活但抗赎回能力弱，单券集中度也更容易超线');
  if (origin.institutionType === 'private') challenges.push('私募策略更灵活，但客户稳定性和外部融资能力偏弱');

  const generic = [
    '政策环境波动会同时影响久期收益和信用利差，不能只看票息',
    '高评级仓位降低波动，但收益下行会压缩排名和客户留存',
    '回购加杠杆能放大收益，也会放大净值回撤和监管风险',
  ];
  let idx = 0;
  while (challenges.length < 3) {
    challenges.push(generic[idx++ % generic.length]);
  }
  return challenges.slice(0, 3);
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
