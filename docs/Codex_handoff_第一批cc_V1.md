# Codex 执行任务包 · 第一批（Task 5-9）

## 角色与上下文

你是债市生存游戏 MVP 的执行者。Claude 已完成 Task 1-4，建立了项目脚手架和前4个模块。现在请按 plan 文档执行 Task 5-9，然后停下来汇报，让 Claude 做 Task 10。

## 工作目录

`/Volumes/D盘/claude code/工作区/债券生存游戏/`

## 当前状态

```
git log --oneline:
e55ec16 fix(origins): prioritize impactful challenges and simplify generic fill
62eb227 feat: random origin generator with balance constraint
fe0344a fix(roles): split chained matcher and DRY initial credit usage
39257fe feat: role CFO configuration with initial metrics
a38f3b6 feat: game config and constants
94a252d feat: project scaffold
```

已存在文件：
- `package.json`, `vitest.config.js`, `.gitignore`, `index.html`, `README.md`
- `js/config.js`, `js/roles.js`, `js/origins.js`
- `tests/roles.test.js`, `tests/origins.test.js`
- 5/5 tests passing

## 任务范围

执行 `/Volumes/D盘/claude code/工作区/债券生存游戏/docs/实施计划Plan1_MVPcc_V1.md` 中的 **Task 5、6、7、8、9**，然后停下汇报。

不要执行 Task 10、11+，那些后续再说。

## 执行规范

1. **严格按 plan 的代码执行**——plan里给的代码是 spec，几乎逐字照做。需要微调的地方（比如 vitest 矩阵语法兼容性）可以调，但不要改逻辑。

2. **TDD 节奏**（plan里每个 step 都明确了）：
   - 写测试 → 跑确认失败 → 实现 → 跑确认通过 → 提交
   - 每个 task 一个独立 commit，commit message 用 plan 里给的

3. **每个 task 完成后跑全量测试**：`npm test` 必须全绿。如果加了新模块，确认没破坏已有 5 个测试。

4. **遇到问题立刻停下汇报**，不要硬猜：
   - 测试持续失败
   - plan 里的代码有 bug 或不一致
   - 跨文件依赖没法解决

5. **不要做 plan 之外的事**——不加额外 export、不优化性能、不重构其他文件、不创建额外文件。YAGNI。

6. **代码组织规范**：
   - 每个文件单一职责
   - 内部 helper 不要 export
   - 名称严格按 plan 给的（变量名、函数名、文件名都不能改）

## 质量标准

Claude 在 Task 1-4 走过的代码 review 反馈，请同样标准要求自己：

- **避免 hidden coupling**：相关常量提取成 named const（参考 Task 3 fix：`INITIAL_CREDIT_USAGE_RATIO`）
- **测试不要用 chained matcher**（如 `.toBeGreaterThan(0).toBeLessThan(100)`），拆成独立 expect
- **多触发条件的优先级要明确**（参考 Task 4 fix：`generateChallenges` 加注释说明 slice 顺序）
- **不要写 unreachable 的防御性代码**，简洁优先

## 完成后汇报格式

做完 Task 5-9 后，回复：

```
完成 Task 5-9，汇总：

Task 5 (policy.js): commit XXXXXX, 测试 N/N 通过
Task 6 (events JSON): commit XXXXXX
Task 7 (eventEngine.js): commit XXXXXX, 测试 N/N 通过
Task 8 (actions.js): commit XXXXXX, 测试 N/N 通过
Task 9 (score.js): commit XXXXXX, 测试 N/N 通过

git log --oneline 输出：
[贴完整最近10条]

npm test 输出：
[贴 Test Files 和 Tests 行]

遇到的问题/偏离 plan 的地方：
[列出，如果没有就写"无"]
```

之后 Claude 会接 Task 10（engine.js 状态机），那是逻辑最复杂的一块。

---

**开始吧。需要澄清的随时问。**
