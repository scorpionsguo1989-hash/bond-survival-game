# 设计稿 Plan 4 · 地方官员（GOV）角色

## 0. 元信息

- **作者**：Claude（designer）
- **范围**：Plan 4 — 新增地方官员（GOV）角色
- **依赖**：Plan 3 已完成（架构层支持任意角色注入）
- **不在范围**：联调测试 + 部署（独立做，不归入 Plan 4）

## 1. 设计要点（简版）

### 1.1 角色定位

玩家扮演中国某地（市级或县级）主管财政/经济的政府官员（财政局长 / 政府办主任 / 副市长口径）。视角与 CFO 相反——CFO 是被监管的发债人，GOV 是制定规则、协调资源的决策者。

### 1.2 核心张力

- **资源端**：财政收入（一般公共预算 + 政府性基金）、转移支付、土地出让金、专项债额度
- **支出端**：化债任务、民生刚性支出、城投担保兜底、产业项目投入
- **死亡线**：综合债务率超 300%（被约谈） / 隐债集中爆雷（被纪委查） / 财政赤字穿线（基本工资发不出）

### 1.3 与 CFO/IM 的差异

| 维度 | CFO | IM | GOV |
|---|---|---|---|
| 视角 | 借钱方 | 买债方 | 监管 + 担保人 |
| 时间尺度 | 季度兑付 | 季度净值 | 季度财政 + 多年化债 |
| 死法主因 | 现金链断 | 净值穿线 | 债务率 / 隐债 / 赤字 |
| 政策环境影响 | 融资难易 | 估值涨跌 | 转移支付 + 土地市场 |

## 2. 8 个核心指标

| Metric Key | 中文 | 单位 | 初始范围 | 死亡线 | 备注 |
|---|---|---|---|---|---|
| `fiscalRevenue` | 一般公共预算收入 | 亿/年 | 30-300（按城市能级） | - | 季度 1/4 入账 |
| `landRevenue` | 土地出让收入 | 亿/年 | 10-200 | - | 政策松时增，紧时减 |
| `debtRatio` | 综合债务率 | % | 180-280 | **> 300** | 中央化债红线 |
| `hiddenDebtRisk` | 隐债风险敞口 | 亿 | 20-150 | - | 缓慢累积，化债减 |
| `industryIndex` | 产业发展指数 | 0-100 | 40-70 | - | 影响未来财政空间 |
| `politicalScore` | 政绩评分 | 0-100 | 50-70 | **< 20**（被免职） | 化债 + 招商正贡献 |
| `specialBondQuota` | 剩余专项债额度 | 亿 | 5-30（按城市能级） | - | 发完才能再申请 |
| `transferPayment` | 季度转移支付 | 亿 | 2-30 | - | 政绩高 + 自给率低 → 给得多 |

## 3. 5 个主动操作

| ID | 名称 | 效果（核心） | 政策依赖 |
|---|---|---|---|
| `attract_investment` | 招商引资 | 投 1-3 亿 → industryIndex +5/+8/+12 + politicalScore +3，需 fiscal 充足 | 政策松时招商更易 |
| `issue_special_bond` | 发专项债 | 消耗 quota → cash 增、debtRatio +3-8 | 政策紧时审批难 |
| `transfer_appeal` | 向上争取转移支付 | 不确定（成功率取决于 politicalScore + 财政自给率） | 化债重点区给更多 |
| `land_auction` | 土地收储出让 | 增 landRevenue 1-5 亿，市场冷时打折 | 政策紧时土地冷 |
| `hidden_debt_swap` | 隐性债务置换 | 消耗 quota 5-15 亿 → hiddenDebtRisk -10-25 + politicalScore +5 | 必须有剩余专项债额度 |

## 4. 死亡条件

```js
deathConditions: [
  { metric: 'debtRatio',     op: '>',  threshold: 300, reason: '综合债务率超 300%，被中央约谈强制化债' },
  { metric: 'politicalScore', op: '<',  threshold: 20,  reason: '政绩评分跌破 20，被免职调离岗位' },
],
// 复合条件（detectCrisis 处理）：
// hiddenDebtRisk > 200 → 隐债集中爆雷，触发危机处置
// fiscalRevenue 累计入账 < 累计运营支出（连续 2 季）→ 财政赤字危机
```

## 5. 季度自动结算

```js
function advanceTurn(state) {
  // 1. 财政收入入账（一般公共预算季度 1/4）
  const quartersIncome = fiscalRevenue / 4;
  cash += quartersIncome;

  // 2. 转移支付（按 politicalScore 调整）
  const transfer = baseTransfer * (politicalScore / 60);  // 政绩 60 = 基线
  cash += transfer;

  // 3. 土地收入（按政策影响）
  const landMultiplier = policyValue >= 0 ? 1.0 : (1 + policyValue * 0.08);  // 政策每紧 1 档，土地 -8%
  const landIncome = (landRevenue / 4) * Math.max(0.4, landMultiplier);
  cash += landIncome;

  // 4. 刚性支出（民生/工资/利息）≈ fiscalRevenue × 0.3
  const operatingCost = fiscalRevenue * 0.3 / 4;
  cash -= operatingCost;

  // 5. 化债任务（每季须还 1-2 亿隐债，否则风险累积）
  const debtServiceTarget = 1.5;
  if (cash >= debtServiceTarget) {
    cash -= debtServiceTarget;
    hiddenDebtRisk = Math.max(0, hiddenDebtRisk - debtServiceTarget);
  } else {
    hiddenDebtRisk += 2;  // 没钱还 → 风险累积
    politicalScore -= 1;
  }

  // 6. industryIndex 自然衰减 -0.5/季（不投入则慢慢退步）
  industryIndex = Math.max(0, industryIndex - 0.5);

  // 7. debtRatio 微调（隐债增加 → 债务率增加）
  debtRatio += hiddenDebtRisk * 0.005 - debtServiceTarget * 0.1;
}
```

## 6. 评分维度（GOV 标签）

```js
scoreWeights: {
  liquidity: 1.0,        // 财政平衡
  costControl: 1.2,      // 化债执行
  projectProgress: 1.0,  // 产业发展
  compliance: 1.4,       // 政绩合规
  crisisResponse: 1.2,
  development: 1.0,
}
dimensionLabels: {
  liquidity: '财政平衡',
  costControl: '化债执行',
  projectProgress: '产业发展',
  compliance: '政绩合规',
  crisisResponse: '危机应对',
  development: '综合发展',
}
```

## 7. 命运卡随机维度

| 维度 | 选项 | 难度分 |
|---|---|---|
| 城市能级 | 强省会 / 普通地级市 / 县级市 / 资源型城市 | 4/5/7/8 |
| 财政状况 | 自给率高 / 依赖转移支付 / 土地财政依赖 | 3/6/7 |
| 政治背景 | 新官上任 / 即将换届 / 长期执政稳定 / 空降干部 | 5/7/3/6 |
| 特殊标签 | 化债重点区域 / 央企战略合作 / 重大项目在建 / 土地纠纷遗留 / 产业转型阵痛 / 人口持续流出 | 8/3/5/6/6/7 |

挑战分目标：**16-26**

## 8. UI 改造

主界面骨架不变（沿用 mainScreenShell 模式，由 ui.js renderMetricsPanel 内部分发）：

| 区域 | 内容 |
|---|---|
| 左侧指标 | 财政收入 / 土地收入 / 综合债务率 / 隐债敞口 / 政绩 / 专项债额度（6 个卡，赎回压力卡那种格式） |
| 中央事件 | 共享渲染（事件已拍平） |
| 右侧图表 1 | 财政收支柱状图（fiscalRevenue + transfer + landRevenue vs operatingCost + debtService） |
| 右侧图表 2 | 综合债务率折线图（带 300% 红线） |
| 主动操作 | GOV_ACTIONS（5 个） |

## 9. 主线事件 IM/CFO/GOV 映射

23 个主线事件，每个补 roles.gov 视角。GOV 看到的事件主题：

| 时间 | 事件主题 | GOV 视角冲击 |
|---|---|---|
| 2022 Q1 | 银行收紧城投贷款 | 辖区城投发不出债来找你担保 |
| 2022 Q2 | 土地出让金下滑 | 政府性基金缺口扩大，民生刚性 |
| 2022 Q3 | 隐债审计 | 你接受审计，整改方案要不要"主动暴露"？ |
| 2022 Q4 | 年末资金面紧张 | 自有平台兑付告急，要不要紧急注资 |
| 2023 Q1 | 化债政策预期升温 | 是否抢先申报化债试点 |
| 2023 Q2 | 城投债务重组试点 | 你的辖区是否申报重组？舆论风险 |
| 2023 Q3 | 一揽子化债方案落地 | 申报特殊再融资债 quota 拿多少 |
| 2023 Q4 | 年末资金面 | 城投流动性预案 |
| 2024 Q1 | 非标全面收紧 | 平台非标到期靠你协调 |
| 2024 Q2 | 经济数据复苏 | 招商窗口 |
| 2024 Q3 | 地方债务置换扩容 | 化债 quota 申请 |
| 2024 Q4 | 监管集中度新规 | 平台整合压力 |

## 10. GOV 专属随机事件（10 个）

- 中央巡视组进驻
- 某重点企业要求税收优惠续期
- 国有平台发生小规模技术违约
- 上级要求承接央企产业转移项目
- 审计署函询某专项债项目进度
- 土地市场单月成交腰斩
- 引进重大项目签约成功
- 全国 KOL 在网上揭露你区某城投造假
- 邻市同行因隐债事项被免职
- 媒体询问区域债务率排名

## 11. 任务拆分

### Plan 4：6 个 task / 2 天

**Phase A：架构产出（Claude 1 天）**
- T1：roles/gov.js + actions/gov.js（含 advanceTurn / detectCrisis / onboarding）+ 测试
- T2：origins/govOrigin.js + 路由更新（generateOrigin 三选一）
- T3：UI 改造（ui.js renderImMetricsPanel 类比 → renderGovMetricsPanel + GOV 图表）+ charts.js 加 renderFiscalChart + renderDebtRatioChart

**Phase B：内容产出（Codex 1 天）**
- T4：mainEvents.json 23 个事件补 roles.gov 视角文案
- T5：randomEventsGOV.json 10 个 GOV 独享事件
- T6：场景测试（4 个场景）+ 平衡性调参

**测试增量预期**：99 → 120+

## 12. 验收标准

- [ ] CFO/IM 玩法 100% 不受影响
- [ ] GOV 玩法可启动，命运卡正确显示
- [ ] GOV 三种死亡场景（债务率 / 政绩跌穿 / 隐债爆雷危机）可触发
- [ ] 主界面骨架与 CFO/IM 一致（topbar/事件/操作位置不变）
- [ ] 23 个主线事件 GOV 视角文案就位
- [ ] 排行榜按角色筛选支持 gov tab
- [ ] 通关率 30-60%（与 CFO/IM 持平）
