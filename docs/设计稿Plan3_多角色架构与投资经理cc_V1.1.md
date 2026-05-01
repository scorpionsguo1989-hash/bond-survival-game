# 设计稿 Plan 3 · 多角色架构 + 投资经理角色（V1.1）

## 0. 元信息

- **作者**：Claude（designer）
- **版本**：V1.1（基于 V1 + Codex 评审反馈修订）
- **范围**：Plan 3（架构改造 + 投资经理上线）
- **不在范围**：地方官员（Plan 4）、综合调试与上线（Plan 5）
- **依赖**：Plan 1 + Plan 2 已完成

### 修订日志（V1 → V1.1）

| 编号 | V1 问题 | V1.1 修正 |
|---|---|---|
| R1 | schema 命名前后不一致（roleResponses vs roles） | 全文统一为 `roles` |
| R2 | "12 个事件"歧义（实际 23 个） | 明确：12 个季度 × 共 23 个主线事件，IM 全部补全 |
| R3 | POST /api/scores 缺向后兼容说明 | 增加：缺失 role 字段时默认 `cfo`，记日志 |
| R4 | `repo_leverage` 引用 leverage 但指标表无该项 | 7 → 8 个核心指标，新增 `leverage`（回购杠杆率） |
| R5 | IM 评分维度沿用 CFO 标签不对味 | 评分维度内部 key 共享，每角色独立 `dimensionLabels` 显示 |
| R6 | 命运卡随机分配缺 onboarding | 新增 §3.10：命运卡必须含胜利条件/风险预告/首推操作 |
| R7 | 赎回压力机制只在文档不在 UI | 新增 §3.11：可视化要求（压力条/预期赎回量/缺口预警） |
| R8 | CFO/IM 主界面骨架可能漂移 | §3.7 强化"骨架完全相同"原则，仅替换内容卡 |
| R9 | 4 天预估过乐观 | 调整为 **6 天**，拆为 Plan 3A（架构 3 天）+ Plan 3B（IM 实装 3 天） |
| R10 | T9 IM 事件文案被低估 | 升级为"教学设计"：每事件标注教学目标（久期/信用下沉/流动性/估值回撤/客户行为） |
| R11 | T11 仅手动测试不够 | 增加 4 个确定性场景测试（基线/赎回/集中度/政策收紧）+ 5 局手动 |

---

## 1. 决策回顾

| 编号 | 决策 | 影响 |
|---|---|---|
| Q1 | 角色随机分配，无玩家选角色界面 | 命运卡前不加选择 UI；`generateOrigin()` 内部随机 roleId |
| Q2 | 总榜 + 角色筛选 | DB 加 `role` 字段；leaderboard API 加可选 `?role=` 参数 |
| Q3 | 共享事件，每个角色看到不同视角与选项 | mainEvents schema 重构为 **`roles`** 嵌套结构（统一命名） |
| Q4 | 先做投资经理 | Plan 3 = 架构 + IM；GOV 留 Plan 4 |

---

## 2. 总体架构改造

### 2.1 目标

- 让"角色"成为运行时注入的策略对象，引擎不知道任何角色细节
- 现有 CFO 玩法 100% 兼容（架构改造后，CFO 测试全过）
- 新增 IM 角色对引擎是"零侵入"——只加文件，不改引擎

### 2.2 新文件结构

```
js/
  roles/
    index.js              # ROLE_REGISTRY = { cfo, im }；getRole(id) 等工具
    cfo.js                # 当前 roles.js + actions.js 的 CFO 部分迁移过来
    im.js                 # 投资经理（新建）
  origins/
    index.js              # generateOrigin(roleId) 路由
    cfoOrigin.js          # 当前 origins.js 迁移
    imOrigin.js           # IM 命运卡随机
  engine.js               # 改造为角色驱动
  ui/
    index.js              # 现有 ui.js 拆分入口
    fateCard.js           # 命运卡渲染（按角色分发）
    mainScreenCFO.js      # CFO 指标卡 + 图表
    mainScreenIM.js       # IM 指标卡 + 图表
    mainScreenShell.js    # 主界面骨架（topbar/事件卡/操作卡——所有角色共用）
    endScreen.js          # 终局通用
    leaderboard.js        # 排行榜（含角色筛选）
    nicknamePrompt.js     # 昵称弹窗
content/
  mainEvents.json         # 改 schema：roles 嵌套（应用于全部 23 个事件）
  randomEvents.json       # 同 mainEvents：roles 嵌套；通用事件三角色同享
  randomEventsIM.json     # 投资经理专属随机事件（schema 仍含 roles 但只填 im）
api/
  db.js                   # scores 表加 role 字段；getTopScores 支持 role 过滤
  validate.js             # 校验 role 字段（缺失时默认 cfo）
  server.js               # /api/leaderboard 支持 ?role= 查询
```

> ui.js 拆分是 Plan 3 必做项（不再可选），否则 IM 加进来会突破 1100 行。

### 2.3 角色注册表 Schema

每个角色模块导出统一接口：

```js
// js/roles/cfo.js (示例)
export const ROLE_CFO = {
  // —— 元数据 ——
  id: 'cfo',
  name: '城投财务总监',
  shortName: '财务总监',
  description: '...',

  // —— 数据定义 ——
  metrics: ['cash', 'debtMaturity', ...],
  metricLabels: { cash: '现金余量', ... },
  metricFormatters: { cash: v => `${v}亿`, ... },
  deathConditions: [
    { metric: 'cash', op: '<=', threshold: 0, reason: '现金归零，资金链断裂' },
  ],
  scoreWeights: {
    liquidity: 1.0, costControl: 1.0, projectProgress: 1.0,
    compliance: 1.0, crisisResponse: 1.0, development: 1.0,
  },
  // R5：每角色独立的维度显示标签（内部 key 共享，UI 标签不同）
  dimensionLabels: {
    liquidity: '流动性管理',
    costControl: '融资成本控制',
    projectProgress: '项目推进',
    compliance: '合规指数',
    crisisResponse: '危机应对',
    development: '综合发展',
  },

  // —— 操作定义 ——
  actions: [
    { id: 'bank_loan', name: '申请银行续贷', ... },
    ...
  ],

  // —— 引擎钩子（纯函数） ——
  getInitialMetrics(profile),
  advanceTurn(state),                  // 季度结算（债务/运营/收入），不含死亡判定
  applyActionEffects(state, id, params),
  isActionAvailable(state, actionId),
  detectCrisis(state),                 // 该角色独有的危机条件
  formatMetricsForUI(state),           // 主界面指标卡片所需数据
  getOnboardingHints(profile),         // R6：命运卡 onboarding 文案（见 §3.10）
};
```

### 2.4 Engine 改造

`engine.js` 不再 import 任何角色模块，只通过 `state.role`（运行时注入的注册表对象）调用钩子。

```js
// engine.js 改造后核心
export function createInitialState(origin) {
  const role = getRole(origin.roleId);
  return {
    origin,
    role,                                // ← 注入
    year: ..., quarter: ...,
    policyValue: ...,
    metrics: role.getInitialMetrics(origin),
    score: {},
    // ...
  };
}

export function advanceTurn(state) {
  // 1. 政策漂移（共享逻辑）
  let newPolicy = driftPolicy(state.policyValue, dir);
  // 2. 角色独有的季度结算（注入）
  let { metrics, score } = state.role.advanceTurn(state);
  // 3. 通用收尾（quarter++、history snapshot）
  return { ...state, metrics, score, policyValue: newPolicy, ... };
}

export function checkDeath(state) {
  // 通用：跑角色定义的 deathConditions
  for (const c of state.role.deathConditions) {
    if (compare(state.metrics[c.metric], c.op, c.threshold)) {
      return { dead: true, reason: c.reason };
    }
  }
  return { dead: false };
}
```

> `state.role` 不进存档（`storage.js` 序列化时剔除，反序列化时按 `state.origin.roleId` 重新注入）。

### 2.5 事件 Schema 改造（Q3 决策落地）

#### 2.5.1 旧 schema（CFO-only）

```json
{
  "id": "main_2022_q1_a",
  "trigger": { "year": 2022, "quarter": 1 },
  "title": "银行收紧城投贷款额度",
  "body": "...",
  "policyShift": -1,
  "choices": [{ "label": "...", "effects": {...} }, ...]
}
```

#### 2.5.2 新 schema（多角色共享）

```json
{
  "id": "main_2022_q1_a",
  "trigger": { "year": 2022, "quarter": 1 },
  "title": "银行收紧城投贷款额度",
  "policyShift": -1,
  "roles": {
    "cfo": {
      "body": "监管窗口指导下发，主开户行通知现有授信续做需总行审批...",
      "choices": [
        { "label": "启动备用银行授信申请", "effects": { "cash": -0.5, "creditUsed": -1.5, "score.compliance": 5 } }
      ]
    },
    "im": {
      "body": "央行窗口指导信号传出，城投融资环境恶化预期升温...",
      "choices": [
        { "label": "立即减仓 AA 及以下城投债", "effects": { "cashRatio": +1.5, "creditExposure": -10, "score.crisisResponse": 5 } },
        { "label": "等市场恐慌时博反转", "effects": { "score.development": -3, "_uncertainty": 0.4, "_uncertainOnFail": { "nav": -0.03 }, "_uncertainOnSuccess": { "nav": +0.02 } } },
        { "label": "增持高评级城投债，赌'结构性宽松'", "effects": { "creditExposure": +5, "concentration": +3 } }
      ]
    }
  }
}
```

> **R2 澄清**：Plan 1 已将主线事件扩到 **23 个**（覆盖 12 个季度，每季度 1-2 个事件）。Plan 3 必须给全部 23 个事件补 IM 视角的 `roles.im`。Plan 4 时再给所有事件加上 `roles.gov`。  
> **R5 注意**：`score.<key>` 中的 key 用内部 English（`compliance`/`crisisResponse`/...），UI 显示时由角色 `dimensionLabels` 翻译。这样事件文件与角色解耦。

#### 2.5.3 加载/筛选

```js
// eventEngine.js
export function findMainEvent(mainEvents, year, quarter, roleId) {
  const matching = mainEvents.filter(e =>
    e.trigger.year === year &&
    e.trigger.quarter === quarter &&
    e.roles[roleId]
  );
  if (matching.length === 0) return null;
  const event = matching[Math.floor(Math.random() * matching.length)];
  // 拍平为该角色专属事件返回
  return {
    id: event.id,
    title: event.title,
    body: event.roles[roleId].body,
    choices: event.roles[roleId].choices,
    policyShift: event.policyShift,
  };
}
```

引擎/UI 后续看到的是"拍平后"的单角色事件，零改动。

### 2.6 排行榜改造（Q2 决策落地）

#### 2.6.1 DB Schema

```sql
ALTER TABLE scores ADD COLUMN role TEXT NOT NULL DEFAULT 'cfo';
CREATE INDEX idx_scores_role_score ON scores(role, score DESC);
```

> 兼容历史数据：旧记录默认 `role='cfo'`。

#### 2.6.2 API（含 R3 向后兼容）

```
GET  /api/leaderboard            → Top 20 总榜（不区分角色）
GET  /api/leaderboard?role=im    → Top 20 IM 榜（角色过滤）
GET  /api/leaderboard?role=cfo   → Top 20 CFO 榜
GET  /api/rank?score=N           → 总榜排名
GET  /api/rank?score=N&role=cfo  → 该角色榜内排名
POST /api/scores                 → body 含 role 字段（推荐必填）
```

**POST 向后兼容规则**：
- body 含 `role` 字段（`cfo` / `im` / `gov`）→ 正常处理
- body **缺 role 字段** → `validate.js` 默认填 `cfo`，并在 `server.js` 打印 `[BC-FALLBACK]` warning 日志
- body 含非法 role 值 → 返回 400 `invalid role`

> 这样旧版前端（Plan 2 时代）继续工作，只是默认归到 CFO 榜。

#### 2.6.3 UI

排行榜弹窗顶部加角色筛选 tab：`[全部] [财务总监] [投资经理]`，切换时重新拉取 API。
默认 tab：`全部`。

---

## 3. 投资经理角色完整设计

### 3.1 命运卡随机维度

| 维度 | 选项 | 难度分 |
|---|---|---|
| 机构类型 | 银行理财（资金量大但保守） / 公募基金（净值压力大）/ 保险资管（久期长但灵活差）/ 私募基金（灵活但客户少） | 4/6/5/7 |
| 管理规模 | 大（500亿+，子弹多但考核严）/ 中（100-500亿）/ 小（<100亿，灵活但赎回脆弱） | 5/4/7 |
| 持仓健康度 | 干净 / 有 1-2 个问题券 / 重仓弱资质主体 | 3/5/8 |
| 特殊标签 | 新发产品建仓期 / 大额赎回压力中 / 刚经历净值回撤 / 明星基金经理光环 / 机构客户集中度高 / 即将考核节点 | 4/7/6/3/6/5 |

挑战分目标区间：**16-26**（与 CFO 持平）。

### 3.2 8 个核心指标（R4：补 leverage）

| Metric Key | 中文 | 单位 | 初始范围 | 死亡线 | 备注 |
|---|---|---|---|---|---|
| `nav` | 组合净值 | - | 1.0 (初始锚定) | ≤ 0.85 | 跌穿预警线 = 死 |
| `aum` | 持仓总规模 | 亿 | 50-500（按机构规模） | - | 影响赎回绝对量 |
| `cashRatio` | 现金比例 | % | 8-15 | < 0% 且当季有赎回 | 流动性挤兑死 |
| `duration` | 组合久期 | 年 | 1.5-4.0 | - | 政策紧时拉久期挨揍 |
| `concentration` | 最大单券集中度 | % | 8-14 | > 25% 触发监管约谈 | 合规死 |
| `creditExposure` | AA 及以下占比 | % | 15-50（按健康度） | - | 政策紧时被动跌 |
| `redemptionPressure` | 赎回压力指数 | 0-100 | 0-30 | ≥ 80 触发挤兑 | 衍生死亡条件 |
| **`leverage`** | **回购杠杆率** | **%** | **100（无杠杆）** | **> 140%** | **回购操作直接放大此项；过高扣分+流动性恶化** |

### 3.3 5 个主动操作

| ID | 名称 | 效果（核心） | 政策依赖 |
|---|---|---|---|
| `buy_bond` | 买入债券 | `cashRatio -= amt`, `aum += amt`, `duration` 按选择微调，可选标的影响 `concentration`/`creditExposure` | 无 |
| `sell_bond` | 卖出债券 | `cashRatio += amt * (1 - 折损率)`, `aum -= amt`, 政策紧时折损 1-3% | 无 |
| `repo_leverage` | 回购加杠杆 | 短借现金加仓，`leverage += 5-15%`，硬上限 140%；超 140% 触发监管+流动性恶化 | 政策紧时回购利率上升 |
| `restructure` | 调整持仓结构 | 卖差券买好券，`creditExposure -= 5-10`，消耗 `cashRatio` 1-2% | 政策紧时买好券更贵 |
| `manage_expectation` | 管理客户预期 | `redemptionPressure -= 10-20`，`score.compliance -= 2`（"画饼"代价） | 无 |

### 3.4 死亡条件

```js
deathConditions: [
  { metric: 'nav',           op: '<=', threshold: 0.85, reason: '净值跌穿预警线，产品被迫清盘' },
  { metric: 'concentration', op: '>',  threshold: 25,   reason: '单券集中度超 25%，被监管约谈处罚' },
  { metric: 'leverage',      op: '>',  threshold: 140,  reason: '杠杆超 140% 触发监管强制降杠杆' },
],
// 复合条件（不进 deathConditions，由 detectCrisis 处理）：
// cashRatio < 0 && currentRedemption > 0 → 流动性挤兑死
// redemptionPressure >= 80 → 触发危机模态框，处理失败即死
```

### 3.5 季度自动结算公式（含 leverage 衰减）

```js
function advanceTurn(state) {
  const { policyValue, metrics } = state;
  let { nav, aum, cashRatio, duration, concentration, creditExposure, redemptionPressure, leverage } = metrics;

  // 1. NAV 漂移
  // 政策松+久期长 → 涨；政策紧+信用敞口高 → 跌；杠杆放大涨跌
  const policyContrib = policyValue * 0.003 * (duration / 3);
  const creditPenalty = (policyValue < 0 ? Math.abs(policyValue) : 0) * (creditExposure / 100) * 0.005;
  const baseYield = 0.012;  // 季度票息 1.2%（年化 ~5%）
  const leverageMultiplier = leverage / 100;  // 100% = 1.0; 140% = 1.4
  const navDelta = (baseYield + policyContrib - creditPenalty) * leverageMultiplier;
  nav = round(nav * (1 + navDelta), 4);

  // 2. 赎回压力漂移
  // NAV 跌 → 上升；NAV 涨 → 自然衰减
  const navMomentum = navDelta < 0 ? Math.abs(navDelta) * 800 : -5;
  const policyMomentum = policyValue < -2 ? 8 : 0;
  redemptionPressure = clamp(redemptionPressure + navMomentum + policyMomentum, 0, 100);

  // 3. 实际赎回执行（pressure >= 50 触发部分赎回）
  if (redemptionPressure >= 50) {
    const redeemRatio = (redemptionPressure - 40) / 200;  // 5% - 30%
    const redeemAmount = aum * redeemRatio;
    aum -= redeemAmount;
    cashRatio = ((cashRatio * (aum + redeemAmount) - redeemAmount * 100) / aum);  // 现金比例下降
  }

  // 4. 杠杆自然衰减（每季度 -2%，模拟回购到期）
  leverage = Math.max(100, leverage - 2);

  return { metrics: { nav, aum, cashRatio, duration, concentration, creditExposure, redemptionPressure, leverage }, score };
}
```

### 3.6 评分维度权重 + 显示标签（R5）

内部维度 key（6 个，全角色共用，便于事件文件解耦）：
`liquidity / costControl / projectProgress / compliance / crisisResponse / development`

每角色独立的显示标签：

| 内部 key | CFO 标签 | IM 标签（R5） | GOV 标签（Plan 4） |
|---|---|---|---|
| `liquidity` | 流动性管理 | 流动性管理 | 财政平衡 |
| `costControl` | 融资成本控制 | **收益管理** | 化债执行 |
| `projectProgress` | 项目推进 | **信用筛选** | 产业发展 |
| `compliance` | 合规指数 | 合规指数 | 政绩合规 |
| `crisisResponse` | 危机应对 | 危机应对 | 危机应对 |
| `development` | 综合发展 | **AUM 稳定性** | 综合发展 |

IM 评分权重：

```js
scoreWeights: {
  liquidity: 1.2,        // 赎回压力直接死
  costControl: 1.0,      // 收益（IM 视角下重要）
  projectProgress: 0.8,  // 信用筛选
  compliance: 1.4,       // 合规死亡风险高
  crisisResponse: 1.4,   // 赎回挤兑判定
  development: 1.0,      // AUM 稳定性
}
```

总评分 = `Σ(dim_score × weight) / Σ(weight)`，仍归一化到 0-100。

### 3.7 主界面 UI 改造（R8 强化骨架一致）

**核心原则：CFO/IM 主界面骨架完全相同，仅替换可视化内容卡。**

| 区域 | 是否角色相关 | 说明 |
|---|---|---|
| topbar（季度/政策轴/计时） | ❌ 完全共享 | `mainScreenShell.js` 渲染 |
| 左侧指标栏（容器、栅格、卡片样式） | ❌ 容器共享 / ✅ 内容按角色 | 容器样式、卡片数量、栅格间距完全一致 |
| 中央事件卡 | ❌ 完全共享 | 事件已拍平，UI 通用 |
| 右侧图表区（容器） | ❌ 容器共享 / ✅ 图表内容按角色 | 两个图表槽位 + 标题样式 |
| 主动操作卡 | ❌ 容器共享 / ✅ 按钮列表按角色 | 容器样式、按钮间距、cost 标记完全一致 |
| 底部 statusbar | ❌ 完全共享 | - |

**具体替换内容**：

| 区域 | CFO 内容 | IM 内容 |
|---|---|---|
| 左侧指标卡 | 现金/授信/杠杆/抵押物（4 个卡） | NAV/久期/集中度/赎回压力（4 个卡） |
| 右侧图表 1 | 债务到期柱状图 | 净值曲线 |
| 右侧图表 2 | 现金趋势折线 | 持仓结构饼图（评级分布） |
| 主动操作 | CFO_ACTIONS（5 个） | IM_ACTIONS（5 个） |

**实现**：

```js
// mainScreenShell.js（共享骨架）
export function renderMainScreen(state, callbacks) {
  renderTopbar(state);
  renderEventCard(state.pendingEvent, callbacks.onChoiceSelected);
  renderActionCard(state.role.actions, ...);  // 操作按钮按角色变化
  renderStatusbar(state);

  // 角色专属区块委托给角色子模块
  if (state.role.id === 'cfo') {
    renderCFOMetrics(state);
    renderCFOCharts(state);
  } else if (state.role.id === 'im') {
    renderIMMetrics(state);
    renderIMCharts(state);
  }
}
```

**严格约束**：
- 左侧指标卡片数量两角色都是 4 个（防止排版抖动）
- 右侧图表槽位两角色都是 2 个，高度一致
- 操作按钮数量两角色都是 5 个

### 3.8 主线事件 IM 视角（R10 升级为教学设计）

Plan 1 已落地 **23 个主线事件**（覆盖 12 季度，每季度 1-2 事件）。Plan 3 给全部 23 个补 IM 视角的 `roles.im`。

每个 IM 视角事件必须标注**教学目标**——告诉玩家这个事件想让你理解什么 bond market 概念：

| 教学目标 | 说明 |
|---|---|
| `duration` | 久期管理（拉/压久期的时机判断） |
| `credit_sinking` | 信用下沉（高 yield 高风险的取舍） |
| `liquidity` | 流动性管理（现金比例 vs 收益） |
| `valuation_drawdown` | 估值回撤（mark-to-market 的痛） |
| `client_behavior` | 客户行为（赎回潮 / 申购潮的应对） |
| `regulatory` | 监管约束（集中度/杠杆红线） |

12 季度时间轴（每季度 1-2 个事件，部分给出示例）：

| 时间 | 事件标题（示例） | 教学目标 | IM 视角冲击 |
|---|---|---|---|
| 2022 Q1 | 银行收紧城投贷款 | `valuation_drawdown` | 一二级利差走阔，AA 城投估值压力 |
| 2022 Q2 | 土地出让金下滑 | `credit_sinking` | 弱区域城投信用风险，是否减仓？ |
| 2022 Q3 | 地方隐债审计 | `valuation_drawdown` | 估值分化，部分主体停止报价 |
| 2022 Q4 | 年末资金面紧张 | `liquidity` + `regulatory` | 回购利率飙升，杠杆策略受挑战 |
| 2023 Q1 | 化债政策预期升温 | `credit_sinking` | 弱资质城投反弹，是否博弈？ |
| 2023 Q2 | 城投债务重组试点 | `valuation_drawdown` | 重组债损失？还是博 100% 兑付？ |
| 2023 Q3 | 一揽子化债方案落地 | `duration` | 赎回压力缓解，但 yield 下行 |
| 2023 Q4 | 年末机构集中赎回 | `client_behavior` + `liquidity` | 实测赎回压力 |
| 2024 Q1 | 非标全面收紧 | `regulatory` | 持仓非标占比影响净值 |
| 2024 Q2 | 经济数据复苏 | `duration` | 利率上行，久期受冲击 |
| 2024 Q3 | 地方债务置换扩容 | `credit_sinking` | 持仓置换收益锁定 |
| 2024 Q4 | 监管集中度新规 | `regulatory` | 单券 15% 上限强制执行 |

**T9 验收增强**：每个 IM 视角事件除了 body+choices，还需要在事件内附带 `teaching` 字段（仅文档元数据，UI 不展示），写明该事件预期教玩家什么概念。Implementation Plan 阶段填充。

### 3.9 IM 专属随机事件（10 个）

需新增（部分示例）：
- 持有的某 AAA 城投评级被下调到 AA+
- 客户大额申购，组合规模骤增 20%
- 基金业协会窗口指导：限制下沉评级
- 市场回购利率飙升到 5%
- 持仓某债券触发回售，提前回笼资金
- 同业基金净值暴跌引发市场恐慌
- 渠道方要求紧急压久期
- 某重仓券发生技术性违约
- 客户经理离职，机构客户出走
- 监管现场检查抽查到组合

通用随机事件（CFO/IM/GOV 共享）保留 10 个左右，schema 同 mainEvents 用 `roles` 嵌套。

### 3.10 命运卡 Onboarding 设计（R6 新增）

**问题**：角色完全随机分配，玩家如果第一次抽到 IM，可能完全不知道这个角色目标是什么、风险在哪。

**解法**：命运卡渲染时，除了原有的"角色身份 + 平台画像 + 三大挑战"信息，**新增 onboarding 卡片**：

```
┌─────────────────────────────────────────────┐
│ [角色徽章]  投资经理 · 公募基金              │
│                                              │
│ 🎯 本局目标                                  │
│   存活 12 季度，期末净值不跌穿 0.85          │
│                                              │
│ ⚠ 两大致命风险                                │
│   1. 净值跌穿 0.85 → 产品清盘                │
│   2. 单券集中度超 25% → 监管约谈             │
│                                              │
│ 💡 推荐首操作                                │
│   先卖出 1-2 亿弱资质券降信用敞口            │
│                                              │
│ [开始游戏]                                   │
└─────────────────────────────────────────────┘
```

**实现方式**：每个角色注册表里加 `getOnboardingHints(profile)` 钩子，返回：

```js
{
  goal: '存活 12 季度，期末净值不跌穿 0.85',
  topRisks: [
    '净值跌穿 0.85 → 产品清盘',
    '单券集中度超 25% → 监管约谈',
  ],
  firstActionHint: '先卖出 1-2 亿弱资质券降信用敞口',
}
```

`getOnboardingHints` 可以根据 profile（机构类型/规模/健康度）调整提示——例如"重仓弱资质主体"开局推荐先调结构，"明星基金经理"开局推荐稳着打。

**视觉**：onboarding 卡片样式与 fate-card 风格一致（深色卡 + 蓝色高亮），但标题区分明显（"本局目标 / 致命风险 / 推荐首操作" 三段标题）。

### 3.11 赎回压力 UI 可视化（R7 新增）

**问题**：赎回压力是 IM 角色的核心机制，但如果只是一个数字（0-100）或一个公式藏在引擎里，玩家无法理解：
- 为什么压力上升？
- 下季度会赎回多少？
- 我现在的现金够不够应付？
- 我做某个操作会怎么影响压力？

**UI 解决方案**：

#### 3.11.1 主界面常驻：赎回压力卡片

左侧指标栏中，赎回压力卡是 4 个卡之一，显示：

```
┌─────────────────────────────┐
│ 赎回压力指数            42   │
│ ▓▓▓▓▓▓▓▓▓░░░░░░░░░░ 42/100  │
│                              │
│ 🔮 下季预期赎回 ≈ 8.5 亿     │
│ 💰 当前现金     ≈ 6.2 亿     │
│ ⚠ 缺口 2.3 亿                │
└─────────────────────────────┘
```

- 顶部：当前压力数值 + 进度条（颜色按区间：0-30 绿 / 30-60 黄 / 60-80 橙 / 80+ 红）
- 中部：下季度按当前压力计算的预期赎回量（用引擎公式预测）
- 底部：现金 vs 预期赎回的差额，缺口为红字告警

#### 3.11.2 因果链解释（hover 浮窗）

当用户 hover 赎回压力卡片，弹出小浮窗：

```
赎回压力来自：
  • NAV 跌幅 (-1.2% 本季)        +12
  • 政策紧 (政策值 -3)            +8
  • 自然衰减                       -5
  ─────────────────────────────
  本季净增                        +15
```

让玩家理解"为什么压力变化"。

#### 3.11.3 操作选择影响预告

当用户在事件卡中 hover 某个选项，如果该选项会显著影响赎回压力，选项下方显示预告：

```
[选项] 立即减仓 AA 及以下城投债
       💡 预计：赎回压力 -8，现金 +1.5 亿
```

这是事件 effects 的可视化前置，让玩家不用读 JSON 就能预判后果。

#### 3.11.4 临界预警

当 `redemptionPressure >= 70`，主界面顶部弹出 banner（不阻塞游戏）：

```
⚠ 赎回压力接近挤兑临界值（≥80 触发挤兑），建议立即处理
```

---

## 4. 任务拆分总览（R9 拆为 3A + 3B，6 天）

### Plan 3A：架构改造 + CFO 回归（5 个 task / 3 天）

- **T1**：建 `js/roles/` 目录，迁移现有 CFO 代码（roles.js + actions.js → roles/cfo.js），添加 dimensionLabels
- **T2**：实现角色注册表 + `state.role` 注入；engine.js 改造为角色驱动；checkDeath 通用化；扩 engine 测试
- **T3**：mainEvents schema 升级（统一 `roles` 嵌套）+ 现有 23 个事件全部加上 `roles.cfo` 包装 + IM 视角加 stub 占位 + eventEngine.js 改造
- **T4**：DB schema 加 role 字段 + validate.js / server.js / api.js 适配（含 R3 向后兼容）+ 排行榜 UI 加角色筛选 tab
- **T5**：UI 拆分（`ui/` 目录）+ 命运卡按角色随机分发 + 实现 `getOnboardingHints` 在 CFO 上落地（R6）

**验收标准**：CFO 玩法 100% 不变，全量测试通过，命运卡含 onboarding 信息。

### Plan 3B：投资经理实装（6 个 task / 3 天）

- **T6**：roles/im.js 完整实现（8 个指标 / 5 个操作 / 钩子 / 死亡 / 公式）+ IM 模块单测 ≈12 个
- **T7**：origins/imOrigin.js（命运卡随机维度）+ 实现 IM 的 `getOnboardingHints`
- **T8**：mainScreenIM.js（IM 指标渲染）+ IM 专属图表（净值曲线、持仓饼图）+ 赎回压力可视化 UI（R7 §3.11 全部）
- **T9**：23 个主线事件 IM 视角文案（替换 stub）+ 每事件标注 `teaching` 字段（R10）
- **T10**：10 个 IM 专属随机事件 + 通用随机事件 schema 升级
- **T11**：IM 平衡性测试（R11：4 个确定性场景测试 + 5 局手动）

**确定性场景测试（T11 新增）**：

```js
// tests/im-scenarios.test.js
describe('IM scenario tests', () => {
  it('baseline: 中等机构 + 干净持仓 + 中性政策 → 通关', () => {...});
  it('redemption stress: 大额赎回压力中 + 政策收紧 → 死于挤兑或勉强通关', () => {...});
  it('high concentration: 重仓弱资质 + 不调整 → 死于集中度', () => {...});
  it('policy tightening: 持续政策紧 + 高信用敞口 → 死于净值穿线', () => {...});
});
```

每个场景固定输入（origin + 操作序列 + 政策走向），断言期望终局状态（death type / quartersPassed / NAV）。

**测试增量**：
- T2：roles 注册表 + engine 改造 → 引擎测试要扩到 IM 跑通（≈5 个新增）
- T6：IM 模块单测（≈12 个）
- T11：4 个场景测试
- 总测试数预期：57 → 78+

### 时间预估

| Plan | 内容 | 天数 |
|---|---|---|
| Plan 3A | 架构改造 + CFO 回归 | 3 天 |
| Plan 3B | IM 实装（含 UI/事件/测试） | 3 天 |
| **总计** | | **6 天** |

> Plan 3A 完成后即可发布"架构升级版"（玩家体验仍是 CFO 单角色，但代码已支持多角色）。  
> Plan 3B 完成后才有 IM 角色可玩。

---

## 5. 验收标准

### 5.1 Plan 3A（架构层）末验收
- [ ] `npm test` 全绿（含原 57 个 + 架构改造新增 ≈10 个）
- [ ] CFO 玩法走完一局，与改造前体感完全一致（命运卡含 onboarding 信息）
- [ ] mainEvents.json 中所有 23 个事件都有 `roles.cfo`，CFO 跑事件不报错
- [ ] 排行榜 API 兼容旧请求格式（不带 role 参数），返回所有角色总榜
- [ ] POST /api/scores 缺 role 字段时默认 cfo 并打日志

### 5.2 Plan 3B（IM 角色层）末验收
- [ ] IM 玩法可启动（命运卡正确显示 IM 角色徽章 + onboarding 信息）
- [ ] IM 可跑完 12 季度且能通关（手动测 5 局）
- [ ] IM 三种死亡场景可触发（净值穿线 / 集中度超限 / 杠杆超限 / 赎回挤兑各至少 1 次）
- [ ] 23 个主线事件 IM 视角文案全部就位，每个都有教学目标标注
- [ ] 4 个确定性场景测试通过
- [ ] 排行榜可按角色筛选，IM 成绩独立可查
- [ ] 赎回压力 UI 完整：压力卡 + 因果链浮窗 + 选项预告 + 临界 banner
- [ ] CFO 玩法不受任何破坏（回归测试）

### 5.3 工程标准
- [ ] 单文件不超过 500 行（ui.js 拆分后）
- [ ] roles/cfo.js 与 roles/im.js 接口一致（同样的 export shape）
- [ ] engine.js 不 import 任何具体角色模块
- [ ] 事件 JSON 中的 `score.<key>` 全部使用内部 English key（不写中文）

---

## 6. 风险与权衡（R11 增强）

| 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|
| schema 改造把现有 CFO 测试打挂 | 中 | 高 | T2-T3 严格 TDD，先扩测试再改代码；T3 完成后立即跑全量回归 |
| IM 平衡性难调（玩家 1-2 季度就死） | 高 | 中 | T11 留 0.5 天专门调参；公式留可调常量；4 场景测试给出可量化基准 |
| 23 个事件补 IM 视角文案工作量大 | 高 | 中 | T3 用占位 stub 解锁开发；T9 集中写文案，按教学目标分组写 |
| ui.js 拆分引入新 bug | 中 | 中 | T5 拆分时全量回归测试；保留原 ui.js 副本作为参照 |
| 客户端代码体积膨胀 | 低 | 低 | 后续按需引入 dynamic import |
| 赎回压力 UI 复杂度高（R7 4 个组件） | 中 | 中 | T8 留充分时间；可先做基础压力卡，后续迭代浮窗 |
| Onboarding 文案写得太"教科书" | 中 | 中 | onboarding 文案口语化（"先甩点 AA-，别盯着 yield"），由你最终 review |

---

## 7. 依赖与限制

- 不破坏 Plan 1/2 已交付能力（CFO 单角色完整可玩 + 排行榜后端）
- API 变更必须向后兼容（旧客户端不传 role 仍能用，默认归 cfo）
- 数据库迁移需要 zero-downtime（`ALTER TABLE` + 默认值）
- 所有事件 JSON 中 `score.<key>` 写内部 English key，不写中文

---

## 8. 后续 Plan 4/5 预留接口

Plan 3 完成后，Plan 4 加 GOV 角色只需：
- 新增 `js/roles/gov.js` + `js/origins/govOrigin.js` + `js/ui/mainScreenGOV.js`
- 给 mainEvents.json 所有 23 个事件补 `roles.gov`
- 写 GOV 23 个主线事件 IM 视角文案 + 10 个专属随机事件
- DB / API / 排行榜筛选无需改动（Plan 3 已支持任意 role）

Plan 5 综合调试只做：
- 跨角色平衡性
- 浏览器 12 步冒烟
- 服务器部署

---

**V1.1 修订完成。等你拍板：**
1. 这个 V1.1 是否照走？
2. 修订要点你是否都同意？
3. 是否进入 Implementation Plan 撰写？（不再走 Codex 二次评审，因为修订都是吸收 Codex 自己的反馈）
