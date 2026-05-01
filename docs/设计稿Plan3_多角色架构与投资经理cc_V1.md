# 设计稿 Plan 3 · 多角色架构 + 投资经理角色

## 0. 元信息

- **作者**：Claude（designer）
- **范围**：Plan 3（架构改造 + 投资经理上线）
- **不在范围**：地方官员（Plan 4）、综合调试与上线（Plan 5）
- **依赖**：Plan 1 + Plan 2 已完成

---

## 1. 决策回顾

| 编号 | 决策 | 影响 |
|---|---|---|
| Q1 | 角色随机分配，无玩家选角色界面 | 命运卡前不加选择 UI；`generateOrigin()` 内部随机 roleId |
| Q2 | 总榜 + 角色筛选 | DB 加 `role` 字段；leaderboard API 加可选 `?role=` 参数 |
| Q3 | 共享事件，每个角色看到不同视角与选项 | mainEvents schema 重构为 `roleResponses` 嵌套结构 |
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
    index.js              # 现有 ui.js 拆分入口（避免单文件膨胀）
    fateCard.js           # 命运卡渲染（按角色分发）
    mainScreenCFO.js      # CFO 主界面（保留原逻辑）
    mainScreenIM.js       # IM 主界面（持仓表/净值曲线）
    endScreen.js          # 终局通用
    leaderboard.js        # 排行榜（含角色筛选）
    nicknamePrompt.js     # 昵称弹窗
content/
  mainEvents.json         # 改 schema：roleResponses 嵌套
  randomEvents.json       # 加 role 字段（标识专属/通用）
  randomEventsIM.json     # 投资经理专属随机事件（可选拆分）
api/
  db.js                   # scores 表加 role 字段；getTopScores 支持 role 过滤
  validate.js             # 校验 role 字段
  server.js               # /api/leaderboard 支持 ?role= 查询
```

> 不强制拆分 ui.js 为多文件，但 IM/GOV 会让 ui.js 突破 1000 行——建议 Plan 3 顺手拆。

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
    '流动性管理': 1.0, '融资成本控制': 1.0, '项目推进': 1.0,
    '合规指数': 1.0, '危机应对': 1.0, '综合发展': 1.0,
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
        { "label": "启动备用银行授信申请", "effects": { "cash": -0.5, "creditUsed": -1.5, "score.合规指数": 5 } },
        ...
      ]
    },
    "im": {
      "body": "央行窗口指导信号传出，城投融资环境恶化预期升温。市场对城投债估值开始分化...",
      "choices": [
        { "label": "立即减仓 AA 及以下城投债", "effects": { "cash": +1.5, "creditExposure": -10, "score.危机应对": 5 } },
        { "label": "等市场恐慌时博反转", "effects": { "score.综合发展": -3, "_uncertainty": 0.4, "_uncertainOnFail": { "nav": -0.03 }, "_uncertainOnSuccess": { "nav": +0.02 } } },
        { "label": "增持高评级城投债，赌'结构性宽松'", "effects": { "creditExposure": +5, "concentration": +3 } }
      ]
    }
  }
}
```

> Plan 3 的 mainEvents.json 必须给 `cfo` + `im` **每个事件都补全两份 response**。  
> Plan 4 时再给所有事件加上 `gov`。

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

#### 2.6.2 API

```
GET /api/leaderboard           → Top 20 总榜
GET /api/leaderboard?role=im   → Top 20 IM 榜
GET /api/rank?score=N&role=cfo → 该角色榜内排名
POST /api/scores                → body 增加 role 字段（必填）
```

#### 2.6.3 UI

排行榜弹窗顶部加角色筛选 tab：`[全部] [财务总监] [投资经理]`，切换时重新拉取 API。

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

### 3.2 7 个核心指标

| Metric Key | 中文 | 单位 | 初始范围 | 死亡线 | 备注 |
|---|---|---|---|---|---|
| `nav` | 组合净值 | - | 1.0 (初始锚定) | ≤ 0.85 | 跌穿预警线 = 死 |
| `aum` | 持仓总规模 | 亿 | 50-500（按机构规模） | - | 影响赎回绝对量 |
| `cashRatio` | 现金比例 | % | 8-15 | < 0% 且当季有赎回 | 流动性挤兑死 |
| `duration` | 组合久期 | 年 | 1.5-4.0 | - | 政策紧时拉久期挨揍 |
| `concentration` | 最大单券集中度 | % | 8-14 | > 25% 触发监管约谈 | 合规死 |
| `creditExposure` | AA 及以下占比 | % | 15-50（按健康度） | - | 政策紧时被动跌 |
| `redemptionPressure` | 赎回压力指数 | 0-100 | 0-30 | ≥ 80 触发挤兑 | 衍生死亡条件 |

### 3.3 5 个主动操作

| ID | 名称 | 效果（核心） | 政策依赖 |
|---|---|---|---|
| `buy_bond` | 买入债券 | `cashRatio -= amt`, `aum += amt`, `duration` 按选择微调，可选标的影响 `concentration`/`creditExposure` | 无 |
| `sell_bond` | 卖出债券 | `cashRatio += amt * (1 - 折损率)`, `aum -= amt`, 政策紧时折损 1-3% | 无 |
| `repo_leverage` | 回购加杠杆 | 短借现金，`leverage += amt`，杠杆率上限 140%，超限制扣分 | 政策紧时回购利率上升 |
| `restructure` | 调整持仓结构 | 卖差券买好券，`creditExposure -= 5-10`，消耗 `cashRatio` 1-2% | 政策紧时买好券更贵 |
| `manage_expectation` | 管理客户预期 | `redemptionPressure -= 10-20`，`score.合规指数 -= 2`（"画饼"代价） | 无 |

### 3.4 死亡条件

```js
deathConditions: [
  { metric: 'nav', op: '<=', threshold: 0.85, reason: '净值跌穿预警线，产品被迫清盘' },
  { metric: 'concentration', op: '>', threshold: 25, reason: '单券集中度超 25%，被监管约谈处罚' },
],
// 复合条件（不进 deathConditions，由 detectCrisis 处理）：
// cashRatio < 0 && currentRedemption > 0 → 流动性挤兑死
// redemptionPressure >= 80 → 触发危机模态框，处理失败即死
```

### 3.5 季度自动结算公式

```
function advanceTurn(state) {
  const { policyValue, metrics } = state;
  let { nav, aum, cashRatio, duration, concentration, creditExposure, redemptionPressure } = metrics;

  // 1. NAV 漂移
  // 政策松+久期长 → 涨；政策紧+信用敞口高 → 跌
  const policyContrib = policyValue * 0.003 * (duration / 3);
  const creditPenalty = (policyValue < 0 ? Math.abs(policyValue) : 0) * (creditExposure / 100) * 0.005;
  const baseYield = 0.012;  // 季度票息 1.2%（年化 ~5%）
  const navDelta = baseYield + policyContrib - creditPenalty;
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

  // 4. 杠杆衰减（如果有回购仓位）
  // ...

  return { metrics: { nav, aum, cashRatio, duration, concentration, creditExposure, redemptionPressure }, score };
}
```

### 3.6 评分维度权重（IM）

```js
scoreWeights: {
  '流动性管理': 1.2,   // IM 流动性更重要（赎回直接死）
  '融资成本控制': 0.6, // IM 不直接融资
  '项目推进': 0.4,     // 弱化（IM 不投项目）
  '合规指数': 1.4,     // IM 合规死亡风险高
  '危机应对': 1.4,     // 赎回挤兑判定
  '综合发展': 1.0,     // 净值表现
}
```

总评分 = `Σ(dim_score × weight) / Σ(weight)`，仍归一化到 0-100。

### 3.7 主界面 UI 改造

CFO 主界面三栏（指标 / 事件 / 操作）保留，但**指标卡片**和**右侧图表**按角色重渲染：

| 区域 | CFO | IM |
|---|---|---|
| 左侧指标 | 现金/授信/杠杆/抵押物 | NAV/久期/集中度/赎回压力 |
| 中央事件 | 共享渲染（事件已拍平） | 共享渲染 |
| 右侧图表 1 | 债务到期柱状图 | 净值曲线 |
| 右侧图表 2 | 现金趋势折线 | 持仓结构饼图（评级分布） |
| 主动操作 | CFO_ACTIONS（5 个） | IM_ACTIONS（5 个） |

实现：`renderMainScreen(state, ...)` 内部根据 `state.role.id` 选择子渲染器（CFO 走 `mainScreenCFO`，IM 走 `mainScreenIM`），共用 `topbar/eventCard/actionCard` 组件。

### 3.8 主线事件（IM 视角骨架）

12 个时间点（沿用 CFO 时间轴），每个事件 IM 视角下的核心冲击：

| 时间 | 事件 | IM 视角冲击 |
|---|---|---|
| 2022 Q1 | 银行收紧城投贷款 | 一二级市场利差走阔，AA 城投估值压力 |
| 2022 Q2 | 土地出让金下滑 | 弱区域城投信用风险上升，是否减仓？ |
| 2022 Q3 | 地方隐债审计 | 估值分化加剧，部分主体停止报价 |
| 2022 Q4 | 年末资金面紧张 | 回购利率飙升，加杠杆策略受挑战 |
| 2023 Q1 | 化债政策预期升温 | 弱资质城投反弹，是否博弈？ |
| 2023 Q2 | 城投债务重组试点 | 持仓重组债损失？还是博 100% 兑付？ |
| 2023 Q3 | 一揽子化债方案落地 | 赎回压力短暂缓解，但 yield 大幅下行 |
| 2023 Q4 | 年末机构集中赎回 | 实测赎回压力 |
| 2024 Q1 | 非标全面收紧 | 持仓中非标占比影响净值 |
| 2024 Q2 | 经济数据复苏 | 利率上行，久期受冲击 |
| 2024 Q3 | 地方债务置换扩容 | 持仓置换收益锁定 |
| 2024 Q4 | 监管集中度新规 | 单券 15% 上限强制执行 |

每个事件给 IM 提供 3 个选项，带不同 metric 影响。详细文案在 Implementation Plan 中。

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

---

## 4. 任务拆分总览

### Plan 3 任务清单（约 11 个 task）

**Phase A：架构改造（5 个 task）**
- T1：建 `js/roles/` 目录，迁移现有 CFO 代码（roles.js + actions.js → roles/cfo.js）
- T2：实现角色注册表 + `state.role` 注入；engine.js 改造为角色驱动
- T3：mainEvents.json schema 升级（roleResponses）+ 现有 23 个事件全部补 IM 视角的 stub（"待开发"占位）+ eventEngine.js 改造
- T4：DB schema 加 role 字段 + validate.js / server.js / api.js 适配 + 排行榜 UI 加角色筛选 tab
- T5：UI 拆分（`ui/` 目录）+ 命运卡按角色随机分发

**Phase B：投资经理实装（6 个 task）**
- T6：roles/im.js 完整实现（指标/操作/钩子/死亡）
- T7：origins/imOrigin.js（命运卡随机维度）
- T8：mainScreenIM.js（主界面 IM 渲染）+ IM 专属图表（净值曲线、持仓饼图）
- T9：12 个主线事件 IM 视角文案（替换 stub）
- T10：10 个 IM 专属随机事件
- T11：IM 平衡性测试（手动跑 5 局，确认通关率 30-60%）

**测试增量**：
- T2：roles 注册表 + engine 改造 → 引擎测试要扩到 IM 跑通
- T6：IM 模块单测（getInitialMetrics / advanceTurn / actions）≈ 10-15 个测试
- 总测试数预期：57 → 90+

### 时间预估
- Phase A：1.5 天
- Phase B：2 天
- 缓冲：0.5 天
- **总计 4 天**

---

## 5. 验收标准

### 5.1 架构层（Phase A 末）
- [ ] `npm test` 全绿（含原 57 个 + 架构改造新增 ≈10 个）
- [ ] CFO 玩法走完一局（命运卡 → 12 季度 → 终局），与改造前体感一致
- [ ] mainEvents.json 中所有事件都有 `roles.cfo`，CFO 跑事件不报错
- [ ] 排行榜 API 兼容旧请求格式（不带 role 参数），返回所有角色总榜

### 5.2 IM 角色层（Phase B 末）
- [ ] IM 玩法可启动（命运卡正确显示 IM 信息）
- [ ] IM 可跑完 12 季度且能通关（手动测 5 局）
- [ ] IM 死亡场景可触发（净值穿线 / 集中度超限 / 赎回挤兑各至少 1 次）
- [ ] IM 主线事件 12 个全部有 IM 视角文案
- [ ] 排行榜可按角色筛选，IM 成绩独立可查
- [ ] CFO 玩法不受任何破坏（回归测试）

### 5.3 工程标准
- [ ] 单文件不超过 500 行（ui.js 拆分后）
- [ ] roles/cfo.js 与 roles/im.js 接口一致（同样的 export shape）
- [ ] engine.js 不 import 任何具体角色模块

---

## 6. 风险与权衡

| 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|
| schema 改造把现有 CFO 测试打挂 | 中 | 高 | T2-T3 严格 TDD，先扩测试再改代码 |
| IM 平衡性难调，玩家 1 季度就死 | 高 | 中 | T11 留 0.5 天专门调参；公式留可调常量 |
| 23 个事件补 IM 视角文案工作量大 | 高 | 中 | T3 用占位 stub 解锁开发；T9 集中写文案 |
| ui.js 拆分引入新 bug | 中 | 中 | 拆分时全量回归测试 |
| 客户端代码体积膨胀 | 低 | 低 | 后续按需引入 dynamic import |

---

## 7. 依赖与限制

- 不破坏 Plan 1/2 已交付能力（CFO 单角色完整可玩 + 排行榜后端）
- API 变更必须向后兼容（旧客户端不传 role 仍能用）
- 数据库迁移需要 zero-downtime（`ALTER TABLE` + 默认值）

---

## 8. 后续 Plan 4/5 预留接口

Plan 3 完成后，Plan 4 加 GOV 角色只需：
- 新增 `js/roles/gov.js` + `js/origins/govOrigin.js` + `js/ui/mainScreenGOV.js`
- 给 mainEvents.json 所有事件补 `roles.gov`
- 写 GOV 12 个主线事件 + 10 个专属随机事件
- DB / API / 排行榜筛选无需改动（Plan 3 已支持任意 role）

Plan 5 综合调试只做：
- 跨角色平衡性
- 浏览器 12 步冒烟
- 服务器部署

---

**等你拍板：**
1. 这个设计稿是否照走？
2. 是否要我现在叫 Codex 评审（打分制，pass 后再写 Implementation Plan）？
