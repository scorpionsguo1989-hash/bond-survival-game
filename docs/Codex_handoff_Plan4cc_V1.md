# Codex 执行任务包 · Plan 4（Task 4-6）

## 角色与上下文

Plan 3 已完成（CFO + IM 双角色可玩），架构层已支持任意角色注入。现在做 Plan 4：新增地方官员（GOV）角色。

**Claude/Codex 分工**：
- Claude：T1-T3（GOV 角色定义 + UI + 平衡性调参基础）
- Codex（你）：T4-T6（事件文案 + 平衡测试）

工作目录：`/Volumes/D盘/claude code/工作区/债券生存游戏/`

## 核心参考文档

- **设计稿**：`docs/设计稿Plan4_地方官员cc_V1.md`（含完整指标 / 操作 / 死亡条件 / 公式）
- **现成参考**：`js/roles/im.js` 和 `tests/im-role.test.js` 是你写 GOV 的最佳模板（结构完全一致）

## 你的任务（顺序执行，不并行）

### Batch 1（必须等 Claude 完成 T1-T3 才能开工）

Claude 完成 T1-T3 后会通过 ccb 通知"Plan 4 Phase A done, start your batch"。**收到信号前不要碰这些任务**。

#### Task 4：23 个主线事件 GOV 视角文案

**Files：**
- Modify: `content/mainEvents.json`（替换 23 个事件 `roles.gov` 字段为完整文案，目前可能不存在或为 stub）

**关键约束：**

1. **每个事件 GOV 视角必须包含**：
   - `body`：3-5 句话，从地方官员视角写。注意你不是发债人也不是买方，你是辖区主管财政/经济的官员。文笔要符合公文气质（带点严肃感，但不要太枯燥）
   - 3 个 `choices`，每个 `label` + `effects`（按 plan 里 GOV metric key 写）
   - 父级事件保留已有的 `teaching` 字段（如果有的话）

2. **GOV 视角的 metric key**（事件 effects 中可用）：
   - `fiscalRevenue` / `landRevenue` / `debtRatio` / `hiddenDebtRisk` / `industryIndex` / `politicalScore` / `specialBondQuota` / `transferPayment` / `cash`（共用）
   - score key 仍用内部 English：`liquidity` / `costControl` / `projectProgress` / `compliance` / `crisisResponse` / `development`

3. **23 个事件主题映射**（参考设计稿 §9）：

| 时间 | 主题 | GOV 视角冲击 |
|---|---|---|
| 2022 Q1 | 银行收紧城投贷款 | 辖区平台融资告急来找你担保 |
| 2022 Q2 | 土地出让金下滑 | 政府性基金缺口扩大 |
| 2022 Q3 | 隐债审计 | 你接受省级审计，整改方案如何写 |
| 2022 Q4 | 年末资金面紧张 | 平台兑付告急要不要紧急注资 |
| 2023 Q1 | 化债政策预期升温 | 是否抢先申报化债试点 |
| 2023 Q2 | 城投债务重组试点 | 辖区是否申报，有舆论风险 |
| 2023 Q3 | 一揽子化债方案落地 | 申报特殊再融资债 quota |
| 2023 Q4 | 年末机构集中赎回 | 城投流动性兜底应急预案 |
| 2024 Q1 | 非标全面收紧 | 平台非标到期靠你协调 |
| 2024 Q2 | 经济数据复苏 | 招商引资黄金窗口 |
| 2024 Q3 | 地方债务置换扩容 | 化债 quota 申请 |
| 2024 Q4 | 监管集中度新规 | 平台整合压力 |

4. **真实历史素材可用**（不要硬塞具体地名）：
   - 22 年地方土地市场冷
   - 23 年化债"35 号文"出台 + 一揽子方案
   - 23 年特殊再融资债快速落地
   - 24 年 14 万亿置换债

5. **示例完整 GOV 事件 schema**：

```json
{
  "id": "main_2022_q1_a",
  "trigger": { "year": 2022, "quarter": 1 },
  "title": "银行收紧城投贷款额度",
  "policyShift": -1,
  "teaching": "...",
  "roles": {
    "cfo": { /* 已有 */ },
    "im":  { /* 已有 */ },
    "gov": {
      "body": "辖区主要银行接到总行窗口指导，对你区城投平台新增贷款全面收紧。三家平台先后向区政府汇报融资困难，有平台 1 个月内将出现资金缺口。市领导要求你给出协调方案。",
      "choices": [
        {
          "label": "市政府出面协调银行，承诺优质资产作担保",
          "effects": { "politicalScore": 3, "transferPayment": -1, "score.crisisResponse": 4 }
        },
        {
          "label": "向上申请提前下达专项债额度，由政府兜底",
          "effects": { "specialBondQuota": -3, "cash": 2, "debtRatio": 5, "score.compliance": -2 }
        },
        {
          "label": "推动辖区平台整合重组，弱平台并入强平台",
          "effects": { "hiddenDebtRisk": -8, "industryIndex": -3, "score.development": 4, "_uncertainty": 0.5 }
        }
      ]
    }
  }
}
```

**完成 commit：**

```bash
git add content/mainEvents.json
git commit -m "content(events): GOV perspective text for all 23 main events"
```

#### Task 5：10 个 GOV 专属随机事件 + 加载

**Files：**
- Create: `content/randomEventsGOV.json`
- Modify: `js/eventEngine.js`（loadEvents 合并 randomEventsGOV）

**关键约束：**

1. 10 个 GOV 独享事件参考设计稿 §10：
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

2. 每个事件 schema：
   ```json
   {
     "id": "rand_gov_xxx",
     "policyDirection": "any",
     "roles": { "gov": { "body": "...", "choices": [...] } }
   }
   ```

3. eventEngine.js 的 `loadEvents` 改造：

```js
// 当前结构：fetch 3 个 JSON
// 加 randomEventsGOV.json 到 Promise.all
const [mainResp, randResp, randImResp, randGovResp] = await Promise.all([
  fetch('content/mainEvents.json'),
  fetch('content/randomEvents.json'),
  fetch('content/randomEventsIM.json'),
  fetch('content/randomEventsGOV.json'),
]);
const random = await randResp.json();
const randomIm = await randImResp.json();
const randomGov = await randGovResp.json();
return {
  main: await mainResp.json(),
  random: [...random, ...randomIm, ...randomGov],
};
```

**完成 commit：**

```bash
git add content/randomEventsGOV.json js/eventEngine.js
git commit -m "content(random): 10 GOV-specific random events"
```

#### Task 6：GOV 平衡性场景测试

**Files：**
- Create: `tests/gov-scenarios.test.js`

参考 `tests/im-scenarios.test.js` 的格式，写 4 个场景：

1. **baseline**: 强省会 + 自给率高 + 政绩稳定 → 应通关
2. **debt overload**: 财政依赖转移 + 化债重点区 + 不主动化债 → 应死于债务率超 300
3. **political crisis**: 政绩持续跌（不招商不化债）→ 应死于政绩跌穿
4. **fiscal stress**: 县级市 + 土地财政依赖 + 政策紧 → 应触发财政危机或勉强通关

每个场景固定 origin + 操作序列 + 政策走向，断言期望终局。

**完成 commit：**

```bash
git add tests/gov-scenarios.test.js
git commit -m "test(gov): scenario tests for GOV playability"
```

## 执行规范

1. **严格按 plan 的 schema** - effects 的 metric key 必须用 §2 §3 中给的（不要发明新 key）
2. **每个 task 一个独立 commit**，commit message 用上面给的（一字不差）
3. **每个 task 完成后跑 `npm test`** 确认全量通过
4. **不要碰 Claude 负责的文件**（roles/gov.js / actions/gov.js / origins/govOrigin.js / ui.js / charts.js）
5. **遇到问题立刻汇报**：
   - mainEvents.json 中没有 roles.gov 字段位置（说明 Claude T1 还没完成）
   - 公式与现实不符（直接说，不要硬写）
   - 平衡性测试场景设计不出来

## 平台名/角色名规范

- 城市名必须虚构（"云郡市" / "星川区" / "龙脊县"，不能像"绍兴市" / "贵阳市"）
- 官员名用花名（"陈稳健" / "王进取" / "周改革"）
- 不要硬塞真实地名/真实领导名

## 完成后汇报格式

```
完成 Plan 4 Codex 任务 (T4, T5, T6)：

Task 4 (23 GOV events): commit XXXXXX
Task 5 (10 GOV random events): commit XXXXXX
Task 6 (gov scenario tests): commit XXXXXX

git log --oneline (Plan 4 全部 commits)：
[贴]

npm test 输出：
[Test Files / Tests 行]

平衡性结果：
[贴 4 个场景的 pass/fail]

遇到的问题：
[列出，没有就写"无"]
```

---

**等 Claude 通知。准备就位。**
