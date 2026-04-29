# 债市生存游戏 · Plan 1 · MVP 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建MVP——单角色（财务总监）可玩的完整游戏，本地浏览器运行，localStorage存档，含完整UI、图表、事件触发、随机出身、危机处置、终局评分。

**Architecture:** 多文件静态站，纯前端，无构建工具（直接`<script>`引入）。逻辑层与渲染层分离：纯JS模块负责状态机和数据，DOM渲染独立。Vitest做单元测试。Chart.js通过CDN引入。

**Tech Stack:** HTML5 / CSS3 / JavaScript (ES modules) / Vitest (测试) / Chart.js 4.x (CDN) / localStorage

**项目根目录：** `/Volumes/D盘/claude code/工作区/债券生存游戏/`

---

## 文件结构

```
债券生存游戏/
├── index.html              # 入口HTML
├── package.json            # Vitest + 启动脚本
├── vitest.config.js        # 测试配置
├── css/
│   └── style.css          # Bloomberg暗色主题
├── js/
│   ├── config.js          # 游戏常量
│   ├── roles.js           # 角色A配置
│   ├── origins.js         # 随机出身生成器
│   ├── policy.js          # 政策轴系统
│   ├── events.js          # 事件库
│   ├── eventEngine.js     # 事件触发逻辑
│   ├── actions.js         # 玩家操作定义
│   ├── score.js           # 评分计算
│   ├── engine.js          # 游戏状态机
│   ├── storage.js         # localStorage封装
│   ├── ui.js              # UI渲染
│   ├── charts.js          # Chart.js封装
│   └── main.js            # 入口/启动
├── content/
│   ├── mainEvents.json    # 主线事件数据
│   └── randomEvents.json  # 随机事件池
└── tests/
    ├── origins.test.js
    ├── policy.test.js
    ├── eventEngine.test.js
    ├── actions.test.js
    ├── score.test.js
    └── engine.test.js
```

**职责边界：**
- `engine.js`：纯状态机，不碰DOM
- `ui.js`：纯渲染函数，接收state返回HTML/操作DOM，不修改state
- `main.js`：把engine状态变化连接到ui渲染

---

## Task 1：项目脚手架

**Files:**
- Create: `package.json`
- Create: `vitest.config.js`
- Create: `.gitignore`
- Create: `README.md`
- Create: `index.html`（占位）

- [ ] **Step 1: 创建package.json**

```json
{
  "name": "bond-survival-game",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "serve": "python3 -m http.server 8080"
  },
  "devDependencies": {
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: 创建vitest.config.js**

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.js']
  }
});
```

- [ ] **Step 3: 创建.gitignore**

```
node_modules/
.DS_Store
*.log
dist/
```

- [ ] **Step 4: 安装依赖**

Run: `npm install`
Expected: vitest安装到node_modules

- [ ] **Step 5: 创建占位index.html**

```html
<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <title>债市生存游戏</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <div id="app"></div>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <script type="module" src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 6: 提交**

```bash
git init
git add .
git commit -m "feat: project scaffold"
```

---

## Task 2：游戏配置与常量

**Files:**
- Create: `js/config.js`

- [ ] **Step 1: 写入游戏常量**

```js
// js/config.js

export const GAME_CONFIG = {
  totalQuarters: 12,         // 3年=12季度
  startYear: 2022,
  startQuarter: 1,
  actionsPerTurn: 2,         // 每回合最多2次主动操作
  randomEventsPerTurn: { min: 0, max: 2 },
  policyAxisRange: { min: -5, max: 5 },
  policyAxisStart: -2,       // 开局偏紧
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
```

- [ ] **Step 2: 提交**

```bash
git add js/config.js
git commit -m "feat: game config and constants"
```

---

## Task 3：角色A（财务总监）配置

**Files:**
- Create: `js/roles.js`
- Test: `tests/roles.test.js`

- [ ] **Step 1: 编写测试**

```js
// tests/roles.test.js
import { describe, it, expect } from 'vitest';
import { ROLE_CFO, getInitialMetrics } from '../js/roles.js';

describe('ROLE_CFO', () => {
  it('contains all required core metrics', () => {
    expect(ROLE_CFO.metrics).toContain('cash');
    expect(ROLE_CFO.metrics).toContain('debtMaturity');
    expect(ROLE_CFO.metrics).toContain('financingCost');
    expect(ROLE_CFO.metrics).toContain('creditUsage');
    expect(ROLE_CFO.metrics).toContain('leverageRatio');
    expect(ROLE_CFO.metrics).toContain('collateralRoom');
    expect(ROLE_CFO.metrics).toContain('projectGap');
  });

  it('getInitialMetrics returns object with all metrics initialized', () => {
    const m = getInitialMetrics({ regionTier: 'central_capital', businessType: 'infrastructure', healthLevel: 'medium' });
    expect(m.cash).toBeGreaterThan(0);
    expect(m.leverageRatio).toBeGreaterThan(0).toBeLessThan(100);
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm test`
Expected: FAIL（roles.js not found）

- [ ] **Step 3: 实现roles.js**

```js
// js/roles.js

export const ROLE_CFO = {
  id: 'cfo',
  name: '城投财务总监',
  shortName: '财务总监',
  metrics: ['cash', 'debtMaturity', 'financingCost', 'creditUsage', 'leverageRatio', 'collateralRoom', 'projectGap', 'opCostRate'],
  metricLabels: {
    cash: '现金余量',
    debtMaturity: '债务到期日历',
    financingCost: '综合融资成本',
    creditUsage: '授信使用率',
    leverageRatio: '资产负债率',
    collateralRoom: '抵押物剩余空间',
    projectGap: '项目投资缺口',
    opCostRate: '运营成本消耗率',
  },
  deathConditions: [
    { metric: 'cash', op: '<=', threshold: 0, reason: '现金归零，资金链断裂' },
  ],
};

// 区域能级影响初始指标
const REGION_MODIFIERS = {
  east_core:    { cashMult: 1.4, leverageBase: 60, costBase: 5.0, creditBase: 25 },
  central_capital: { cashMult: 1.1, leverageBase: 67, costBase: 5.8, creditBase: 18 },
  west_prefecture: { cashMult: 0.7, leverageBase: 73, costBase: 6.8, creditBase: 12 },
  northeast_old: { cashMult: 0.6, leverageBase: 76, costBase: 7.2, creditBase: 8 },
};

const HEALTH_MODIFIERS = {
  good:   { cashMult: 1.3, leverageDelta: -5, costDelta: -0.5 },
  medium: { cashMult: 1.0, leverageDelta: 0,  costDelta: 0 },
  weak:   { cashMult: 0.6, leverageDelta: +5, costDelta: +0.7 },
};

export function getInitialMetrics(profile) {
  const r = REGION_MODIFIERS[profile.regionTier];
  const h = HEALTH_MODIFIERS[profile.healthLevel];
  return {
    cash: parseFloat((3.0 * r.cashMult * h.cashMult).toFixed(2)),       // 单位：亿
    creditTotal: r.creditBase,                                           // 总授信（亿）
    creditUsed: parseFloat((r.creditBase * 0.55).toFixed(2)),
    creditUsage: 55,                                                     // %
    leverageRatio: r.leverageBase + h.leverageDelta,                    // %
    financingCost: parseFloat((r.costBase + h.costDelta).toFixed(2)),  // %
    collateralRoom: profile.healthLevel === 'good' ? 'high' : (profile.healthLevel === 'medium' ? 'medium' : 'low'),
    opCostRate: 0.6,                                                     // 每季度运营成本（亿）
    projectGap: 2.1,                                                     // 每季度项目投资缺口（亿）
    debtMaturity: generateDebtSchedule(r.cashMult, h.cashMult),          // 12季度到期表
  };
}

function generateDebtSchedule(rMult, hMult) {
  // 总债务规模随财务健康度变化，分布在12季度
  const totalDebt = 50 / (rMult * hMult);
  const distribution = [0.17, 0.20, 0.12, 0.18, 0.07, 0.08, 0.13, 0.05, 0, 0, 0, 0];
  return distribution.map(p => parseFloat((totalDebt * p).toFixed(2)));
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add js/roles.js tests/roles.test.js
git commit -m "feat: role CFO configuration with initial metrics"
```

---

## Task 4：随机出身生成器

**Files:**
- Create: `js/origins.js`
- Test: `tests/origins.test.js`

- [ ] **Step 1: 编写测试**

```js
// tests/origins.test.js
import { describe, it, expect } from 'vitest';
import { generateOrigin, computeChallengeScore } from '../js/origins.js';

describe('generateOrigin', () => {
  it('returns object with all four dimensions', () => {
    const o = generateOrigin('cfo');
    expect(o.regionTier).toBeDefined();
    expect(o.businessType).toBeDefined();
    expect(o.healthLevel).toBeDefined();
    expect(o.tag).toBeDefined();
    expect(o.platformName).toBeDefined();
    expect(o.directorName).toBeDefined();
  });

  it('generates challenge score in target range (15-25)', () => {
    for (let i = 0; i < 50; i++) {
      const o = generateOrigin('cfo');
      const score = computeChallengeScore(o);
      expect(score).toBeGreaterThanOrEqual(15);
      expect(score).toBeLessThanOrEqual(25);
    }
  });

  it('generates challenges array with 3 items', () => {
    const o = generateOrigin('cfo');
    expect(o.challenges).toHaveLength(3);
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm test`
Expected: FAIL

- [ ] **Step 3: 实现origins.js**

```js
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
  if (origin.healthLevel === 'weak') challenges.push('开局即面临大额到期，现金不足以单独覆盖，必须立即行动');
  if (origin.tag === 'hidden_debt_zone') challenges.push('隐债核查压力大，非标融资被监管约谈，灰色补血渠道堵死');
  if (origin.tag === 'leadership_change') challenges.push('新班子上任，前期决策需更谨慎，避免被指责短期主义');
  if (origin.tag === 'restructuring') challenges.push('正在整合重组期，资源调配受限，存在不确定性');
  if (origin.businessType === 'land_dev') challenges.push('土地市场低迷，开发收益下滑，资金回笼周期拉长');
  if (origin.regionTier === 'northeast_old' || origin.regionTier === 'west_prefecture') challenges.push('区域财力有限，转移支付占比高，自给率低');
  if (origin.businessType === 'infrastructure') challenges.push('在建项目持续吞噬现金，停工不行，继续投也危险');

  // 兜底通用挑战
  const generic = [
    '政策环境偏紧，发债窗口收窄，融资成本上行压力明显',
    '银行授信审批周期延长，部分到期贷款续作不确定',
    '抵押物空间偏紧，新增融资需要寻找替代担保方式',
  ];
  while (challenges.length < 3) {
    const next = generic[challenges.length % generic.length];
    if (!challenges.includes(next)) challenges.push(next);
    else challenges.push(generic[(challenges.length + 1) % generic.length]);
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
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npm test`
Expected: PASS（所有测试，包括50次随机检验）

- [ ] **Step 5: 提交**

```bash
git add js/origins.js tests/origins.test.js
git commit -m "feat: random origin generator with balance constraint"
```

---

## Task 5：政策轴系统

**Files:**
- Create: `js/policy.js`
- Test: `tests/policy.test.js`

- [ ] **Step 1: 编写测试**

```js
// tests/policy.test.js
import { describe, it, expect } from 'vitest';
import { driftPolicy, getPolicyLabel, applyPolicyShift } from '../js/policy.js';

describe('driftPolicy', () => {
  it('drifts toward direction by 1', () => {
    expect(driftPolicy(-2, 'tight')).toBe(-3);
    expect(driftPolicy(0, 'loose')).toBe(1);
  });

  it('clamps at min/max', () => {
    expect(driftPolicy(-5, 'tight')).toBe(-5);
    expect(driftPolicy(5, 'loose')).toBe(5);
  });
});

describe('getPolicyLabel', () => {
  it('returns correct label for value', () => {
    expect(getPolicyLabel(-4).label).toBe('严格');
    expect(getPolicyLabel(-1).label).toBe('偏紧');
    expect(getPolicyLabel(0).label).toBe('中性');
    expect(getPolicyLabel(2).label).toBe('偏松');
    expect(getPolicyLabel(4).label).toBe('宽松');
  });
});

describe('applyPolicyShift', () => {
  it('jumps and clamps', () => {
    expect(applyPolicyShift(-2, 4)).toBe(2);
    expect(applyPolicyShift(3, 5)).toBe(5);
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm test`
Expected: FAIL

- [ ] **Step 3: 实现policy.js**

```js
// js/policy.js
import { GAME_CONFIG, POLICY_LEVELS } from './config.js';

export function driftPolicy(currentValue, direction) {
  const delta = direction === 'tight' ? -1 : (direction === 'loose' ? 1 : 0);
  return clamp(currentValue + delta);
}

export function applyPolicyShift(currentValue, shift) {
  return clamp(currentValue + shift);
}

export function getPolicyLabel(value) {
  return POLICY_LEVELS.find(l => value >= l.range[0] && value <= l.range[1]) || POLICY_LEVELS[2];
}

function clamp(value) {
  const { min, max } = GAME_CONFIG.policyAxisRange;
  return Math.max(min, Math.min(max, value));
}

export function getPolicyDirection(currentValue, lastValue) {
  if (currentValue > lastValue) return 'loose';
  if (currentValue < lastValue) return 'tight';
  return 'stable';
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add js/policy.js tests/policy.test.js
git commit -m "feat: policy axis drift and label system"
```

---

## Task 6：事件数据文件

**Files:**
- Create: `content/mainEvents.json`
- Create: `content/randomEvents.json`

- [ ] **Step 1: 创建主线事件JSON**

```json
[
  {
    "id": "main_2022_q1",
    "trigger": { "year": 2022, "quarter": 1 },
    "title": "银行收紧城投贷款额度",
    "body": "监管窗口指导下发，辖区内商业银行对城投平台新增贷款全面收紧。你的主开户行通知：现有授信到期后，是否续做需要总行审批，流程预计需要6-8周。\n\nQ1有大额到期，现金账上不足以覆盖。",
    "policyShift": -1,
    "choices": [
      {
        "label": "立即启动备用银行的授信申请，提前6周铺路，但需贡献部分存款作对价",
        "effects": { "cash": -0.5, "creditUsed": -1.5, "score.合规指数": +5 }
      },
      {
        "label": "向主管局汇报，争取政策性银行专项额度介入，时间窗口更长但不确定",
        "effects": { "cash": +0, "score.项目推进": +3, "_uncertainty": 0.4 }
      },
      {
        "label": "加快推进存量资产处置，用土地抵押换流动性，接受估值折扣",
        "effects": { "cash": +2.0, "collateralRoom": "downgrade", "score.流动性管理": -3 }
      }
    ]
  },
  {
    "id": "main_2022_q3",
    "trigger": { "year": 2022, "quarter": 3 },
    "title": "某省城投爆雷，市场情绪骤冷",
    "body": "邻省一笔城投私募债违约，引发市场恐慌。信用利差快速走阔，新发行难度加大，投资人对中部和西部城投警惕性提升。",
    "policyShift": -1,
    "choices": [
      {
        "label": "暂停新增对外披露，闷声做事，待市场情绪平复",
        "effects": { "score.合规指数": +2, "_marketDelay": 1 }
      },
      {
        "label": "主动召开投资人沟通会，展示偿债计划，稳定市场预期",
        "effects": { "cash": -0.3, "financingCost": -0.2, "score.危机应对": +6 }
      },
      {
        "label": "趁机锁定一笔长期低息贷款，用一定成本换确定性",
        "effects": { "cash": +3.0, "financingCost": +0.4, "creditUsed": +3 }
      }
    ]
  },
  {
    "id": "main_2022_q4",
    "trigger": { "year": 2022, "quarter": 4 },
    "title": "理财赎回潮蔓延",
    "body": "债市大幅调整，理财产品破净潮起，机构投资者大量赎回，二级市场成交几乎冰封。你的部分债券估值下跌，质押融资也受影响。",
    "policyShift": -1,
    "choices": [
      {
        "label": "动用授信抢做回购，给市场注入流动性",
        "effects": { "cash": +1.5, "creditUsed": +2, "score.危机应对": +5 }
      },
      {
        "label": "按兵不动，等待政策面安抚",
        "effects": { "_uncertainty": 0.5, "score.合规指数": +1 }
      }
    ]
  },
  {
    "id": "main_2023_q1",
    "trigger": { "year": 2023, "quarter": 1 },
    "title": "化债政策信号释放",
    "body": "中央经济工作会议明确提出'有效防范化解重点领域风险'，市场预期化债政策即将出台。专项债限额上调讨论升温。",
    "policyShift": +2,
    "choices": [
      {
        "label": "提前布局，与地方财政沟通，争取纳入化债试点",
        "effects": { "score.项目推进": +5, "score.合规指数": +3 }
      },
      {
        "label": "保持观望，先确保短期兑付安全",
        "effects": { "score.流动性管理": +2 }
      }
    ]
  },
  {
    "id": "main_2023_q3",
    "trigger": { "year": 2023, "quarter": 3 },
    "title": "一揽子化债方案出台",
    "body": "国务院正式部署一揽子化债方案，特殊再融资债重启，专项债额度大幅扩容。城投平台迎来罕见的政策窗口期，但纳入名单和额度分配竞争激烈。",
    "policyShift": +2,
    "choices": [
      {
        "label": "全力争取最大额度，置换高息存量债务",
        "effects": { "cash": +1.0, "financingCost": -1.2, "score.融资成本控制": +8 }
      },
      {
        "label": "适度参与，避免过度依赖政策红利",
        "effects": { "financingCost": -0.5, "score.合规指数": +4, "score.综合发展": +3 }
      },
      {
        "label": "推动城投市场化转型，借机剥离非主业资产",
        "effects": { "cash": +2.0, "leverageRatio": -3, "score.综合发展": +6 }
      }
    ]
  },
  {
    "id": "main_2024_q1",
    "trigger": { "year": 2024, "quarter": 1 },
    "title": "非标全面收紧，监管新规落地",
    "body": "金融监管总局对城投非标融资发布新规，定融、信托等渠道全面收紧。如有存量非标，需在限期内压降。",
    "policyShift": -1,
    "choices": [
      {
        "label": "提前压降非标存量，承担一次性置换成本",
        "effects": { "cash": -1.0, "financingCost": -0.3, "score.合规指数": +7 }
      },
      {
        "label": "申请分阶段整改，争取过渡期",
        "effects": { "_uncertainty": 0.3, "score.项目推进": -2 }
      }
    ]
  },
  {
    "id": "main_2024_q2",
    "trigger": { "year": 2024, "quarter": 2 },
    "title": "城投整合提速",
    "body": "上级要求弱平台被并入强平台，整合重组成为大趋势。你的平台被列入潜在被整合名单。",
    "policyShift": 0,
    "choices": [
      {
        "label": "主动申请作为整合主体，吸纳兄弟平台资源",
        "effects": { "cash": +1.5, "creditTotal": +5, "score.综合发展": +5 }
      },
      {
        "label": "接受被整合，配合资产剥离",
        "effects": { "cash": -0.5, "score.合规指数": +5 }
      },
      {
        "label": "推动市场化重组，引入战略投资者",
        "effects": { "cash": +2.0, "leverageRatio": -5, "score.综合发展": +6, "_uncertainty": 0.3 }
      }
    ]
  },
  {
    "id": "main_2024_q3",
    "trigger": { "year": 2024, "quarter": 3 },
    "title": "利率持续下行，再融资成本改善",
    "body": "央行多次降息，债券市场利率创新低。新发行成本显著下降，存量高息债务置换窗口打开。",
    "policyShift": +1,
    "choices": [
      {
        "label": "大规模置换存量高息债务",
        "effects": { "financingCost": -0.8, "score.融资成本控制": +6 }
      },
      {
        "label": "拉长债务久期，锁定低息",
        "effects": { "financingCost": -0.5, "score.流动性管理": +4 }
      }
    ]
  },
  {
    "id": "main_2024_q4",
    "trigger": { "year": 2024, "quarter": 4 },
    "title": "终局结算",
    "body": "三年生存挑战即将结束。综合评估你的表现，结算最终成绩。",
    "policyShift": 0,
    "choices": [
      { "label": "查看最终成绩", "effects": { "_finalize": true } }
    ]
  }
]
```

写入文件 `content/mainEvents.json`

- [ ] **Step 2: 创建随机事件JSON**

```json
[
  {
    "id": "rand_market_rate_jump",
    "type": "市场",
    "weight": { "tight": 2, "stable": 1, "loose": 0.5 },
    "title": "市场利率突然走高",
    "body": "10年期国债收益率单日跳升15bp，新发行成本被动上抬。",
    "choices": [
      { "label": "推迟发行计划，等待市场企稳", "effects": { "score.融资成本控制": +2, "_delay": 1 } },
      { "label": "硬扛上行成本完成发行", "effects": { "cash": +1.5, "financingCost": +0.3 } }
    ]
  },
  {
    "id": "rand_market_rating_down",
    "type": "市场",
    "weight": { "tight": 2, "stable": 1, "loose": 0.5 },
    "title": "评级机构下调展望",
    "body": "某评级机构将你所在区域整体评级展望从'稳定'下调至'负面'。",
    "choices": [
      { "label": "主动联系评级机构，提交补充材料", "effects": { "cash": -0.2, "score.危机应对": +3 } },
      { "label": "接受下调，调整融资策略", "effects": { "financingCost": +0.2, "score.合规指数": +1 } }
    ]
  },
  {
    "id": "rand_op_contractor_demand",
    "type": "经营",
    "weight": { "tight": 1, "stable": 1, "loose": 1 },
    "title": "在建项目承包商催款",
    "body": "城北基础设施PPP项目承包商已垫资2.8亿，要求本季度结清1.2亿，否则停工。",
    "choices": [
      { "label": "协商延期，承诺下季度优先结算，接受承包商提出的违约金", "effects": { "cash": -0.1, "_delay": 1 } },
      { "label": "从现金账上硬扛，结算工程款，牺牲流动性", "effects": { "cash": -1.2, "score.项目推进": +4 } }
    ]
  },
  {
    "id": "rand_op_receivable",
    "type": "经营",
    "weight": { "tight": 1, "stable": 1, "loose": 1 },
    "title": "应收账款回收困难",
    "body": "委托代建项目业主单位拖延付款，原定本季回笼1.5亿无法到账。",
    "choices": [
      { "label": "走法律程序追讨", "effects": { "cash": -0.2, "_delay": 2 } },
      { "label": "协商分期回款", "effects": { "cash": +0.5, "_delay": 1 } }
    ]
  },
  {
    "id": "rand_policy_window_guidance",
    "type": "政策",
    "weight": { "tight": 3, "stable": 1, "loose": 0 },
    "title": "监管窗口指导：非标整改",
    "body": "金融监管部门窗口指导，要求压降非标融资规模，30天内提交整改方案。",
    "choices": [
      { "label": "全力配合整改", "effects": { "cash": -0.5, "score.合规指数": +5 } },
      { "label": "缓期整改，先保兑付", "effects": { "_uncertainty": 0.3 } }
    ]
  },
  {
    "id": "rand_policy_inspection",
    "type": "政策",
    "weight": { "tight": 2, "stable": 1, "loose": 0.5 },
    "title": "审计组进驻",
    "body": "省审计厅派出工作组进驻，重点核查隐性债务和资金使用合规性。",
    "choices": [
      { "label": "主动提交所有材料，配合调查", "effects": { "score.合规指数": +6, "_delay": 1 } },
      { "label": "选择性配合，控制信息披露", "effects": { "_uncertainty": 0.4, "score.合规指数": -2 } }
    ]
  },
  {
    "id": "rand_opportunity_low_rate",
    "type": "机遇",
    "weight": { "tight": 0.5, "stable": 1, "loose": 3 },
    "title": "政策性银行主动对接",
    "body": "国开行项目经理主动联系，针对你的某在建项目可提供长期低息贷款，综合成本3.8%。",
    "choices": [
      { "label": "接受贷款，置换部分高息债务", "effects": { "cash": +2.5, "financingCost": -0.4, "creditUsed": +3 } },
      { "label": "暂不接受，避免新增负债", "effects": { "score.合规指数": +2 } }
    ]
  },
  {
    "id": "rand_opportunity_asset_inject",
    "type": "机遇",
    "weight": { "tight": 0.5, "stable": 1, "loose": 2 },
    "title": "优质资产注入预期",
    "body": "市政府考虑将一处优质市政资产无偿划入你的平台，可显著改善资产结构。",
    "choices": [
      { "label": "积极争取，承担相应配套义务", "effects": { "cash": -0.3, "leverageRatio": -3, "collateralRoom": "upgrade", "score.综合发展": +5 } },
      { "label": "评估后再定，避免承担额外负担", "effects": { "score.合规指数": +1 } }
    ]
  }
]
```

写入文件 `content/randomEvents.json`

- [ ] **Step 3: 提交**

```bash
git add content/
git commit -m "content: initial main and random events"
```

---

## Task 7：事件触发引擎

**Files:**
- Create: `js/eventEngine.js`
- Test: `tests/eventEngine.test.js`

- [ ] **Step 1: 编写测试**

```js
// tests/eventEngine.test.js
import { describe, it, expect } from 'vitest';
import { findMainEvent, sampleRandomEvents, getPolicyDirection } from '../js/eventEngine.js';

const mainEvents = [
  { id: 'main_2022_q1', trigger: { year: 2022, quarter: 1 }, title: 'A' },
  { id: 'main_2022_q3', trigger: { year: 2022, quarter: 3 }, title: 'B' },
];

const randomEvents = [
  { id: 'r1', type: '市场', weight: { tight: 2, stable: 1, loose: 0.5 } },
  { id: 'r2', type: '机遇', weight: { tight: 0.5, stable: 1, loose: 2 } },
  { id: 'r3', type: '经营', weight: { tight: 1, stable: 1, loose: 1 } },
];

describe('findMainEvent', () => {
  it('finds main event for current quarter', () => {
    expect(findMainEvent(mainEvents, 2022, 1).id).toBe('main_2022_q1');
    expect(findMainEvent(mainEvents, 2022, 3).id).toBe('main_2022_q3');
  });

  it('returns null when no main event', () => {
    expect(findMainEvent(mainEvents, 2022, 2)).toBeNull();
  });
});

describe('sampleRandomEvents', () => {
  it('returns array within max bound', () => {
    const result = sampleRandomEvents(randomEvents, 'tight', { min: 0, max: 2 });
    expect(result.length).toBeLessThanOrEqual(2);
  });

  it('does not duplicate events in same sample', () => {
    const result = sampleRandomEvents(randomEvents, 'tight', { min: 2, max: 2 });
    const ids = result.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('getPolicyDirection', () => {
  it('returns tight/stable/loose based on axis value', () => {
    expect(getPolicyDirection(-3)).toBe('tight');
    expect(getPolicyDirection(0)).toBe('stable');
    expect(getPolicyDirection(2)).toBe('loose');
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm test`
Expected: FAIL

- [ ] **Step 3: 实现eventEngine.js**

```js
// js/eventEngine.js

export function findMainEvent(mainEvents, year, quarter) {
  return mainEvents.find(e => e.trigger.year === year && e.trigger.quarter === quarter) || null;
}

export function getPolicyDirection(axisValue) {
  if (axisValue <= -2) return 'tight';
  if (axisValue >= 2) return 'loose';
  return 'stable';
}

export function sampleRandomEvents(pool, policyDirection, count) {
  const min = count.min;
  const max = count.max;
  const targetCount = min + Math.floor(Math.random() * (max - min + 1));
  if (targetCount === 0) return [];

  // 加权抽样，无放回
  const remaining = [...pool];
  const result = [];
  for (let i = 0; i < targetCount && remaining.length > 0; i++) {
    const totalWeight = remaining.reduce((s, e) => s + (e.weight?.[policyDirection] ?? 1), 0);
    let r = Math.random() * totalWeight;
    let pickedIdx = 0;
    for (let j = 0; j < remaining.length; j++) {
      r -= (remaining[j].weight?.[policyDirection] ?? 1);
      if (r <= 0) { pickedIdx = j; break; }
    }
    result.push(remaining[pickedIdx]);
    remaining.splice(pickedIdx, 1);
  }
  return result;
}

export async function loadEvents() {
  const [mainResp, randResp] = await Promise.all([
    fetch('content/mainEvents.json'),
    fetch('content/randomEvents.json'),
  ]);
  return {
    main: await mainResp.json(),
    random: await randResp.json(),
  };
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add js/eventEngine.js tests/eventEngine.test.js
git commit -m "feat: event triggering and weighted sampling"
```

---

## Task 8：玩家主动操作系统

**Files:**
- Create: `js/actions.js`
- Test: `tests/actions.test.js`

- [ ] **Step 1: 编写测试**

```js
// tests/actions.test.js
import { describe, it, expect } from 'vitest';
import { CFO_ACTIONS, applyAction, isActionAvailable } from '../js/actions.js';

describe('CFO_ACTIONS', () => {
  it('has bank loan, bond issue, asset disposal, non-standard finance', () => {
    const ids = CFO_ACTIONS.map(a => a.id);
    expect(ids).toContain('bank_loan');
    expect(ids).toContain('bond_issue');
    expect(ids).toContain('asset_disposal');
    expect(ids).toContain('non_standard');
  });
});

describe('applyAction', () => {
  it('applies cash effect of bank loan', () => {
    const state = { metrics: { cash: 3.0, creditUsed: 5, creditTotal: 20, financingCost: 6.0 } };
    const newState = applyAction(state, 'bank_loan', { amount: 2.0 });
    expect(newState.metrics.cash).toBeCloseTo(5.0);
    expect(newState.metrics.creditUsed).toBe(7);
  });
});

describe('isActionAvailable', () => {
  it('disables bank_loan when credit fully used', () => {
    const state = { metrics: { creditUsed: 20, creditTotal: 20 }, policyValue: 0 };
    expect(isActionAvailable(state, 'bank_loan').available).toBe(false);
  });

  it('disables non_standard under tight policy', () => {
    const state = { metrics: { creditUsed: 5, creditTotal: 20 }, policyValue: -4 };
    expect(isActionAvailable(state, 'non_standard').available).toBe(false);
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm test`
Expected: FAIL

- [ ] **Step 3: 实现actions.js**

```js
// js/actions.js

export const CFO_ACTIONS = [
  {
    id: 'bank_loan',
    name: '申请银行续贷',
    desc: '使用未占用授信额度借款，到账快但占用授信',
    cost: 1,
    params: [{ key: 'amount', label: '借款金额（亿）', min: 0.5, max: 5, step: 0.5, default: 2 }],
  },
  {
    id: 'bond_issue',
    name: '发行城投债',
    desc: '在公开市场发债，成本较低但受窗口限制',
    cost: 1,
    params: [{ key: 'amount', label: '发行规模（亿）', min: 1, max: 8, step: 1, default: 3 }],
  },
  {
    id: 'asset_disposal',
    name: '资产处置变现',
    desc: '出售土地或股权获取现金，消耗抵押物空间',
    cost: 1,
    params: [{ key: 'amount', label: '处置规模（亿）', min: 1, max: 5, step: 0.5, default: 2 }],
  },
  {
    id: 'non_standard',
    name: '⚠ 非标融资',
    desc: '紧急情况使用，成本高且后遗症大',
    cost: 1,
    params: [{ key: 'amount', label: '融资规模（亿）', min: 1, max: 4, step: 0.5, default: 2 }],
  },
  {
    id: 'pre_funding',
    name: '提前备款',
    desc: '从经营现金流中预留资金应对到期',
    cost: 1,
    params: [{ key: 'amount', label: '备款金额（亿）', min: 0.5, max: 3, step: 0.5, default: 1 }],
  },
];

export function isActionAvailable(state, actionId) {
  const m = state.metrics;
  switch (actionId) {
    case 'bank_loan':
      if (m.creditUsed >= m.creditTotal) return { available: false, reason: '授信已用尽' };
      return { available: true };
    case 'bond_issue':
      if (state.policyValue <= -4) return { available: false, reason: '政策极紧，发债窗口关闭' };
      return { available: true };
    case 'asset_disposal':
      if (m.collateralRoom === 'low') return { available: false, reason: '抵押物已用尽' };
      return { available: true };
    case 'non_standard':
      if (state.policyValue <= -3) return { available: false, reason: '监管严格，非标已被禁' };
      return { available: true };
    case 'pre_funding':
      return { available: true };
    default:
      return { available: false, reason: '未知操作' };
  }
}

export function applyAction(state, actionId, params) {
  const newMetrics = { ...state.metrics };
  const newScore = { ...(state.score || {}) };
  let newPolicyValue = state.policyValue;

  switch (actionId) {
    case 'bank_loan': {
      const amt = params.amount;
      newMetrics.cash = parseFloat((newMetrics.cash + amt).toFixed(2));
      newMetrics.creditUsed = parseFloat((newMetrics.creditUsed + amt).toFixed(2));
      newMetrics.creditUsage = Math.round((newMetrics.creditUsed / newMetrics.creditTotal) * 100);
      addScore(newScore, '流动性管理', 2);
      break;
    }
    case 'bond_issue': {
      const amt = params.amount;
      newMetrics.cash = parseFloat((newMetrics.cash + amt).toFixed(2));
      // 政策越紧成本越高
      const costAdjust = state.policyValue <= -2 ? 0.3 : 0;
      newMetrics.financingCost = parseFloat((newMetrics.financingCost + costAdjust).toFixed(2));
      addScore(newScore, '融资成本控制', state.policyValue >= 0 ? 4 : 1);
      break;
    }
    case 'asset_disposal': {
      const amt = params.amount;
      // 资产处置打折15%
      const cashIn = parseFloat((amt * 0.85).toFixed(2));
      newMetrics.cash = parseFloat((newMetrics.cash + cashIn).toFixed(2));
      newMetrics.collateralRoom = downgradeCollateral(newMetrics.collateralRoom);
      newMetrics.leverageRatio = parseFloat((newMetrics.leverageRatio - 1.5).toFixed(1));
      addScore(newScore, '流动性管理', -2);
      break;
    }
    case 'non_standard': {
      const amt = params.amount;
      newMetrics.cash = parseFloat((newMetrics.cash + amt).toFixed(2));
      newMetrics.financingCost = parseFloat((newMetrics.financingCost + 0.8).toFixed(2));
      addScore(newScore, '合规指数', -8);
      addScore(newScore, '融资成本控制', -5);
      break;
    }
    case 'pre_funding': {
      const amt = params.amount;
      newMetrics.cash = parseFloat((newMetrics.cash + amt * 0.6).toFixed(2));
      newMetrics.opCostRate = parseFloat((newMetrics.opCostRate + 0.1).toFixed(2));
      addScore(newScore, '流动性管理', 3);
      break;
    }
  }

  return {
    ...state,
    metrics: newMetrics,
    score: newScore,
    policyValue: newPolicyValue,
    actionsUsed: (state.actionsUsed || 0) + 1,
  };
}

function downgradeCollateral(level) {
  if (level === 'high') return 'medium';
  if (level === 'medium') return 'low';
  return 'low';
}

function addScore(score, dim, delta) {
  score[dim] = (score[dim] || 0) + delta;
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add js/actions.js tests/actions.test.js
git commit -m "feat: player action system with effects and availability"
```

---

## Task 9：评分计算

**Files:**
- Create: `js/score.js`
- Test: `tests/score.test.js`

- [ ] **Step 1: 编写测试**

```js
// tests/score.test.js
import { describe, it, expect } from 'vitest';
import { computeFinalScore, getScoreGrade } from '../js/score.js';

describe('computeFinalScore', () => {
  it('returns six dimensions', () => {
    const state = {
      score: { '流动性管理': 30, '融资成本控制': 20, '项目推进': 25, '合规指数': 35, '危机应对': 28, '综合发展': 22 },
      metrics: { cash: 5, leverageRatio: 65, financingCost: 5.5, collateralRoom: 'medium' },
      survived: true,
      quartersPassed: 12,
    };
    const result = computeFinalScore(state);
    expect(Object.keys(result.dimensions)).toHaveLength(6);
    expect(result.total).toBeGreaterThan(0);
    expect(result.total).toBeLessThanOrEqual(100);
  });

  it('penalizes failed run', () => {
    const failed = { score: {}, metrics: { cash: 0, leverageRatio: 90, financingCost: 8, collateralRoom: 'low' }, survived: false, quartersPassed: 5 };
    const result = computeFinalScore(failed);
    expect(result.total).toBeLessThan(40);
  });
});

describe('getScoreGrade', () => {
  it('maps total to grade', () => {
    expect(getScoreGrade(95).grade).toBe('S');
    expect(getScoreGrade(80).grade).toBe('A');
    expect(getScoreGrade(65).grade).toBe('B');
    expect(getScoreGrade(50).grade).toBe('C');
    expect(getScoreGrade(30).grade).toBe('D');
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm test`
Expected: FAIL

- [ ] **Step 3: 实现score.js**

```js
// js/score.js
import { SCORE_DIMENSIONS } from './config.js';

const DIM_MAX_RAW = 50;  // 各维度原始分理论上限

export function computeFinalScore(state) {
  const dimensions = {};

  // 1. 流动性管理：现金充足度 + 玩家行动评分
  const liquidityFromMetric = Math.min(20, state.metrics.cash * 4);
  dimensions['流动性管理'] = clamp(((state.score?.['流动性管理'] || 0) + liquidityFromMetric + 30) / DIM_MAX_RAW * 100);

  // 2. 融资成本控制：综合融资成本越低越高
  const costFromMetric = Math.max(0, 30 - (state.metrics.financingCost - 4) * 8);
  dimensions['融资成本控制'] = clamp(((state.score?.['融资成本控制'] || 0) + costFromMetric + 15) / DIM_MAX_RAW * 100);

  // 3. 项目推进：玩家行动累积
  dimensions['项目推进'] = clamp(((state.score?.['项目推进'] || 0) + 25) / DIM_MAX_RAW * 100);

  // 4. 合规指数：玩家行动累积
  dimensions['合规指数'] = clamp(((state.score?.['合规指数'] || 0) + 25) / DIM_MAX_RAW * 100);

  // 5. 危机应对：玩家行动累积
  dimensions['危机应对'] = clamp(((state.score?.['危机应对'] || 0) + 25) / DIM_MAX_RAW * 100);

  // 6. 综合发展：杠杆率改善 + 综合
  const leverageScore = Math.max(0, 30 - (state.metrics.leverageRatio - 60) * 1.5);
  dimensions['综合发展'] = clamp(((state.score?.['综合发展'] || 0) + leverageScore + 10) / DIM_MAX_RAW * 100);

  let total = SCORE_DIMENSIONS.reduce((s, d) => s + dimensions[d], 0) / SCORE_DIMENSIONS.length;

  // 失败惩罚：未存活 -50%
  if (!state.survived) {
    total = total * 0.4;
    SCORE_DIMENSIONS.forEach(d => dimensions[d] = dimensions[d] * 0.4);
  }

  return {
    dimensions,
    total: Math.round(total),
    grade: getScoreGrade(Math.round(total)),
    survived: state.survived,
    quartersPassed: state.quartersPassed,
  };
}

function clamp(v) { return Math.max(0, Math.min(100, v)); }

export function getScoreGrade(total) {
  if (total >= 90) return { grade: 'S', label: '传奇' };
  if (total >= 75) return { grade: 'A', label: '优秀' };
  if (total >= 60) return { grade: 'B', label: '及格' };
  if (total >= 40) return { grade: 'C', label: '勉强' };
  return { grade: 'D', label: '失败' };
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add js/score.js tests/score.test.js
git commit -m "feat: final score calculation with six dimensions"
```

---

## Task 10：游戏状态机

**Files:**
- Create: `js/engine.js`
- Test: `tests/engine.test.js`

- [ ] **Step 1: 编写测试**

```js
// tests/engine.test.js
import { describe, it, expect } from 'vitest';
import { createInitialState, advanceTurn, applyEventChoice, checkDeath } from '../js/engine.js';

const sampleOrigin = {
  role: 'cfo', regionTier: 'central_capital', businessType: 'infrastructure',
  healthLevel: 'medium', tag: 'leadership_change',
  platformName: '淮西市城投', directorName: '张明远',
  labels: { region: '中部省会', business: '基础设施', health: '一般', tag: '领导班子刚换' },
  challenges: ['c1', 'c2', 'c3'],
};

describe('createInitialState', () => {
  it('initializes year/quarter/policy/metrics', () => {
    const s = createInitialState(sampleOrigin);
    expect(s.year).toBe(2022);
    expect(s.quarter).toBe(1);
    expect(s.policyValue).toBe(-2);
    expect(s.metrics.cash).toBeGreaterThan(0);
    expect(s.actionsUsed).toBe(0);
    expect(s.survived).toBe(true);
  });
});

describe('advanceTurn', () => {
  it('advances quarter', () => {
    const s = createInitialState(sampleOrigin);
    const next = advanceTurn(s);
    expect(next.quarter).toBe(2);
  });

  it('rolls year on Q4->Q1', () => {
    const s = { ...createInitialState(sampleOrigin), quarter: 4 };
    const next = advanceTurn(s);
    expect(next.quarter).toBe(1);
    expect(next.year).toBe(2023);
  });

  it('settles maturing debt and ops cost', () => {
    const s = createInitialState(sampleOrigin);
    s.metrics.cash = 100;
    s.metrics.debtMaturity = [5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const next = advanceTurn(s);
    expect(next.metrics.cash).toBeLessThan(100);
  });
});

describe('checkDeath', () => {
  it('marks dead when cash <= 0', () => {
    const s = { metrics: { cash: 0 }, year: 2023, quarter: 1 };
    const result = checkDeath(s);
    expect(result.dead).toBe(true);
    expect(result.reason).toContain('现金');
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm test`
Expected: FAIL

- [ ] **Step 3: 实现engine.js**

```js
// js/engine.js
import { GAME_CONFIG } from './config.js';
import { ROLE_CFO, getInitialMetrics } from './roles.js';
import { driftPolicy, applyPolicyShift } from './policy.js';

export function createInitialState(origin) {
  return {
    origin,
    year: GAME_CONFIG.startYear,
    quarter: GAME_CONFIG.startQuarter,
    policyValue: GAME_CONFIG.policyAxisStart,
    metrics: getInitialMetrics(origin),
    score: {},
    actionsUsed: 0,
    quartersPassed: 0,
    survived: true,
    deathReason: null,
    history: [],          // [{year, quarter, snapshot}]
    eventLog: [],         // [{eventId, choiceIdx}]
    pendingEvent: null,
  };
}

export function advanceTurn(state) {
  // 1. 政策轴漂移（朝当前方向）
  const dir = state.policyValue < 0 ? 'tight' : (state.policyValue > 0 ? 'loose' : 'stable');
  let newPolicy = driftPolicy(state.policyValue, dir);

  // 2. 收入和到期债务结算
  let newMetrics = { ...state.metrics };
  const dueIdx = state.quartersPassed;  // 第几个季度
  if (dueIdx < newMetrics.debtMaturity.length) {
    const due = newMetrics.debtMaturity[dueIdx] || 0;
    newMetrics.cash = parseFloat((newMetrics.cash - due).toFixed(2));
  }
  // 运营成本扣减
  newMetrics.cash = parseFloat((newMetrics.cash - newMetrics.opCostRate).toFixed(2));
  // 项目缺口扣减
  newMetrics.cash = parseFloat((newMetrics.cash - newMetrics.projectGap).toFixed(2));
  // 经营现金流回血（少量）
  newMetrics.cash = parseFloat((newMetrics.cash + 1.2).toFixed(2));

  // 3. 季度推进
  let newQuarter = state.quarter + 1;
  let newYear = state.year;
  if (newQuarter > 4) { newQuarter = 1; newYear += 1; }

  // 4. 历史快照
  const newHistory = [...state.history, {
    year: state.year,
    quarter: state.quarter,
    cash: state.metrics.cash,
    leverageRatio: state.metrics.leverageRatio,
    financingCost: state.metrics.financingCost,
    policyValue: state.policyValue,
  }];

  return {
    ...state,
    year: newYear,
    quarter: newQuarter,
    policyValue: newPolicy,
    metrics: newMetrics,
    actionsUsed: 0,
    quartersPassed: state.quartersPassed + 1,
    history: newHistory,
  };
}

export function applyEventChoice(state, event, choiceIdx) {
  const choice = event.choices[choiceIdx];
  let newMetrics = { ...state.metrics };
  let newScore = { ...state.score };
  let newPolicy = state.policyValue;

  if (event.policyShift) {
    newPolicy = applyPolicyShift(newPolicy, event.policyShift);
  }

  Object.entries(choice.effects || {}).forEach(([key, val]) => {
    if (key.startsWith('score.')) {
      const dim = key.slice(6);
      newScore[dim] = (newScore[dim] || 0) + val;
    } else if (key === 'collateralRoom') {
      if (val === 'downgrade') newMetrics.collateralRoom = downgradeCollateral(newMetrics.collateralRoom);
      else if (val === 'upgrade') newMetrics.collateralRoom = upgradeCollateral(newMetrics.collateralRoom);
    } else if (key.startsWith('_')) {
      // 内部flag，跳过
    } else if (typeof val === 'number') {
      newMetrics[key] = parseFloat(((newMetrics[key] || 0) + val).toFixed(2));
    }
  });

  // 更新授信使用率
  if (newMetrics.creditTotal) {
    newMetrics.creditUsage = Math.round((newMetrics.creditUsed / newMetrics.creditTotal) * 100);
  }

  return {
    ...state,
    metrics: newMetrics,
    score: newScore,
    policyValue: newPolicy,
    eventLog: [...state.eventLog, { eventId: event.id, choiceIdx }],
  };
}

export function checkDeath(state) {
  for (const cond of ROLE_CFO.deathConditions) {
    const value = state.metrics[cond.metric];
    if (cond.op === '<=' && value <= cond.threshold) {
      return { dead: true, reason: cond.reason };
    }
    if (cond.op === '>=' && value >= cond.threshold) {
      return { dead: true, reason: cond.reason };
    }
  }
  return { dead: false };
}

export function isGameOver(state) {
  if (!state.survived) return { over: true, type: 'death' };
  if (state.quartersPassed >= GAME_CONFIG.totalQuarters) return { over: true, type: 'survived' };
  return { over: false };
}

function downgradeCollateral(level) {
  if (level === 'high') return 'medium';
  if (level === 'medium') return 'low';
  return 'low';
}
function upgradeCollateral(level) {
  if (level === 'low') return 'medium';
  if (level === 'medium') return 'high';
  return 'high';
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add js/engine.js tests/engine.test.js
git commit -m "feat: game state machine with turn loop and event application"
```

---

## Task 11：localStorage存档

**Files:**
- Create: `js/storage.js`

- [ ] **Step 1: 实现storage.js**

```js
// js/storage.js

const SAVE_KEY = 'bondGame_save';
const HISTORY_KEY = 'bondGame_history';

export function saveGame(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    console.warn('Save failed:', e);
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function clearSave() {
  localStorage.removeItem(SAVE_KEY);
}

export function pushHistoryRecord(record) {
  const history = getHistory();
  history.push({ ...record, savedAt: Date.now() });
  // 最多保留50条
  while (history.length > 50) history.shift();
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function getHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add js/storage.js
git commit -m "feat: localStorage save/load and history records"
```

---

## Task 12：CSS主题（Bloomberg暗色风）

**Files:**
- Create: `css/style.css`

- [ ] **Step 1: 写入完整CSS**

将原型文件 `界面原型cc_V0.1.html` 内的 `<style>` 内容提取并重组到 `css/style.css`。具体提取范围：

```
* 通用reset
* body和字体
* .nav
* .screen容器
* 命运卡相关：.fate-* 等所有类
* 主界面相关：.topbar, .main-grid, .panel, .metric, .event-card, .choice-btn, .action-slot, .chart-panel, .statusbar
* 危机界面相关：.crisis-*
* 图表辅助：.wf-chart, .wf-bar, .netval-line
* 终局界面（新增）：.endgame-container, .radar-card, .share-card
```

写入新文件 `css/style.css`，并在末尾追加：

```css
/* === 终局界面 === */
.endgame-container { max-width: 800px; margin: 30px auto; }
.endgame-header { text-align: center; margin-bottom: 30px; }
.endgame-grade { font-size: 96px; font-weight: 100; margin: 10px 0; }
.grade-S { color: #ffd54f; }
.grade-A { color: #81c784; }
.grade-B { color: #4fc3f7; }
.grade-C { color: #ffb74d; }
.grade-D { color: #ef5350; }
.endgame-status { font-size: 14px; color: #6a8aaa; }
.radar-card { background: #0f1623; border: 1px solid #1e2d47; border-radius: 8px; padding: 20px; margin-bottom: 16px; }
.endgame-actions { display: flex; gap: 12px; justify-content: center; margin-top: 24px; }
.btn-primary { padding: 12px 32px; background: #1565c0; border: none; border-radius: 6px; color: #e0eaf8; font-size: 13px; letter-spacing: 1px; cursor: pointer; }
.btn-secondary { padding: 12px 32px; background: transparent; border: 1px solid #1e3a5f; border-radius: 6px; color: #4fc3f7; font-size: 13px; cursor: pointer; }
```

- [ ] **Step 2: 提交**

```bash
git add css/style.css
git commit -m "feat: bloomberg dark theme CSS"
```

---

## Task 13：UI渲染层 - 命运卡

**Files:**
- Create: `js/ui.js`（先实现命运卡部分）

- [ ] **Step 1: 创建ui.js骨架与命运卡渲染**

```js
// js/ui.js

const REGION_LABELS = {
  east_core: '东部核心', central_capital: '中部省会',
  west_prefecture: '西部地级市', northeast_old: '东北老工业区'
};
const HEALTH_LABELS = { good: '财务健康', medium: '财务一般', weak: '财务承压' };

export function renderFateCard(origin, onAccept) {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="screen active">
      <div class="fate-container">
        <div class="fate-title">债市生存游戏</div>
        <div class="fate-subtitle">你的命运已定</div>
        <div class="fate-card">
          <div class="role-badge">角色 · 城投财务总监</div>
          <div class="role-name">${escapeHtml(origin.directorName)}</div>
          <div class="role-org">${escapeHtml(origin.platformName)}</div>
          <div class="fate-tags">
            <span class="tag tag-region">${origin.labels.region}</span>
            <span class="tag tag-type">${origin.labels.business}</span>
            <span class="tag tag-warn">⚠ ${origin.labels.tag}</span>
          </div>
          <div class="challenges">
            <div class="challenges-title">你这局的三大挑战</div>
            ${origin.challenges.map((c, i) => `
              <div class="challenge-item">
                <span class="challenge-num">0${i+1}</span>
                <span class="challenge-text">${escapeHtml(c)}</span>
              </div>
            `).join('')}
          </div>
          <button id="btn-accept-fate" class="start-btn">接受命运，开始游戏 →</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('btn-accept-fate').addEventListener('click', onAccept);
}

export function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
```

- [ ] **Step 2: 在index.html测试加载**

修改 `js/main.js`：

```js
// js/main.js
import { generateOrigin } from './origins.js';
import { renderFateCard } from './ui.js';

const origin = generateOrigin('cfo');
renderFateCard(origin, () => {
  alert('开始游戏（待实现主界面）');
});
```

Run: `npm run serve`，浏览器打开 `http://localhost:8080`
Expected: 命运卡正常显示，刷新会随机出新身份

- [ ] **Step 3: 提交**

```bash
git add js/ui.js js/main.js
git commit -m "feat: ui fate card rendering"
```

---

## Task 14：UI渲染层 - 主界面布局与指标面板

**Files:**
- Modify: `js/ui.js`（追加主界面渲染）

- [ ] **Step 1: 追加主界面渲染函数**

在 `js/ui.js` 末尾追加：

```js
export function renderMainScreen(state, callbacks) {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="screen active">
      ${renderTopBar(state)}
      <div class="main-grid">
        <div>${renderMetricsPanel(state)}${renderActionPanel(state)}</div>
        <div class="event-area" id="event-area">${renderEventArea(state)}</div>
        <div id="chart-area">${renderChartArea(state)}</div>
      </div>
      ${renderStatusBar(state)}
    </div>
  `;
  bindMainScreenEvents(state, callbacks);
}

function renderTopBar(state) {
  const policyPct = ((state.policyValue + 5) / 10) * 100;
  const policyLabel = getPolicyLabelText(state.policyValue);
  return `
    <div class="topbar">
      <div class="topbar-left">
        <span class="game-id">债市生存 · 财务总监</span>
        <span class="quarter-badge">${state.year}年 Q${state.quarter}</span>
        <div class="policy-axis">
          <span class="policy-label">政策环境</span>
          <div class="axis-track">
            <div class="axis-fill" style="width:100%"></div>
            <div class="axis-marker" style="left:${policyPct}%"></div>
          </div>
          <span class="policy-status">${policyLabel}</span>
        </div>
      </div>
      <span class="timer">剩余操作：${2 - state.actionsUsed}次 / 本回合</span>
    </div>
  `;
}

function getPolicyLabelText(value) {
  if (value <= -3) return '严格 ↓↓';
  if (value <= -1) return '偏紧 ↓';
  if (value === 0) return '中性 —';
  if (value <= 2) return '偏松 ↑';
  return '宽松 ↑↑';
}

function renderMetricsPanel(state) {
  const m = state.metrics;
  return `
    <div class="panel">
      <div class="panel-title">核心指标</div>
      ${metricRow('现金余量', m.cash.toFixed(1) + '亿', cashColor(m.cash), Math.min(100, m.cash * 10))}
      ${metricRow('资产负债率', m.leverageRatio.toFixed(1) + '%', levColor(m.leverageRatio), m.leverageRatio)}
      ${metricRow('授信使用率', m.creditUsage + '%', creditColor(m.creditUsage), m.creditUsage)}
      ${metricRow('综合融资成本', m.financingCost.toFixed(2) + '%', costColor(m.financingCost), Math.min(100, m.financingCost * 10))}
      ${metricRow('抵押物剩余', collLabel(m.collateralRoom), collColor(m.collateralRoom), collValue(m.collateralRoom))}
      <div class="metric">
        <div class="metric-row">
          <span class="metric-name">项目投资缺口</span>
          <span class="metric-value val-bad">-${m.projectGap.toFixed(1)}亿/季</span>
        </div>
      </div>
    </div>
  `;
}

function metricRow(name, valueText, valClass, barPct) {
  let barClass = 'bar-green';
  if (barPct >= 70) barClass = 'bar-red';
  else if (barPct >= 50) barClass = 'bar-yellow';
  return `
    <div class="metric">
      <div class="metric-row">
        <span class="metric-name">${name}</span>
        <span class="metric-value ${valClass}">${valueText}</span>
      </div>
      <div class="metric-bar"><div class="metric-bar-fill ${barClass}" style="width:${Math.min(100,barPct)}%"></div></div>
    </div>
  `;
}

function cashColor(v) { return v < 2 ? 'val-bad' : (v < 5 ? 'val-warn' : 'val-ok'); }
function levColor(v) { return v >= 75 ? 'val-bad' : (v >= 65 ? 'val-warn' : 'val-ok'); }
function creditColor(v) { return v >= 85 ? 'val-bad' : (v >= 70 ? 'val-warn' : 'val-ok'); }
function costColor(v) { return v >= 7 ? 'val-bad' : (v >= 6 ? 'val-warn' : 'val-ok'); }
function collColor(v) { return v === 'low' ? 'val-bad' : (v === 'medium' ? 'val-warn' : 'val-ok'); }
function collLabel(v) { return v === 'high' ? '充足' : (v === 'medium' ? '中等' : '紧张'); }
function collValue(v) { return v === 'high' ? 25 : (v === 'medium' ? 60 : 90); }
```

- [ ] **Step 2: 提交**

```bash
git add js/ui.js
git commit -m "feat: ui main screen layout and metrics panel"
```

---

## Task 15：UI渲染层 - 事件区与操作区

**Files:**
- Modify: `js/ui.js`

- [ ] **Step 1: 追加事件区和操作区**

在 `js/ui.js` 末尾追加：

```js
function renderEventArea(state) {
  if (!state.pendingEvent) {
    return `<div class="event-card"><div class="event-type">本回合无主线事件</div>
            <div class="event-body">你可以使用主动操作或直接结束本季度。</div></div>`;
  }
  const e = state.pendingEvent;
  const isMain = e.id.startsWith('main_');
  return `
    <div class="event-card">
      <div class="event-type">${isMain ? '📌 主线事件' : '📎 支线事件'} · ${state.year} Q${state.quarter}</div>
      <div class="event-title">${escapeHtml(e.title)}</div>
      <div class="event-body">${escapeHtml(e.body).replace(/\n/g, '<br>')}</div>
      <div class="event-choices">
        ${e.choices.map((c, i) => `
          <button class="choice-btn" data-choice-idx="${i}">
            <span class="choice-tag">[${String.fromCharCode(65+i)}]</span>${escapeHtml(c.label)}
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

function renderActionPanel(state) {
  // 在这里调用，假设CFO_ACTIONS和isActionAvailable通过callbacks注入
  return `
    <div class="panel" style="margin-top:14px">
      <div class="panel-title">主动操作</div>
      <div class="ops-remain">本回合剩余操作：<span style="color:#4fc3f7">${2 - state.actionsUsed}次</span></div>
      <div id="action-list"></div>
      <button id="btn-end-turn" class="end-turn-btn">结束本季度 →</button>
    </div>
  `;
}

export function bindMainScreenEvents(state, callbacks) {
  document.querySelectorAll('.choice-btn[data-choice-idx]').forEach(btn => {
    btn.addEventListener('click', () => {
      callbacks.onChoiceSelected(parseInt(btn.dataset.choiceIdx, 10));
    });
  });
  const endBtn = document.getElementById('btn-end-turn');
  if (endBtn) endBtn.addEventListener('click', callbacks.onEndTurn);

  // 渲染操作列表
  const actionList = document.getElementById('action-list');
  if (actionList && callbacks.actions) {
    actionList.innerHTML = callbacks.actions.map(a => {
      const avail = callbacks.isAvailable(a.id);
      const disabled = !avail.available || state.actionsUsed >= 2 || state.pendingEvent;
      return `
        <div class="action-slot" data-action-id="${a.id}" style="${disabled ? 'opacity:0.4;pointer-events:none' : ''}">
          <span class="action-name">${a.name}</span>
          <span class="action-cost">${avail.available ? '消耗1次' : avail.reason}</span>
        </div>
      `;
    }).join('');
    document.querySelectorAll('.action-slot[data-action-id]').forEach(slot => {
      slot.addEventListener('click', () => callbacks.onActionSelected(slot.dataset.actionId));
    });
  }
}

function renderStatusBar(state) {
  return `
    <div class="statusbar">
      <span class="status-item">目标：存活至 <span>2024年Q4</span></span>
      <span class="status-item">已过回合：<span>${state.quartersPassed}/12</span></span>
      <span class="status-item">政策环境：<span>${getPolicyLabelText(state.policyValue)}</span></span>
    </div>
  `;
}
```

- [ ] **Step 2: 提交**

```bash
git add js/ui.js
git commit -m "feat: ui event area and action panel"
```

---

## Task 16：图表层（债务瀑布 + 现金趋势）

**Files:**
- Create: `js/charts.js`
- Modify: `js/ui.js`（添加chart-area渲染）

- [ ] **Step 1: 实现charts.js**

```js
// js/charts.js
// 依赖全局 Chart（CDN引入）

let debtChart = null;
let cashChart = null;

export function renderDebtWaterfall(state) {
  const ctx = document.getElementById('chart-debt');
  if (!ctx) return;
  const labels = state.metrics.debtMaturity.map((_, i) => {
    const total = state.quartersPassed + i;
    const y = state.year + Math.floor((state.quarter - 1 + i) / 4);
    const q = ((state.quarter - 1 + i) % 4) + 1;
    return `Q${q}'${y.toString().slice(-2)}`;
  });
  const data = state.metrics.debtMaturity;
  const colors = data.map(v => v >= 6 ? '#ef5350' : (v >= 3 ? '#ffb74d' : '#81c784'));

  if (debtChart) debtChart.destroy();
  debtChart = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderRadius: 2 }] },
    options: {
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${ctx.parsed.y}亿` } } },
      scales: {
        x: { ticks: { color: '#4a6080', font: { size: 9 } }, grid: { display: false } },
        y: { ticks: { color: '#4a6080' }, grid: { color: '#1e2d47' } }
      },
      maintainAspectRatio: false,
    }
  });
}

export function renderCashTrend(state) {
  const ctx = document.getElementById('chart-cash');
  if (!ctx) return;
  const labels = state.history.map(h => `${h.year}Q${h.quarter}`);
  const data = state.history.map(h => h.cash);
  // 当前点
  labels.push(`${state.year}Q${state.quarter}`);
  data.push(state.metrics.cash);

  if (cashChart) cashChart.destroy();
  cashChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data,
        borderColor: '#4fc3f7',
        backgroundColor: 'rgba(79,195,247,0.15)',
        fill: true,
        tension: 0.3,
        pointRadius: 2,
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#4a6080' }, grid: { display: false } },
        y: { ticks: { color: '#4a6080' }, grid: { color: '#1e2d47' } }
      },
      maintainAspectRatio: false,
    }
  });
}

export function renderRadarChart(canvasId, dimensions) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  new Chart(ctx, {
    type: 'radar',
    data: {
      labels: Object.keys(dimensions),
      datasets: [{
        data: Object.values(dimensions),
        backgroundColor: 'rgba(79,195,247,0.2)',
        borderColor: '#4fc3f7',
        pointBackgroundColor: '#4fc3f7',
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        r: {
          min: 0, max: 100,
          ticks: { color: '#4a6080', backdropColor: 'transparent' },
          grid: { color: '#1e2d47' },
          angleLines: { color: '#1e2d47' },
          pointLabels: { color: '#8fa8c8', font: { size: 11 } }
        }
      },
      maintainAspectRatio: false,
    }
  });
}
```

- [ ] **Step 2: 修改ui.js的renderChartArea**

```js
function renderChartArea(state) {
  return `
    <div class="chart-panel">
      <div class="panel-title">债务到期瀑布图（亿）</div>
      <div style="height:90px"><canvas id="chart-debt"></canvas></div>
    </div>
    <div class="chart-panel">
      <div class="panel-title">现金余量走势（亿）</div>
      <div style="height:90px"><canvas id="chart-cash"></canvas></div>
    </div>
  `;
}
```

- [ ] **Step 3: 提交**

> 注：图表渲染调用在Task 20的main.js完整编排中统一接入，本任务只交付图表模块和HTML容器。

```bash
git add js/charts.js js/ui.js
git commit -m "feat: chart layer with debt waterfall and cash trend"
```

---

## Task 17：危机处置弹窗

**Files:**
- Modify: `js/ui.js`
- Modify: `js/engine.js`（添加危机检测）

- [ ] **Step 1: 在engine.js添加危机检测**

```js
// 追加到engine.js
export function detectCrisis(state) {
  const m = state.metrics;
  if (m.cash < 0.5 && state.quartersPassed < 11) {
    return {
      id: 'crisis_cash',
      title: '资金链危机：现金即将耗尽',
      body: `账面现金仅剩${m.cash.toFixed(2)}亿，下季度到期债务和运营成本无法覆盖。距离违约不足90天。`,
      metrics: [
        { label: '账面资金', value: `${m.cash.toFixed(2)}亿` },
        { label: '下季到期', value: `${(m.debtMaturity[state.quartersPassed] || 0).toFixed(1)}亿` },
        { label: '缺口', value: `-${Math.max(0, (m.debtMaturity[state.quartersPassed] || 0) - m.cash).toFixed(1)}亿` },
      ],
      options: [
        { label: '紧急向兄弟平台拆借', cost: '中', desc: '联系同区域兄弟城投拆借资金，利率8%，期限30天。', effects: { cash: 2.5, financingCost: 0.5, 'score.危机应对': 5 } },
        { label: '资产紧急变现', cost: '中高', desc: '出售停车场运营权，估值打折15%，能覆盖缺口。', effects: { cash: 2.0, collateralRoom: 'downgrade', 'score.危机应对': 3 } },
        { label: '向上级紧急汇报', cost: '低（不确定）', desc: '请求主管领导协调银行特批放款。成功率约40%。', effects: { _uncertain: 0.4, cash: 3.0, 'score.合规指数': 4 } },
      ]
    };
  }
  return null;
}
```

- [ ] **Step 2: 在ui.js添加renderCrisisModal**

```js
// 追加到ui.js
export function renderCrisisModal(crisis, onSelect) {
  const overlay = document.createElement('div');
  overlay.id = 'crisis-overlay';
  overlay.innerHTML = `
    <div class="screen active" style="position:fixed;inset:0;background:#0a0e1a;z-index:1000;overflow-y:auto;padding:20px">
      <div class="crisis-banner">⚠ 危机警报 · 时间暂停 · 必须处置后继续</div>
      <div class="crisis-center">
        <div class="crisis-card">
          <div class="crisis-title">${escapeHtml(crisis.title)}</div>
          <div class="crisis-body">${escapeHtml(crisis.body)}</div>
          <div class="crisis-metrics">
            ${crisis.metrics.map(m => `
              <div class="crisis-metric">
                <div class="crisis-metric-label">${m.label}</div>
                <div class="crisis-metric-value">${m.value}</div>
              </div>
            `).join('')}
          </div>
          <div class="crisis-options">
            ${crisis.options.map((o, i) => `
              <div class="crisis-option" data-opt-idx="${i}">
                <div class="crisis-option-header">
                  <span class="crisis-option-name">${escapeHtml(o.label)}</span>
                  <span class="crisis-option-cost cost-${costClass(o.cost)}">代价：${o.cost}</span>
                </div>
                <div class="crisis-option-desc">${escapeHtml(o.desc)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelectorAll('.crisis-option').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.optIdx, 10);
      overlay.remove();
      onSelect(crisis.options[idx]);
    });
  });
}

function costClass(cost) {
  if (cost.includes('高')) return 'high';
  if (cost.includes('中')) return 'med';
  return 'low';
}
```

- [ ] **Step 3: 提交**

```bash
git add js/ui.js js/engine.js
git commit -m "feat: crisis detection and modal handling"
```

---

## Task 18：终局界面与雷达图

**Files:**
- Modify: `js/ui.js`

- [ ] **Step 1: 追加终局渲染**

```js
// 追加到ui.js
import { renderRadarChart } from './charts.js';

export function renderEndScreen(state, finalScore, callbacks) {
  const app = document.getElementById('app');
  const gradeClass = `grade-${finalScore.grade.grade}`;
  app.innerHTML = `
    <div class="screen active">
      <div class="endgame-container">
        <div class="endgame-header">
          <div class="endgame-status">${state.survived ? '✓ 成功通关' : '✗ 中途失败：' + (state.deathReason || '未知原因')}</div>
          <div class="endgame-grade ${gradeClass}">${finalScore.grade.grade}</div>
          <div style="font-size:18px;color:#e0eaf8">${finalScore.grade.label}</div>
          <div style="font-size:32px;color:#4fc3f7;margin-top:8px">${finalScore.total}<span style="font-size:14px;color:#4a6080"> / 100</span></div>
          <div style="font-size:12px;color:#6a8aaa;margin-top:8px">${state.origin.platformName} · ${state.origin.directorName}</div>
          <div style="font-size:11px;color:#4a6080;margin-top:4px">存活 ${state.quartersPassed} / 12 季度</div>
        </div>

        <div class="radar-card">
          <div class="panel-title">六维评分</div>
          <div style="height:280px"><canvas id="chart-radar"></canvas></div>
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-top:14px">
            ${Object.entries(finalScore.dimensions).map(([k, v]) => `
              <div style="display:flex;justify-content:space-between;font-size:11px">
                <span style="color:#6a8aaa">${k}</span>
                <span style="color:${v>=70?'#81c784':v>=50?'#ffb74d':'#ef5350'}">${Math.round(v)}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="endgame-actions">
          <button id="btn-restart" class="btn-primary">再来一局</button>
          <button id="btn-share" class="btn-secondary">生成分享卡片</button>
        </div>
      </div>
    </div>
  `;
  requestAnimationFrame(() => renderRadarChart('chart-radar', finalScore.dimensions));
  document.getElementById('btn-restart').addEventListener('click', callbacks.onRestart);
  document.getElementById('btn-share').addEventListener('click', () => callbacks.onShare(finalScore));
}
```

- [ ] **Step 2: 提交**

```bash
git add js/ui.js
git commit -m "feat: endgame screen with radar chart"
```

---

## Task 19：分享卡片生成

**Files:**
- Modify: `js/ui.js`

- [ ] **Step 1: 实现分享卡片**

使用Canvas绘制简单的分享图，追加到ui.js：

```js
export function generateShareCard(state, finalScore) {
  const canvas = document.createElement('canvas');
  canvas.width = 750;
  canvas.height = 1200;
  const ctx = canvas.getContext('2d');

  // 背景
  const grad = ctx.createLinearGradient(0, 0, 0, 1200);
  grad.addColorStop(0, '#0a0e1a');
  grad.addColorStop(1, '#0f1e35');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 750, 1200);

  // 顶部装饰条
  ctx.fillStyle = '#4fc3f7';
  ctx.fillRect(0, 0, 750, 4);

  // 标题
  ctx.fillStyle = '#e0eaf8';
  ctx.font = '300 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('债市生存游戏', 375, 90);
  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#6a8aaa';
  ctx.fillText('搞债 · 财务总监模式', 375, 120);

  // 评分大字
  ctx.font = '300 220px sans-serif';
  ctx.fillStyle = gradeColor(finalScore.grade.grade);
  ctx.fillText(finalScore.grade.grade, 375, 360);

  ctx.font = '24px sans-serif';
  ctx.fillStyle = '#e0eaf8';
  ctx.fillText(finalScore.grade.label, 375, 410);

  ctx.font = '60px sans-serif';
  ctx.fillStyle = '#4fc3f7';
  ctx.fillText(`${finalScore.total}`, 375, 490);
  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#6a8aaa';
  ctx.fillText('总分（满分100）', 375, 520);

  // 平台信息
  ctx.font = '18px sans-serif';
  ctx.fillStyle = '#8fa8c8';
  ctx.fillText(state.origin.platformName, 375, 580);
  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#6a8aaa';
  ctx.fillText(`${state.origin.labels.region} · ${state.origin.labels.business}`, 375, 610);

  // 状态
  ctx.font = '16px sans-serif';
  ctx.fillStyle = state.survived ? '#81c784' : '#ef5350';
  ctx.fillText(state.survived ? `✓ 成功存活 ${state.quartersPassed} 季度` : `✗ 第 ${state.quartersPassed} 季度失败`, 375, 660);

  // 六维分数列表
  ctx.textAlign = 'left';
  let y = 740;
  ctx.font = '14px sans-serif';
  Object.entries(finalScore.dimensions).forEach(([k, v]) => {
    ctx.fillStyle = '#6a8aaa';
    ctx.fillText(k, 100, y);
    ctx.fillStyle = v >= 70 ? '#81c784' : (v >= 50 ? '#ffb74d' : '#ef5350');
    ctx.textAlign = 'right';
    ctx.fillText(Math.round(v), 650, y);
    ctx.textAlign = 'left';
    // 进度条
    ctx.fillStyle = '#1e2d47';
    ctx.fillRect(100, y + 8, 550, 4);
    ctx.fillStyle = v >= 70 ? '#81c784' : (v >= 50 ? '#ffb74d' : '#ef5350');
    ctx.fillRect(100, y + 8, 550 * v / 100, 4);
    y += 50;
  });

  // 底部水印
  ctx.fillStyle = '#4a6080';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('搞债公众号出品 · 长按识别打开游戏', 375, 1150);

  // 输出图片
  return canvas.toDataURL('image/png');
}

function gradeColor(g) {
  return { S: '#ffd54f', A: '#81c784', B: '#4fc3f7', C: '#ffb74d', D: '#ef5350' }[g] || '#4fc3f7';
}

export function downloadShareCard(dataUrl, filename) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}
```

- [ ] **Step 2: 提交**

```bash
git add js/ui.js
git commit -m "feat: share card generation via canvas"
```

---

## Task 20：主流程编排（main.js完整）

**Files:**
- Modify: `js/main.js`

- [ ] **Step 1: 编写完整main.js**

```js
// js/main.js
import { generateOrigin } from './origins.js';
import { createInitialState, advanceTurn, applyEventChoice, checkDeath, isGameOver, detectCrisis } from './engine.js';
import { findMainEvent, sampleRandomEvents, getPolicyDirection, loadEvents } from './eventEngine.js';
import { CFO_ACTIONS, applyAction, isActionAvailable } from './actions.js';
import { computeFinalScore } from './score.js';
import { saveGame, loadGame, clearSave, pushHistoryRecord } from './storage.js';
import { renderFateCard, renderMainScreen, renderCrisisModal, renderEndScreen, generateShareCard, downloadShareCard } from './ui.js';
import { renderDebtWaterfall, renderCashTrend } from './charts.js';

let state = null;
let eventData = null;

async function init() {
  eventData = await loadEvents();
  const saved = loadGame();
  if (saved && confirm('发现存档，是否继续？')) {
    state = saved;
    if (state.survived && state.quartersPassed < 12) {
      enterMainScreen();
    } else {
      enterEndScreen();
    }
  } else {
    clearSave();
    startNewGame();
  }
}

function startNewGame() {
  const origin = generateOrigin('cfo');
  state = createInitialState(origin);
  // 触发首回合事件
  loadCurrentTurnEvent();
  renderFateCard(origin, () => {
    enterMainScreen();
  });
}

function loadCurrentTurnEvent() {
  const main = findMainEvent(eventData.main, state.year, state.quarter);
  if (main) {
    state.pendingEvent = main;
  } else {
    const dir = getPolicyDirection(state.policyValue);
    const sampled = sampleRandomEvents(eventData.random, dir, { min: 1, max: 1 });
    state.pendingEvent = sampled[0] || null;
  }
}

function enterMainScreen() {
  // 危机检测
  const crisis = detectCrisis(state);
  if (crisis) {
    renderCrisisModal(crisis, (option) => handleCrisisChoice(option));
    return;
  }

  renderMainScreen(state, {
    actions: CFO_ACTIONS,
    isAvailable: id => isActionAvailable(state, id),
    onChoiceSelected: handleEventChoice,
    onActionSelected: handleActionSelected,
    onEndTurn: handleEndTurn,
  });

  requestAnimationFrame(() => {
    renderDebtWaterfall(state);
    renderCashTrend(state);
  });

  saveGame(state);
}

function handleEventChoice(idx) {
  state = applyEventChoice(state, state.pendingEvent, idx);
  state.pendingEvent = null;
  enterMainScreen();
}

function handleActionSelected(actionId) {
  const action = CFO_ACTIONS.find(a => a.id === actionId);
  const params = {};
  action.params.forEach(p => {
    const input = prompt(`${p.label}（${p.min}-${p.max}）`, p.default);
    if (input === null) return;
    params[p.key] = parseFloat(input);
  });
  if (Object.keys(params).length === 0) return;
  state = applyAction(state, actionId, params);
  enterMainScreen();
}

function handleCrisisChoice(option) {
  // 不确定性处理
  let success = true;
  if (option.effects._uncertain !== undefined) {
    success = Math.random() < option.effects._uncertain;
  }
  if (success) {
    Object.entries(option.effects).forEach(([k, v]) => {
      if (k.startsWith('_')) return;
      if (k.startsWith('score.')) {
        const dim = k.slice(6);
        state.score[dim] = (state.score[dim] || 0) + v;
      } else if (k === 'collateralRoom' && v === 'downgrade') {
        state.metrics.collateralRoom = state.metrics.collateralRoom === 'high' ? 'medium' : 'low';
      } else if (typeof v === 'number') {
        state.metrics[k] = parseFloat(((state.metrics[k] || 0) + v).toFixed(2));
      }
    });
    alert('处置成功');
  } else {
    alert('处置失败，未能解决问题');
  }
  enterMainScreen();
}

function handleEndTurn() {
  // 检查死亡
  const death = checkDeath(state);
  if (death.dead) {
    state.survived = false;
    state.deathReason = death.reason;
    enterEndScreen();
    return;
  }

  // 推进回合
  state = advanceTurn(state);

  // 二次死亡检查
  const death2 = checkDeath(state);
  if (death2.dead) {
    state.survived = false;
    state.deathReason = death2.reason;
    enterEndScreen();
    return;
  }

  // 游戏结束检查
  const over = isGameOver(state);
  if (over.over) {
    enterEndScreen();
    return;
  }

  // 加载下回合事件
  loadCurrentTurnEvent();
  enterMainScreen();
}

function enterEndScreen() {
  const finalScore = computeFinalScore(state);
  pushHistoryRecord({
    platformName: state.origin.platformName,
    score: finalScore.total,
    grade: finalScore.grade.grade,
    survived: state.survived,
    quartersPassed: state.quartersPassed,
  });
  clearSave();
  renderEndScreen(state, finalScore, {
    onRestart: () => { state = null; startNewGame(); },
    onShare: (fs) => {
      const dataUrl = generateShareCard(state, fs);
      downloadShareCard(dataUrl, `债市生存_${state.origin.directorName}_${fs.grade.grade}.png`);
    },
  });
}

init();
```

- [ ] **Step 2: 浏览器测试完整流程**

Run: `npm run serve`
打开 `http://localhost:8080`

**手动验证清单：**
- [ ] 命运卡正常显示，含三大挑战
- [ ] 点击"接受命运"进入主界面
- [ ] 主界面显示Q1 2022主线事件
- [ ] 选择事件选项后，指标变化
- [ ] 主动操作可执行，每回合最多2次
- [ ] 结束季度后推进到下一季度
- [ ] 图表实时更新
- [ ] 现金过低触发危机弹窗
- [ ] 通关或失败进入终局界面
- [ ] 终局雷达图显示六维评分
- [ ] 分享卡片可下载

- [ ] **Step 3: 提交**

```bash
git add js/main.js
git commit -m "feat: full game flow integration"
```

---

## Task 21：README与部署说明

**Files:**
- Modify: `README.md`

- [ ] **Step 1: 写入README**

```markdown
# 债市生存游戏

面向债券市场从业者和读者的城投生存模拟游戏。玩家随机扮演财务总监，在2022-2024化债背景下，通过决策活过3年。

## 本地运行

```
npm install
npm test          # 运行测试
npm run serve     # 启动本地服务器
```

打开 `http://localhost:8080`

## 部署

纯静态站，将整个目录上传到任意HTTP服务器（nginx/Apache/CDN）即可。

**注意**：`content/*.json` 通过fetch加载，需要HTTP环境，不能用 `file://` 协议直接打开。

## 项目结构

详见 `docs/设计稿cc_V1.md` 和 `docs/实施计划Plan1_MVPcc_V1.md`

## 后续Plan

- Plan 2：Node.js排行榜后端
- Plan 3：投资经理 + 地方官员角色
- Plan 4：完整事件库扩展与平衡性调优
```

- [ ] **Step 2: 提交**

```bash
git add README.md
git commit -m "docs: add README"
```

---

## Self-Review Checklist

完成所有Task后，验证：

- [ ] **Spec覆盖**：单角色（财务总监）完整玩法、随机出身、政策轴、主线+随机事件、危机处置、六维评分、命运卡、终局界面、分享卡片、localStorage存档——全部实现
- [ ] **类型一致性**：metric名称（cash/leverageRatio等）跨文件一致；origin结构跨origins.js/roles.js/ui.js一致
- [ ] **占位符扫描**：无TODO/TBD，所有step都有完整代码
- [ ] **测试覆盖**：origins/policy/eventEngine/actions/score/engine/roles 各自有单元测试
- [ ] **手动验证**：浏览器跑通完整流程

---

## 下一步

完成本plan后，进入 Plan 2：Node.js排行榜后端 + 真实排行榜接入。
