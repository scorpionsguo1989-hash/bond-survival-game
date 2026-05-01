# Codex 执行任务包 · Plan 3（Task 4, 6, 7, 9, 10）

## 角色与上下文

你是债市生存游戏的执行者。Claude 已完成 Plan 1 + Plan 2，并已落地 Plan 3 的设计稿（V1.1，已通过你的评审）。

现在 Plan 3 进入执行阶段。Claude 和你分工：

- **Claude（执行）**：T1, T2, T3, T5, T8, T11（架构改造 + UX 复杂部分 + 平衡性调参）
- **Codex（你执行）**：T4, T6, T7, T9, T10（机械性任务 + 内容批量产出）

工作目录：

```
/Volumes/D盘/claude code/工作区/债券生存游戏/
```

## 核心参考文档

- **设计稿**：`docs/设计稿Plan3_多角色架构与投资经理cc_V1.1.md`（含修订日志，已是终版）
- **实施计划（你的 spec）**：`docs/实施计划Plan3_多角色架构与投资经理cc_V1.md`

**实施计划里有完整的代码——每个 Task 的每个 Step 都给了完整代码块，严格照做。**

## 你的任务清单

### Batch 1（独立，收到 handoff 立刻可开工）

#### Task 4：DB role 字段 + API 向后兼容 + 排行榜筛选 UI

参考：实施计划 §Task 4

**Files：**
- Modify: `api/db.js`、`api/validate.js`、`api/server.js`
- Modify: `js/api.js`、`js/ui.js`（renderLeaderboardModal 加 tab）、`js/main.js`、`css/style.css`
- Test: 扩 `tests/api-db.test.js`、`tests/api-validate.test.js`

**关键约束：**
1. `db.js` 必须能兼容老库：用 `try { ALTER TABLE scores ADD COLUMN role ... } catch {}`
2. POST `/api/scores` 缺 `role` 字段时**默认填 `cfo`** 并打 `[BC-FALLBACK]` warning 日志（这是 Codex 评审 R3 要求）
3. 校验时 `data.role` 缺失不报错（默认填 cfo），但非法值（不在 cfo/im/gov 中）必须 400
4. 排行榜 UI 加 tab：`[全部] [财务总监] [投资经理]`，切换时调 `fetchLeaderboard(role)` 重拉
5. 测试至少新增 6 个：3 个 db role 测试 + 4 个 validate role 测试（细节见 plan §Task 4 Step 1+3）

**完成 commit：**

```bash
git add api/ js/api.js js/ui.js js/main.js css/style.css tests/api-db.test.js tests/api-validate.test.js
git commit -m "feat(leaderboard): role field + role filter API + tab UI"
```

### Batch 2（**必须等 Claude 完成 T1-T3 才能开工**）

Claude 完成 T1-T3 后会通过 ccb 通知你"Phase 1 done, start batch 2"，**收到信号前不要碰这些任务**。

理由：T6/T7 依赖 `js/roles/index.js` + `getRole()` 已存在，T9/T10 依赖 `mainEvents.json` 已升级 schema 且效果 key 已转为 English。

#### Task 6：roles/im.js + actions/im.js 完整实现

参考：实施计划 §Task 6

**Files：**
- Create: `js/roles/im.js`
- Create: `js/actions/im.js`
- Modify: `js/roles/index.js`（注册 IM）
- Test: `tests/im-role.test.js`（至少 12 个测试）

**关键约束：**
1. **8 个指标**（不是 7 个）：`nav, aum, cashRatio, duration, concentration, creditExposure, redemptionPressure, leverage`（leverage 是 Codex 评审 R4 强制增加项）
2. **3 个死亡条件**：nav ≤ 0.85、concentration > 25、leverage > 140
3. `getInitialMetrics(profile)` 中 nav 起始 1.0；如果 profile.healthLevel === 'weak' 给 -0.02 buffer
4. `advanceTurn` 必须按实施计划 §Task 6 Step 3 中给的公式实现，包括 leverage 衰减
5. 5 个操作（buy/sell/repo_leverage/restructure/manage_expectation）必须按 plan §Task 6 Step 2 实现
6. dimensionLabels 必须用 IM 专属（"收益管理 / 信用筛选 / AUM 稳定性"，不是 CFO 套娃）
7. scoreWeights 按 plan §3.6（liquidity 1.2 / costControl 1.0 / projectProgress 0.8 / compliance 1.4 / crisisResponse 1.4 / development 1.0）

**完成 commit：**

```bash
git add js/roles/im.js js/actions/im.js js/roles/index.js tests/im-role.test.js
git commit -m "feat(roles): implement IM role with 8 metrics, 5 actions, 3 death conditions"
```

#### Task 7：origins/imOrigin.js + 命运卡随机分发

参考：实施计划 §Task 7

**Files：**
- Create: `js/origins/imOrigin.js`
- Modify: `js/origins/index.js`（路由 cfo/im）

**关键约束：**
1. 完全照 plan §Task 7 Step 1 中的代码实现
2. **平台名/PM 名必须是虚构的**（plan 给了 PM_NAMES + FUND_NAMES 列表，可以扩充但不能用真实人物/产品）
3. `generateOrigin()` 不传参数时 50/50 随机抽 cfo 或 im（Q1 决策落地）
4. 难度分目标区间 16-26（与 CFO 持平，最多重抽 50 次）

**完成 commit：**

```bash
git add js/origins/ js/main.js
git commit -m "feat(origins): random role assignment with IM origin generator"
```

> 注意：`js/main.js` 在 Claude 的 T5 已经改过 startNewGame 调用方式，你可能只需要小修。

#### Task 9：23 个主线事件 IM 视角文案（**最大工作量**）

参考：实施计划 §Task 9 + 设计稿 §3.8

**Files：**
- Modify: `content/mainEvents.json`（替换 23 个事件的 `roles.im` stub）

**关键约束：**

1. **每个事件 IM 视角必须包含**：
   - `body`：3-5 句话，从买方视角写，必须真实贴合中国债券市场（DCM/资管从业者一眼能看懂）
   - 3 个 `choices`，每个 `label` + `effects`（按 plan §Task 9 中的示例 effects 写）
   - 父级事件加 `teaching` 字段，标注教学目标（6 类之一）

2. **教学目标 6 类**（必须按设计稿 §3.8 的对照表分配）：
   - `duration` / `credit_sinking` / `liquidity` / `valuation_drawdown` / `client_behavior` / `regulatory`

3. **effects 中所有 score key 必须用内部 English**（不能写 `score.合规指数`，必须写 `score.compliance` 等）

4. **23 个事件覆盖时间轴**：2022Q1 → 2024Q4，每季度 1-2 个事件。已有 stub 不要删，只替换 body+choices

5. **示例完整事件**：见 plan §Task 9 中的 2022 Q1 完整示例

6. **真实历史素材**（可参考但不要硬塞名称）：
   - 2022 年城投融资收紧 + 隐债审计
   - 2023 年化债"一揽子方案"（特殊再融资债）
   - 2023 年城投债务重组（如贵州、云南个别试点）
   - 2024 年非标全面收紧 + 监管集中度新规

**完成 commit：**

```bash
git add content/mainEvents.json
git commit -m "content(events): IM perspective text for all 23 main events"
```

> **质量自检**：写完后人为审视一次每个事件的 3 个选项，确保不是"一好两烂"或"明显送分"，三个选项要有真实 trade-off。

#### Task 10：10 个 IM 专属随机事件 + 通用随机事件 schema 升级

参考：实施计划 §Task 10

**Files：**
- Create: `content/randomEventsIM.json`（10 个 IM 独享事件）
- Modify: `js/eventEngine.js`（合并加载 IM 随机池）

**关键约束：**
1. 10 个 IM 独享事件参考 plan §Task 10 Step 1 + 设计稿 §3.9 中的 10 个示例
2. 每个事件 schema：`{ id, policyDirection, roles: { im: { body, choices } } }`
3. eventEngine.js 的 `loadEvents` 改造为同时加载 mainEvents、randomEvents、randomEventsIM
4. effects 中 score key 同样用 English

**完成 commit：**

```bash
git add content/randomEventsIM.json js/eventEngine.js
git commit -m "content(random): 10 IM-specific random events"
```

## 执行规范

1. **严格按 plan 的代码执行**——plan 里给的代码是 spec，逐字照做。如果 plan 里某段代码写得有 bug 或不完整，立刻停下来汇报，不要自己猜补。

2. **每个 Task 一个独立 commit**，commit message 必须用上面给的（一字不差）。

3. **TDD 节奏**（涉及测试的 Task：T4、T6）：
   - 写测试 → 跑确认失败 → 实现 → 跑确认通过 → 提交

4. **每个 Task 完成后必须跑**：

   ```bash
   npm test
   ```

   确认全量通过（不仅是新增测试）。如果原有测试断了，立刻停下汇报。

5. **每个 Task 完成后必须跑**（涉及修改 js 文件的）：

   ```bash
   node --check js/<modified_file>.js
   ```

6. **遇到问题立刻停下汇报**：
   - plan 里的代码有 bug
   - 测试断了
   - 不确定 schema/接口含义
   - 文件冲突（你修改的文件 Claude 也在改）

7. **不要做 plan 之外的事**：
   - 不改 Claude 负责的文件（roles/cfo.js、engine.js、ui/mainScreenShell.js 等）
   - 不动游戏核心逻辑
   - 不增加 plan 之外的 metric / action
   - 不写 plan 之外的事件

8. **平台名/角色名/PM 名规范**（重要）：
   - 城投平台名必须是虚构（云中城建/星河基投这种风格，不能像"淮安市城投"）
   - 角色名必须是花名/代号（铁算盘、老城墙这种，不能用真名）
   - 基金 PM 名同理（不能像"张坤""葛兰"，要用周稳健、李进取这种代号）

## 质量标准

- **roles/im.js 接口与 cfo.js 一致**：同样的 export shape（id, name, metrics, deathConditions, scoreWeights, dimensionLabels, actions, getInitialMetrics, advanceTurn, detectCrisis, getOnboardingHints, applyActionEffects, isActionAvailable）

- **不修改 engine.js**（Claude 在 T2 已改，你不要碰）

- **事件 effects 的 key 命名**：metric key 用现有名（`cash`/`nav`/`leverage` 等），score key 用 English（`compliance`/`liquidity` 等），不能混

- **测试不依赖网络**（fetch 调用要 mock 或绕开）

- **better-sqlite3 改 schema 必须幂等**（重启不报错）

## 时序协调（重要）

收到本 handoff 后的执行顺序：

```
Step 1：立刻开工 Task 4（独立，无依赖）
Step 2：完成 T4 后 commit + 跑测试 + 通过 ccb 汇报"T4 done"
Step 3：等 Claude 通过 ccb 通知"Phase 1 done, start batch 2"
Step 4：依次执行 T6 → T7 → T9 → T10（按顺序，不并行，避免文件冲突）
Step 5：每完成一个 task 都 commit + 汇报
```

**绝对不要在 Claude 通知"Phase 1 done"之前开 T6/T7/T9/T10**，否则会在 git 里跟 Claude 的修改冲突，需要 reset。

## 完成后汇报格式

每完成一个 task 后，立刻通过 ccb 简短汇报：

```
Task X done.
Commit: <commit_hash>
Tests: <Test Files passed / Tests passed>
节点：[done/blocked + 原因]
```

全部任务完成后，汇报：

```
完成 Plan 3 Codex 任务 (T4, T6, T7, T9, T10)：

Task 4 (leaderboard role): commit XXXXXX
Task 6 (im role): commit XXXXXX, 测试 12+/12+ 通过
Task 7 (im origin): commit XXXXXX
Task 9 (23 events IM text): commit XXXXXX
Task 10 (10 IM random events): commit XXXXXX

git log --oneline (Plan 3 全部 commits)：
[贴]

npm test 输出：
[Test Files / Tests 行]

ls js/roles/ + js/actions/ + js/origins/ 输出：
[贴]

遇到的问题/偏离 plan 的地方：
[列出，没有就写"无"]
```

## 注意事项

1. 当前未提交修改：暂无（Claude 已 commit 之前的工作）

2. `api/node_modules/` 和 `api/leaderboard.db` 已加入 `.gitignore`，不要提交

3. `validate.js` 的分数等级范围必须和前端 `score.js` 保持一致

4. 旧的 handoff 文档不需要纳入提交（`docs/Codex_handoff_第一批cc_V1.md` 等）

5. 你和 Claude 都使用同一个工作树。**任何时候发现 git status 有意外修改（不是你做的也不是 Claude 提交的），立刻停下汇报**

---

**开始吧。先做 Task 4，做完汇报，等 Claude 信号再继续 Batch 2。**
