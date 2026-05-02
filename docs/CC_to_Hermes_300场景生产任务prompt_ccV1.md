# 给 Hermes 的 Prompt：债市生存游戏 300 场景生产任务

> 产出方：cc（Claude Code）
> 接收方：hermes
> 版本：V1（2026-05-02）
> 项目根目录：`/Volumes/D盘/claude code/工作区/债券生存游戏`

---

## 0. TL;DR

**你的任务**：为「债市生存游戏」生产约 **280 个新场景 + 41 个 NPC 实体库**，写完后玩家在同一台设备上玩 20+ 局都不会强烈感受到重复。

**输出**：4 份 JSON + 1 份 NPC 库（具体见 §8）。

**强约束**：
- Schema 严格遵循 §3，否则前端读不进。
- 数值在 §4 给定区间内，不爆游戏平衡。
- 文风按 §5（DCM 同行视角，禁公文话/AI 腔/真公司名）。
- 你可以自由发挥的部分写在 §6——拿你知识库里的真实案例改编是核心创新点。

**自检**：每写完一批用 §9 的清单自查。

---

## 1. 项目背景（必读）

### 1.1 这是什么游戏

文字 + 数据驱动的"债市从业者生存游戏"，玩家在 12 个季度里扮演三种角色之一：

| 角色 ID | 名字 | 视角 | 核心指标 | 死亡线 |
|---------|------|------|----------|--------|
| `cfo` | 城投财务总监 | 一家城投平台 | cash / 资产负债率 / 授信使用率 / 综合融资成本 | cash ≤ 0 |
| `im` | 债券基金经理 | 一只债基 | NAV / 久期 / AA-占比 / 集中度 / 杠杆 / 赎回压力 | NAV < 0.85 |
| `gov` | 地方政府官员 | 一个市/县 | 财政现金 / 综合债务率 / 隐债敞口 / 政绩评分 | 政绩 < 0 / 现金 ≤ 0 / 债务率 > 300% |

每季玩家面对 1 个事件，从 3 选项中选一个，效果落到指标上。12 季结束按维度算综合分。

### 1.2 为什么需要 300 场景

当前事件库（你不需要自己读，但要知道规模）：

| 现有 | 数量 | 问题 |
|------|------|------|
| 主线事件 main | 23 个 × 3 角色 | 同剧本玩第二局，主线全见过 |
| 随机事件 random | 28 个 × 3 角色 | 4-5 局基本看完 |
| 黑天鹅 swan | 12 个 | 一局最多触发 2 个，体感快 |

**目标**：扩到 280+ 新场景，让玩家在同一种设备上玩 20+ 局不感觉重复。

### 1.3 现有架构（你要适配的）

- 4 个剧本（`rise_and_fall` 盛极而衰 / `v_shape` V 型反转 / `slow_boil` 温水煮青蛙 / `redemption` 绝处逢生），每个剧本 3 幕，每幕 4 季。
- 每幕影响：政策环境漂移方向、黑天鹅触发率、score 加权。
- 玩家会经历"扩张幕 → 紧缩幕 → 危机幕"或类似的三幕节奏。
- 你写的事件**不需要绑定剧本**，但建议适配某些幕（用 `act_hint` 字段，详见 §3）。

---

## 2. 你的产出配额

| 分类 | 数量 | 说明 | 输出文件 |
|------|------|------|---------|
| **核心 NPC 库** | 41 | 20 平台 + 10 发行人 + 6 银行 + 5 理财 | `npcLibrary.json` |
| **Saga 长线** | 8 个 saga × 平均 5 步 = ~40 场景 | 多步剧情，玩家选择影响后续 | `sagaEvents.json` |
| **季节日历事件** | 40 | 按 Q1-Q4 节奏分布 | `seasonalEvents.json` |
| **历史回响事件** | 30 | 改编自真实案例（不直接点名） | 合并进 `seasonalEvents.json` |
| **区域/规模/健康度专属** | 80 | 只在特定 origin 下触发 | `targetedEvents.json` |
| **角色深度事件** | CFO 25 + IM 25 + GOV 25 = 75 | 单角色专属、深入业务细节 | 合并进 `targetedEvents.json` |
| **新黑天鹅** | 15 | 大冲击 + 戏剧性 | `blackSwansV2.json` |
| **合计** | **280 场景 + 41 NPC** | | 4 份 JSON |

**优先级**：NPC 库 → Saga → 黑天鹅 → 季节 → 历史 → 区域 → 角色深度。

---

## 3. Hard Schema（必须严格遵循，前端会断言校验）

### 3.1 普通事件 schema（season / targeted / 角色深度 都用这个）

```json
{
  "id": "string，全局唯一，命名格式见 §3.6",
  "type": "市场 | 政策 | 监管 | 区域 | 角色专属",
  "weight": { "tight": 0-3, "stable": 0-3, "loose": 0-3 },
  "title": "10-18 字，事件标题",
  "policyShift": -2~2,
  "act_hint": "expansion | tightening | crisis | any",
  "season": "Q1 | Q2 | Q3 | Q4 | any",
  "tags": ["历史回响", "化债", "房地产", ...],
  "involves_npc": ["npc_id_1", "npc_id_2"],
  "triggerCondition": {
    "minQuarter": 0-11,
    "maxQuarter": 0-11,
    "requireRole": "cfo | im | gov | null",
    "regionTier": "east_core | central_capital | west_prefecture | northeast_old | null",
    "healthLevel": "good | medium | weak | null",
    "policyMin": -3~3,
    "policyMax": -3~3
  },
  "roles": {
    "cfo": {
      "body": "60-200 字事件描述，DCM 同行视角",
      "choices": [
        {
          "label": "12-30 字选项标签",
          "effects": {
            "cash": -3.0~3.0,
            "leverageRatio": -3.0~3.0,
            "creditUsage": -10~10,
            "financingCost": -1.0~1.0,
            "score.compliance": -10~10,
            "score.crisisResponse": -10~10,
            "score.development": -10~10,
            "score.liquidity": -10~10,
            "score.costControl": -10~10,
            "score.projectProgress": -10~10,
            "_uncertainty": 0.3-0.7,
            "_delay": 1-4,
            "_delayedEffect": {
              "afterQuarters": 2-6,
              "effects": { "cash": -2, "score.compliance": -5 }
            }
          }
        }
      ]
    },
    "im": { ... },
    "gov": { ... }
  }
}
```

**字段说明**：
- `id`：全局唯一。命名格式 `<分类>_<主题>_<序号>`，如 `season_q3_audit_01`、`saga_lgfv_default_step3`。
- `type`：内部分类标记，前端不显示，但你写完后用于自检。
- `weight`：随机抽取的权重，按当前政策方向加权。`tight=2` 表示在政策紧时这个事件出现概率高。
- `policyShift`：玩家选完后，全局政策环境的位移。**普通事件保守用 ±1**，黑天鹅可以到 ±2。
- `act_hint`：建议出现在哪一幕。前端会在该幕优先抽取。`any` 表示不限。
- `season`：建议出现的季度。可选，用 `any` 表示不限。
- `tags`：你自己分类用，前端会忽略，但你方便管理。
- `involves_npc`：引用 §7 的 NPC ID 列表。**强烈建议**每个事件涉及 1-3 个 NPC，让玩家形成记忆。
- `triggerCondition`：所有字段可选。命中所有非 null 字段才触发。

### 3.2 主线事件 schema（如果你要写主线）

主线事件多一个 `trigger` 字段，固定在某个 year+quarter 触发：

```json
{
  "id": "main_2023_q2_a",
  "trigger": { "year": 2023, "quarter": 2 },
  "title": "...",
  "policyShift": -1,
  "roles": { ... }
}
```

**注意**：主线已有 23 个，**你不需要再写主线**——300 场景全部走普通事件 + 黑天鹅 + saga schema。

### 3.3 黑天鹅 schema

```json
{
  "id": "swan_xxx",
  "kind": "black_swan",
  "weight": 1-3,
  "title": "10-18 字标题",
  "swanTag": "副标题，6-12 字（如「区域信用重定价」「净值化考验」「政策窗口」）",
  "policyShift": -3~3,
  "act_hint": "crisis | tightening | expansion | any",
  "tags": [...],
  "involves_npc": [...],
  "triggerCondition": {
    "minQuarter": 0-11,
    "requireRole": null,
    "policyMin / policyMax": ...,
    "cashMax / navMax / debtRatioMin": ...
  },
  "roles": {
    "cfo": {
      "body": "100-280 字，黑天鹅要写得戏剧性强",
      "choices": [
        { "label": "...", "effects": { ... } }
      ]
    }
  }
}
```

**黑天鹅必须**：
- `policyShift` 至少 ±2（普通事件最多 ±1）
- 至少 2 个角色支持（不要写完只对 cfo 起作用的）
- effects 数值范围比普通事件大 1.3-1.5 倍（毕竟是大事件）
- 必须用上至少 1 个 NPC

### 3.4 Saga 长线 schema

Saga 是把多个事件用"剧情链"串起来。同一个 saga 的事件**共用 saga_id**，第 N 步根据玩家在 N-1 步的选择被触发。

```json
{
  "id": "saga_lgfv_default_step1",
  "saga_id": "saga_lgfv_default",
  "saga_step": 1,
  "saga_total_steps": 5,
  "saga_title": "永煤式违约",
  "next_saga_step_map": {
    "0": "saga_lgfv_default_step2_aftermath",
    "1": "saga_lgfv_default_step2_proactive",
    "2": null
  },
  "title": "邻省国企技术性违约",
  "policyShift": -1,
  "act_hint": "any",
  "involves_npc": ["npc_lgfv_central_steel"],
  "roles": {
    "cfo": {
      "body": "...",
      "choices": [
        { "label": "选项 A", "effects": { ... } },
        { "label": "选项 B", "effects": { ... } },
        { "label": "选项 C 装作没看见", "effects": { ... } }
      ]
    }
  }
}
```

**Saga 的关键约束**：
- `saga_id`：同一 saga 所有 step 共用，命名 `saga_<主题>`
- `saga_step`：从 1 开始，递增
- `next_saga_step_map`：字典，key 是 choiceIdx（0/1/2），value 是下一步的事件 ID 或 null（null 表示 saga 终止）
- `next_saga_step_map` 的 value **必须**指向你定义的另一个 saga 事件 ID，前端会校验
- 一个 saga 至少 3 步、至多 7 步
- 第 1 步在 Q3-Q9 之间触发（避免开局就启动）
- 第 N 步被触发时**不再走主线/随机抽取**，强制接续

**示例 saga 流（5 步，分支树）**：
```
step1: 邻省国企首次违约
       │
       ├─选 A 紧急减仓 ── step2_a 减仓后被市场反噬
       ├─选 B 持仓观望 ── step2_b 蔓延到区域
       └─选 C 加仓抄底 ── step2_c 政策松后拉抬
                          │
                          └─选 X / Y / Z ── step3_x / y / z
                                              │
                                              └─...
                                                step5_final（saga 终结）
```

**你不必每个分支都展开 5 步完整**，可以让某些分支早些 null（saga 提前结束）。但**至少要有 1 条完整的 5 步路径**。

8 个 saga 主题建议（你可以全部按这个，或者替换 1-2 个用你知识库的真实案例）：
1. **永煤式违约** Saga（区域信用重定价）
2. **理财净值化** Saga（赎回潮 + 监管反应）
3. **化债 2.0** Saga（特殊再融资 + 名单争夺）
4. **房企美元债** Saga（境外违约传导境内）
5. **村镇银行储户** Saga（小银行风险扩散）
6. **某券商资管** Saga（中介整顿 + 牵连）
7. **某市平台暴雷** Saga（区域 spillover）
8. **大票仓利率震荡** Saga（中长债配置考验）

### 3.5 NPC 库 schema

```json
{
  "platforms": [
    {
      "id": "npc_lgfv_yu_north",
      "name": "豫北开投控股",
      "type": "lgfv",
      "region": "central_capital",
      "health": "weak",
      "tags": ["化债重点区域", "省内三大平台之一"],
      "historic_event": "2024Q1 曾被中诚信下调评级展望"
    }
  ],
  "issuers": [
    {
      "id": "npc_issuer_xxx",
      "name": "某北方民营房企",
      "type": "issuer",
      "tags": ["美元债违约前科", "正在重组"]
    }
  ],
  "banks": [
    {
      "id": "npc_bank_xxx",
      "name": "...",
      "tags": ["主开户行（CFO 默认）", "对城投保守"]
    }
  ],
  "wealth_mgmt": [
    {
      "id": "npc_wm_xxx",
      "name": "某 TOP 5 理财子",
      "tags": ["规模 1.2 万亿", "曾发生净值波动"]
    }
  ]
}
```

**NPC 命名规则（避雷）**：
- 平台名：可用「**地名 + 业务方向**」组合（豫北开投、长三角资管、辽东建发）
- 严禁直接用真实公司名（江苏交控、首创、华夏幸福、远洋、碧桂园…）
- 严禁用真实人名
- 银行名：用代号（"主开户行 A"、"政策性银行 B"）或职能名（"某城商行""某股份行"）
- 可以**影射**真实事件（一个北方民营房企、一个山东民企…），但不出现具体公司名
- NPC 要有**辨识度**——好平台/坏平台/明星/边缘要分明

### 3.6 ID 命名规则

| 分类 | 前缀 | 示例 |
|------|------|------|
| Saga | `saga_<主题>_step<N>` | `saga_lgfv_default_step3` |
| 季节 | `season_q<n>_<主题>_<序号>` | `season_q1_two_sessions_01` |
| 历史回响 | `echo_<主题>_<序号>` | `echo_yongmei_01`、`echo_baoshang_02` |
| 区域专属 | `region_<region>_<主题>_<序号>` | `region_northeast_pension_03` |
| 角色深度 | `<role>_<主题>_<序号>` | `cfo_audit_deep_01`、`im_client_negotiation_02`、`gov_promotion_path_01` |
| 新黑天鹅 | `swan_v2_<主题>` | `swan_v2_offshore_property_default` |
| NPC | `npc_<分类>_<标识>` | `npc_lgfv_yu_north` |

---

## 4. 数值平衡指南（不爆游戏）

写 effects 时数值范围参考。不要给单选项太极端的影响，否则破坏游戏平衡。

### 4.1 普通事件 effects 范围

| 字段 | 普通事件单次合理范围 | 极限不要超过 |
|------|----------------------|--------------|
| `cash`（CFO/GOV） | -2.5 ~ +2.5 亿 | ±3.5 |
| `leverageRatio` | -2 ~ +2 | ±3 |
| `creditUsage` | -8 ~ +8 | ±12 |
| `financingCost` | -0.5 ~ +0.5 | ±0.8 |
| `nav`（IM） | -0.025 ~ +0.025 | ±0.04 |
| `duration` | -0.6 ~ +0.6 | ±1.0 |
| `creditExposure`（IM） | -8 ~ +8 | ±12 |
| `concentration` | -3 ~ +3 | ±5 |
| `redemptionPressure` | -10 ~ +10 | ±18 |
| `cashRatio`（IM） | -3 ~ +3 | ±5 |
| `debtRatio`（GOV） | -5 ~ +5 | ±8 |
| `hiddenDebtRisk` | -10 ~ +10 | ±15 |
| `politicalScore` | -5 ~ +5 | ±8 |
| `score.<dim>` | -8 ~ +8 | ±12 |

### 4.2 黑天鹅 effects 范围

把上面所有数值乘以 1.3-1.5。但**单次仍不要超过死亡线一半**——比如 IM 单次 nav 跌 0.06 就到 0.94，再来一波就死了，玩家会怒砸键盘。

### 4.3 不确定性

- `_uncertainty: 0.3` 意味"30% 成功率"。失败时 effects 全部不发生（除了 policyShift）
- 普通事件至少 1/3 选项要带 _uncertainty（避免每个事件都是确定性）
- 黑天鹅可以更激进，至少 1 个选项是高赌博（uncertainty 0.3-0.5）

### 4.4 延迟后果

`_delayedEffect` 让选择有"长期账"。建议在 30%-40% 的事件里加延迟后果，让玩家学会长视角思考。

```json
"_delayedEffect": { "afterQuarters": 4, "effects": { "score.compliance": -8, "financingCost": 0.3 } }
```

---

## 5. 文风约束（硬性）

### 5.1 必须做到

- **DCM/资管圈黑话准确**：城投、隐债、化债、置换、专项债、永续、非标、定融、利差、估值偏离、净值化、赎回压力、加杠杆、回购、转移支付——这些词用对、用准
- **白描多于评论**："邻省一家明星城投公告技术性违约" 比 "市场恐慌情绪蔓延" 强
- **数字真实感**：bp、%、亿、季度、收益率单位标到位
- **像真从业者私下吐槽**：不像新闻通稿、不像 PPT、不像研报摘要

### 5.2 严禁

- ❌ 真实公司名（江苏交控、远洋、碧桂园、华夏幸福、永煤、包商、中植系、平安、招商、中信、中金、中诚信、东方金诚……一个都不准出现）
- ❌ 真实人名
- ❌ 公文话："综合来看""值得肯定""需要警惕""下一阶段""高度重视""统筹推进"
- ❌ 自媒体腔："震惊！""一文读懂""扒一扒""真相是""xxx 突然！"
- ❌ AI 腔："作为""根据""基于以上""综合考量""此外""另外"
- ❌ Emoji
- ❌ 排比堆砌："既要…又要…还要…"
- ❌ 文学夸张："血流成河""惊天动地""跌宕起伏"

### 5.3 选项标签风格

12-30 字，动作 + 简要说明。**不要**写成"A. 选择此方案"或"积极应对"这种空话。

✅ 好：「启动备用银行授信申请，贡献部分存款作对价」
✅ 好：「召开持有人会议争取展期 36 个月」
❌ 差：「积极应对市场变化」
❌ 差：「采取稳健策略」
❌ 差：「主动与监管沟通」（太空，没动作）

### 5.4 body 文本结构（推荐 3 句）

第 1 句：发生了什么（事实）
第 2 句：为什么这影响你（机制）
第 3 句：你需要权衡什么（决策点）

例：
> 邻省一家明星城投公告债券技术性违约，市场恐慌迅速蔓延到全国（事实）。同区域评级被一刀切列入观察名单，主承销商电话开始集中咨询你的存量债估值（机制）。你需要决定是抢在市场之前主动澄清，还是等评级落地再回应（决策）。

---

## 6. 你可以自由发挥的部分

**这是核心**——以下部分不要照搬我的建议，用你知识库里的真实案例和你对债市的理解去发挥：

| 你可以自由决定 | 我的建议（参考，不是约束） |
|---------------|--------------------------|
| **8 个 saga 主题** | §3.4 列了 8 个，但你完全可以替换 3-5 个用你知识库里更精彩的案例 |
| **30 个历史回响事件** | 永煤、包商、华夏幸福、河南村镇银行、中植系、远洋、碧桂园…只是热门案例。你知识库里有更多冷门但精彩的案例（如 2018 年某省 ABS 事件、某 AMC 起诉案、某券商资管违约…），优先用 |
| **80 个区域专属事件** | 哪些区域配哪些事件你比我懂——东北用什么、贵州用什么、长三角用什么 |
| **75 个角色深度事件** | CFO 的"真实工作场景"、IM 的"客户关系"、GOV 的"政绩与晋升"——用你案例里的真实困境 |
| **41 个 NPC 的"故事背景"** | 每个 NPC 的 historic_event / tags 要让玩家"看到这名字就有联想"。你知识库里的真实平台特点是好原型 |

**判断标准**：写完一个事件，你问自己"DCM 同行看到会不会会心一笑/暗暗点头"。如果会，就过；如果不会，重写。

---

## 7. 完整示例（4 个，覆盖所有 schema）

### 7.1 普通事件示例（季节 Q3，含 NPC + 延迟后果）

```json
{
  "id": "season_q3_audit_01",
  "type": "监管",
  "weight": { "tight": 3, "stable": 2, "loose": 1 },
  "title": "省级审计组开始核查辖区平台 ABS",
  "policyShift": -1,
  "act_hint": "tightening",
  "season": "Q3",
  "tags": ["审计", "ABS", "合规"],
  "involves_npc": ["npc_lgfv_yu_north"],
  "triggerCondition": {
    "minQuarter": 4,
    "maxQuarter": 10
  },
  "roles": {
    "cfo": {
      "body": "省审计组通知下季进驻，重点核查近三年 ABS 底层资产真实性。豫北开投控股 12 单存量 ABS 中，3 单底层应收账款的回款节奏与原先披露不符。距离审计组到场还有 11 周。",
      "choices": [
        {
          "label": "提前自查 + 重新出具底层资产报告",
          "effects": {
            "cash": -0.8,
            "score.compliance": 8,
            "_delayedEffect": { "afterQuarters": 3, "effects": { "score.compliance": 4 } }
          }
        },
        {
          "label": "聘外部律所做合规审查兜底（不确定）",
          "effects": {
            "_uncertainty": 0.55,
            "cash": -1.5,
            "score.compliance": 6,
            "score.crisisResponse": 5
          }
        },
        {
          "label": "走关系争取审计推迟一个季度",
          "effects": {
            "_uncertainty": 0.4,
            "score.compliance": -6,
            "_delayedEffect": { "afterQuarters": 2, "effects": { "score.compliance": -10, "financingCost": 0.4 } }
          }
        }
      ]
    },
    "gov": {
      "body": "省审计组通知下季进驻辖区，重点核查 ABS 底层资产真实性。辖区 5 家平台共 28 单存量 ABS，初步排查发现 6 单存在底层资产与披露不符。距离审计组到场还有 11 周。",
      "choices": [
        { "label": "...", "effects": { ... } }
      ]
    }
  }
}
```

### 7.2 Saga 5 步示例（完整链路，演示分支）

仅展示 step 1 和 step 2 的两个分支结构，你写完整 5 步：

```json
[
  {
    "id": "saga_lgfv_default_step1",
    "saga_id": "saga_lgfv_default",
    "saga_step": 1,
    "saga_total_steps": 5,
    "saga_title": "永煤式违约",
    "next_saga_step_map": {
      "0": "saga_lgfv_default_step2_proactive",
      "1": "saga_lgfv_default_step2_wait",
      "2": "saga_lgfv_default_step2_dump"
    },
    "title": "邻省国企技术性违约",
    "policyShift": -1,
    "act_hint": "any",
    "involves_npc": ["npc_lgfv_central_steel"],
    "triggerCondition": { "minQuarter": 2, "maxQuarter": 9 },
    "roles": {
      "cfo": {
        "body": "邻省一家年销售 600 亿的明星国企突然公告 13 亿超短融技术性违约，市场震惊。豫北开投控股发行的 23 亿存量债估值收益率单日上行 80bp。主承销商电话集中咨询你的展期意向。",
        "choices": [
          { "label": "立即与主承一对一沟通澄清，发布主动声明", "effects": { "score.compliance": 6, "score.crisisResponse": 5, "financingCost": 0.3 } },
          { "label": "按兵不动，等市场情绪自己消化", "effects": { "financingCost": 0.6, "score.compliance": -2 } },
          { "label": "趁估值低位回购自家债券（不确定）", "effects": { "_uncertainty": 0.5, "cash": -2, "score.development": 6 } }
        ]
      }
    }
  },
  {
    "id": "saga_lgfv_default_step2_proactive",
    "saga_id": "saga_lgfv_default",
    "saga_step": 2,
    "saga_total_steps": 5,
    "saga_title": "永煤式违约",
    "next_saga_step_map": { ... },
    "title": "你的主动声明被市场质疑「越描越黑」",
    ...
  },
  {
    "id": "saga_lgfv_default_step2_wait",
    ...
  },
  {
    "id": "saga_lgfv_default_step2_dump",
    ...
  }
]
```

### 7.3 黑天鹅示例（含 NPC + 三角色 + 强戏剧）

```json
{
  "id": "swan_v2_offshore_property_default",
  "kind": "black_swan",
  "weight": 2,
  "title": "千亿房企美元债实质违约",
  "swanTag": "境外火烧到境内",
  "policyShift": -2,
  "act_hint": "tightening",
  "tags": ["历史回响", "房地产", "美元债"],
  "involves_npc": ["npc_issuer_north_developer"],
  "triggerCondition": { "minQuarter": 4 },
  "roles": {
    "cfo": {
      "body": "某北方千亿民营房企公告无法支付 9 月美元债票息，构成实质性违约。境内 AA+ 及以下信用债二级估值收益率应声上行 35bp，城投永续被动卷入。豫北开投控股下季 18 亿到期债续作主承担保紧急要求重新定价。",
      "choices": [
        { "label": "接受重新定价完成续作", "effects": { "cash": 2, "financingCost": 0.7, "score.crisisResponse": 6 } },
        { "label": "改用银团贷款替换公开债", "effects": { "cash": 1.5, "creditUsage": 8, "score.compliance": 4 } },
        { "label": "压缩规模硬扛（不确定）", "effects": { "_uncertainty": 0.4, "cash": -2.5, "score.development": -5, "_delayedEffect": { "afterQuarters": 2, "effects": { "cash": 1.5 } } } }
      ]
    },
    "im": {
      "body": "某北方千亿民营房企美元债实质违约，境内信用债 risk-off。组合里持有 4% 仓位的某北方民企产业债估值瞬间下挫 2.3%，明天净值大概率跌 0.6%。",
      "choices": [
        { "label": "盘前低价砸出，止损出局", "effects": { "concentration": -3, "creditExposure": -4, "nav": -0.018, "score.crisisResponse": 6 } },
        { "label": "申请风险准备金缓释", "effects": { "_uncertainty": 0.6, "nav": -0.008, "score.compliance": 5 } },
        { "label": "持有等政策托底", "effects": { "_uncertainty": 0.3, "nav": -0.030, "redemptionPressure": 12 } }
      ]
    },
    "gov": {
      "body": "境外房企违约传导境内，辖区在建项目甲方资金链承压。3 个 PPP 项目下季可能停工。",
      "choices": [
        { "label": "财政短期垫付维持施工", "effects": { "cash": -1.5, "industryIndex": 2, "score.crisisResponse": 6 } },
        { "label": "推动政策性银行紧急放款", "effects": { "_uncertainty": 0.5, "cash": 2, "hiddenDebtRisk": -3, "score.liquidity": 6 } },
        { "label": "暂停非关键在建项目", "effects": { "industryIndex": -3, "hiddenDebtRisk": -5, "politicalScore": -2, "score.compliance": 3 } }
      ]
    }
  }
}
```

### 7.4 NPC 示例

```json
{
  "platforms": [
    {
      "id": "npc_lgfv_yu_north",
      "name": "豫北开投控股",
      "type": "lgfv",
      "region": "central_capital",
      "health": "weak",
      "tags": ["化债重点区域", "省内三大平台之一", "曾被下调评级展望"],
      "historic_event": "2024Q1 因隐债排查被中诚信下调评级展望至负面"
    },
    {
      "id": "npc_lgfv_yangtze_capital",
      "name": "长三角资管",
      "type": "lgfv",
      "region": "east_core",
      "health": "good",
      "tags": ["明星平台", "AAA 评级", "省级国资委直管"],
      "historic_event": "2023Q4 牵头发行全省首单绿色科技创新债"
    }
    // ... 18 more
  ],
  "issuers": [
    {
      "id": "npc_issuer_north_developer",
      "name": "某北方民营房企",
      "type": "issuer",
      "tags": ["千亿规模", "美元债违约前科", "正在境外重组"]
    }
    // ... 9 more
  ],
  "banks": [
    {
      "id": "npc_bank_main_state",
      "name": "主开户行 · 国有大行 A",
      "tags": ["对城投长期合作", "近期收紧授信"]
    }
    // ... 5 more
  ],
  "wealth_mgmt": [
    {
      "id": "npc_wm_top5",
      "name": "TOP 5 理财子 · 某股份行系",
      "tags": ["规模 1.2 万亿", "曾发生净值波动"]
    }
    // ... 4 more
  ]
}
```

---

## 8. 交付物 + 文件命名

请把成果按以下文件放入 `/Volumes/D盘/claude code/工作区/债券生存游戏/content/` 目录：

| 文件名 | 内容 | 大小预估 |
|--------|------|---------|
| `npcLibrary.json` | 41 个 NPC 实体 | 8-15 KB |
| `sagaEvents.json` | 8 个 saga × ~5 步 = ~40 事件 | 50-80 KB |
| `seasonalEvents.json` | 季节 40 + 历史回响 30 = 70 事件 | 80-120 KB |
| `targetedEvents.json` | 区域专属 80 + 角色深度 75 = 155 事件 | 180-250 KB |
| `blackSwansV2.json` | 15 个新黑天鹅 | 30-50 KB |

**文件结构示例**：

```json
// sagaEvents.json
[
  { "id": "saga_lgfv_default_step1", ... },
  { "id": "saga_lgfv_default_step2_proactive", ... },
  ...
]
```

```json
// npcLibrary.json
{
  "platforms": [...],
  "issuers": [...],
  "banks": [...],
  "wealth_mgmt": [...]
}
```

**写作建议**：分批写完分批保存，不要憋一次写完。可以一个 saga 一个 saga 写、一个 region 一个 region 写。

---

## 9. 验收清单（你写完每批用这个自查）

### 9.1 Schema 校验

- [ ] 每个事件都有 `id` 且全局唯一
- [ ] 每个事件 `roles` 里至少 1 个角色有 `body` 和 `choices`
- [ ] 每个 `choices` 数组长度 ≥ 2 且 ≤ 4
- [ ] `effects` 数值都在 §4 范围内
- [ ] 黑天鹅都有 `kind: "black_swan"` 和 `swanTag`
- [ ] Saga 事件的 `next_saga_step_map` 引用的 ID **真的存在**（前端会断言，少一个就崩）

### 9.2 内容质量

- [ ] 每个 body 字数在 60-280 字之间
- [ ] 每个 choice label 在 12-30 字
- [ ] 没有真实公司名（用关键词搜：江苏交控、华夏幸福、永煤、包商、远洋、碧桂园、中植、平安、招商、中信、中金、中诚信、东方金诚……）
- [ ] 没有 emoji
- [ ] 没有"综合来看""值得肯定""需要警惕"等公文话
- [ ] 抽样 10 个事件，DCM 同行读完会"暗暗点头"

### 9.3 多样性

- [ ] 80 个区域专属事件覆盖至少 4 种 regionTier
- [ ] 75 个角色深度事件 CFO/IM/GOV 各 25
- [ ] 30 个历史回响覆盖至少 8 个不同的真实事件原型
- [ ] 8 个 saga 主题各不相同（不要 5 个都是城投违约）

### 9.4 NPC 复用度

- [ ] 41 个 NPC 平均每个被 ≥ 3 个事件 `involves_npc` 引用
- [ ] 至少 5 个 NPC 跨 3+ 个 saga 出现（让玩家形成强记忆）

---

## 10. 后续合作

写完后请在 `docs/` 目录下放一份 `Hermes_300场景生产报告_hmsV1.md`，包含：

1. **完成情况**：每个分类实际写了多少个
2. **NPC 复用统计**：每个 NPC 被引用了几次
3. **Saga 摘要**：8 个 saga 各自的主题 + 步数 + 分支数
4. **遇到的问题**：哪些字段含义不清、哪些约束你觉得不合理
5. **建议**：你觉得游戏还能加什么机制

cc 拿到后会做：
1. 前端事件加载逻辑扩展（加载这 4 个新 JSON）
2. saga 触发引擎实现（next_saga_step_map 跳转）
3. NPC 在事件文本里高亮（hover 显示 historic_event）
4. 自动校验你的 schema（任何不符立即列清单回给你修）

---

## 11. 重要提醒

- 不要照搬 §6 列举的 8 个 saga 主题、30 个历史回响——那只是兜底，**你知识库里有更精彩的案例就替换**
- 不要为了凑数写水分——每个事件都该有"DCM 同行读完点头"的那一下
- 数值平衡是约束但不是枷锁——你觉得某个事件就是该 effects 大一点，超出 §4 范围 30% 内可以接受，留个注释说明理由
- 文风约束是硬约束，不能松——这是游戏品质的底线
- 真实公司名是绝对红线——你脑子里想到的所有真实平台/房企/银行/券商/理财/AMC，**一个都不能写进去**

写完后这游戏会从"DCM 圈小众游戏"变成"DCM 圈现象级游戏"。期待你的产出。

—— cc 2026-05-02
