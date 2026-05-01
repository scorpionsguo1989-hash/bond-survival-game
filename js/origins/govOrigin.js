// js/origins/govOrigin.js
// 地方官员命运卡随机生成

const TIERS = [
  { id: 'strong_capital', label: '强省会', score: 4 },
  { id: 'prefecture',     label: '普通地级市', score: 5 },
  { id: 'county',         label: '县级市', score: 7 },
  { id: 'resource',       label: '资源型城市', score: 8 },
];

const FISCAL = [
  { id: 'self_sufficient', label: '自给率高', score: 3 },
  { id: 'transfer_dep',    label: '依赖转移支付', score: 6 },
  { id: 'land_dep',        label: '土地财政依赖', score: 7 },
];

const POLITICAL = [
  { id: 'fresh',     label: '新官上任', score: 5 },
  { id: 'reshuffle', label: '即将换届', score: 7 },
  { id: 'stable',    label: '长期执政稳定', score: 3 },
  { id: 'parachute', label: '空降干部', score: 6 },
];

const TAGS = [
  { id: 'debt_zone',        label: '化债重点区域', score: 8 },
  { id: 'central_partner',  label: '央企战略合作', score: 3 },
  { id: 'major_project',    label: '重大项目在建', score: 5 },
  { id: 'land_dispute',     label: '土地纠纷遗留', score: 6 },
  { id: 'industry_pain',    label: '产业转型阵痛', score: 6 },
  { id: 'population_drain', label: '人口持续流出', score: 7 },
];

// 虚构城市名（避免触发真实地名敏感）
const CITY_NAMES = [
  '云郡市', '星川市', '龙脊县', '凤栖区', '玄武郡',
  '青鸢市', '朱雀新区', '白泽县', '沧溟港区', '太虚开发区',
  '九霄县', '麒麟新城', '苍梧市', '碧海区', '昭明县',
];

const OFFICIAL_NAMES = [
  '陈稳健', '王进取', '周改革', '李守正', '赵开拓',
  '孙务实', '钱审慎', '吴破局', '郑布局', '冯兼听',
  '蒋平衡', '韩担当', '魏砺新', '黄持重', '谢清廉',
];

const TARGET_MIN = 16;
const TARGET_MAX = 26;

export function generateGovOrigin() {
  for (let i = 0; i < 50; i++) {
    const tier = pick(TIERS);
    const fiscal = pick(FISCAL);
    const political = pick(POLITICAL);
    const tag = pick(TAGS);
    const score = tier.score + fiscal.score + political.score + tag.score;
    if (score >= TARGET_MIN && score <= TARGET_MAX) {
      return buildOrigin(tier, fiscal, political, tag, score);
    }
  }
  // fallback
  return buildOrigin(
    { id: 'prefecture', label: '普通地级市', score: 5 },
    { id: 'transfer_dep', label: '依赖转移支付', score: 6 },
    { id: 'fresh', label: '新官上任', score: 5 },
    { id: 'major_project', label: '重大项目在建', score: 5 },
    21,
  );
}

function buildOrigin(tier, fiscal, political, tag, score) {
  const origin = {
    role: 'gov',
    cityTier: tier.id,
    fiscalStatus: fiscal.id,
    political: political.id,
    tag: tag.id,
    directorName: pick(OFFICIAL_NAMES),
    platformName: pick(CITY_NAMES),
    labels: {
      tier: tier.label,
      fiscal: fiscal.label,
      political: political.label,
      tag: tag.label,
    },
    challengeScore: score,
  };
  origin.challenges = generateChallenges(origin);
  return origin;
}

function generateChallenges(origin) {
  const challenges = [];
  if (origin.tag === 'debt_zone') challenges.push('被列为化债重点区域，初始隐债敞口大，需主动申报特殊再融资');
  if (origin.tag === 'land_dispute') challenges.push('辖区土地有遗留纠纷，土地出让收入受影响');
  if (origin.tag === 'industry_pain') challenges.push('正处产业转型阵痛期，传统税源萎缩');
  if (origin.tag === 'population_drain') challenges.push('人口持续流出，财政长期可持续性受挑战');
  if (origin.fiscalStatus === 'land_dep') challenges.push('财政高度依赖土地出让金，房地产周期波动会直接冲击预算');
  if (origin.fiscalStatus === 'transfer_dep') challenges.push('自有财政有限，需要积极争取上级转移支付');
  if (origin.political === 'reshuffle') challenges.push('即将换届，所有决策都要考虑接班人评价');
  if (origin.cityTier === 'county' || origin.cityTier === 'resource') challenges.push('城市能级偏低，可调动的政策资源有限');

  const generic = [
    '中央化债任务硬性指标，每季度都要有可见进展',
    '辖区平台融资环境恶化，城投兜底压力上升',
    '民生刚性支出占预算 70% 以上，腾挪空间小',
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
