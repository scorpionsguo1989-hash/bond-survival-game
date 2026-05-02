# Codex 执行任务包 · 第二批（Task 11-19, 21）

## 角色与上下文

你是债市生存游戏 MVP 的执行者。Claude 已完成 Task 10（engine.js 状态机），加测试加文档。现在请按 plan 执行 Task 11-19 和 Task 21（跳过 Task 20，那是 Claude 接最后整合 main.js）。

## 工作目录

`/Volumes/D盘/claude code/工作区/债券生存游戏/`

## 当前状态

```
git log --oneline (最近):
b16c76f test(engine): add applyEventChoice tests and document death-check contract
ca6ebb0 feat: game state machine with turn loop and event application
8b7784c feat: final score calculation with six dimensions
7b0f98e feat: player action system with effects and availability
fb0cc9e feat: event triggering and weighted sampling
d7b1c95 content: initial main and random events
717d3de feat: policy axis drift and label system
e55ec16 fix(origins): prioritize impactful challenges and simplify generic fill
... (前面还有4个Task 1-4的commit)

测试状态：31 passing across 7 files
```

已完成模块：
- 项目脚手架 + config + roles + origins + policy + 事件JSON + eventEngine + actions + score + engine
- 共 9 个 js 模块 + 7 个测试文件 + 2 个 content JSON

## 任务范围

按顺序执行 plan `/Volumes/D盘/claude code/工作区/债券生存游戏/docs/实施计划Plan1_MVPcc_V1.md` 中的：

- **Task 11**：localStorage 存档 (js/storage.js)
- **Task 12**：CSS 主题（从原型 HTML 提取样式到 css/style.css）
- **Task 13**：UI 命运卡 (js/ui.js 第一部分)
- **Task 14**：UI 主界面布局与指标面板 (js/ui.js 追加)
- **Task 15**：UI 事件区与操作区 (js/ui.js 追加)
- **Task 16**：图表层 (js/charts.js + ui.js renderChartArea)
- **Task 17**：危机弹窗 (js/ui.js 追加 + js/engine.js 加 detectCrisis)
- **Task 18**：终局界面 + 雷达图 (js/ui.js 追加)
- **Task 19**：分享卡片生成 (js/ui.js 追加 Canvas 绘制)
- **Task 21**：README

**跳过 Task 20**——main.js 整合由 Claude 接手做。Task 20 之前你只交付各模块和UI层。

## 执行规范

1. **严格按 plan 的代码执行**——plan里给的代码是 spec。

2. **每个 task 一个独立 commit**，commit message 用 plan 里给的。

3. **TDD 不强制**——这一批大多是 UI 渲染，没有单元测试要求（plan 也没要求）。Task 11 storage.js 也没要求测试。Task 17 加 detectCrisis 函数也没强制要求测试，但建议加 1-2 个。

4. **每个 task 完成后跑 `npm test`**——确认现有 31 个测试还全绿，没破坏。

5. **Task 12 特殊说明**：plan 让你"从 `界面原型cc_V0.1.html` 提取 style 重组到 css/style.css"。这个原型文件在项目根目录。打开它，提取 `<style>` 块内容，整理后写入 `css/style.css`。最后追加 plan 给的"终局界面"扩展样式。

6. **Task 13-19 都是修改 js/ui.js**——这文件会越来越长，但 plan 明确这是单个文件。每个 task 在文件末尾追加新函数。文件结构：
   - Task 13：renderFateCard + escapeHtml（基础）
   - Task 14：追加 renderMainScreen + topbar + metricsPanel
   - Task 15：追加 renderEventArea + renderActionPanel + bindMainScreenEvents + renderStatusBar
   - Task 16：修改 ui.js 加 renderChartArea；新建 js/charts.js
   - Task 17：追加 renderCrisisModal；改 engine.js 加 detectCrisis
   - Task 18：追加 renderEndScreen（含 import renderRadarChart from charts.js）
   - Task 19：追加 generateShareCard + downloadShareCard（Canvas）

7. **遇到问题立刻停下汇报**：
   - 测试断了
   - plan 里的代码引用了未定义的东西
   - import 路径有歧义

8. **不要做 plan 之外的事**——不加额外 export、不优化、不重构。YAGNI。

## 质量标准

延续前面的 review 反馈：

- **避免 hidden coupling**：相关常量提取成 named const
- **测试不要用 chained matcher**
- **多触发条件的优先级要明确**
- **不要写 unreachable 防御性代码**
- **状态机/纯函数不要在文件之间互相 import 循环依赖**
- **import 路径用相对路径 `./xxx.js`，浏览器环境必须带 .js 后缀**
- **DOM 渲染函数不要在内部修改游戏状态**——UI 层接受 state 返回 HTML 或操作 DOM，state 修改交给 engine.js 和 main.js

## 完成后汇报格式

做完所有指定 task 后，回复：

```
完成 Task 11-19 + 21，汇总：

Task 11 (storage.js): commit XXXXXX
Task 12 (css/style.css): commit XXXXXX, [说明从原型提取了多少样式]
Task 13 (ui.js fate card): commit XXXXXX
Task 14 (ui.js main layout): commit XXXXXX
Task 15 (ui.js event/action): commit XXXXXX
Task 16 (charts.js + ui.js chart area): commit XXXXXX
Task 17 (crisis modal + engine detectCrisis): commit XXXXXX
Task 18 (ui.js endgame + radar): commit XXXXXX
Task 19 (ui.js share card canvas): commit XXXXXX
Task 21 (README): commit XXXXXX

git log --oneline (最近15条)：
[贴]

npm test 输出：
[Test Files / Tests 行]

ls js/ tests/ css/ content/ 输出：
[贴]

遇到的问题/偏离 plan 的地方：
[列出，如果没有就写"无"]

ui.js 最终行数：
[行]
```

之后 Claude 接 Task 20（main.js 主流程编排）和最终 code review。

---

**开始吧。需要澄清的随时问。**
