# 给 Claude Code 的 Prompt：债券生存游戏 UI Round3-5 落地

你现在接手的是本地项目：

`/Volumes/D盘/claude code/工作区/债券生存游戏`

目标不是重新设计游戏，而是把 Claude Design 已完成并被用户认可的 UI 方向，落到当前可玩的网页端里。请先阅读现有代码和文档，再做最小必要改动。

## 一、先读这些材料

优先阅读：

- `docs/Codex_handoff_设计优化cc_V1.md`
- `docs/design_outputs/Claude_Design_产出汇总.md`
- `docs/design_outputs/round1.md`
- `docs/design_outputs/round2.md`
- `docs/design_outputs/round3.md`
- `docs/Codex_to_ClaudeDesign_Round3-5续跑prompt_cdxV0.md`

Claude Design 项目里新增了这些文件，若本地还没有下载，需要从 Claude Design 导出或让用户提供：

- `Overlays.html`
- `overlays.jsx`
- `overlays.css`
- `Endgame.html`
- `endgame.jsx`
- `endgame.css`
- `DesignSystem.md`

注意：仓库里的 `claude design设计稿/` 目前大概率只包含早期 Fate Card / Main UI 文件，不一定含 Round3-5 最新产物。不要误以为本地已有全部最新稿。

## 二、用户已经认可的方向

整体方向：

- 深色中文债券市场终端风格。
- CFO 用 cyan，IM 用 gold，GOV 用 red。
- 桌面端保留三栏终端布局，但减少大面积空白，让核心决策区更紧凑。
- 移动端用自然纵向滚动 + 分段/横向切换，不要强行塞满一屏导致文字重叠。
- 不要做成营销页、SaaS dashboard、卡片堆叠宣传页。

用户明确反馈过的修正点：

- 开局三大挑战要一次性展示出来。
- slogan 用“命运由你改写”，不要“你的命运已定”。
- Fate Card 里 `01/02/03` 下方竖线位置要对齐，不要像错位装饰。
- 移动端任务简报必须能完整看全。
- 桌面端“主动操作”应放到事件卡下面。
- 桌面端左栏：本局目标放在“我的指标”下面。
- 投资经理 IM：本局目标放在“赎回压力”下面。
- 左栏/中区/右栏的留白都要继续压缩，尤其 projected / 决策日志不能空出一大块。
- 移动端“目标 / 操作 / 市场变化”适合做成堆叠后的横向切换或分段切换。
- donut 圆环图当前半径偏小，但用户说后续可以自己微调；不要把这个当成阻塞项。

## 三、Round 3：Overlays 落地

Claude Design 已完成 Round3：

- `Overlays.html`
- `overlays.jsx`
- `overlays.css`

需要落地的组件族：

1. Operation Modal
   - 操作选择卡必须像高风险决策，不是普通按钮。
   - 每个选项要包含成本、周期/限制、预测影响。
   - CFO 桌面 + 移动至少要无重叠、可读。

2. Toasts
   - success / error / info 三态。
   - 桌面与移动都要位置合理，不遮挡关键操作。

3. Crisis Modal
   - IM 赎回压力、GOV 红线/监管风险都要有强烈危机感。
   - 选项要有 consequence preview。
   - 移动端必须可滚动、按钮可点、文字不溢出。

实现时建议：

- 不必逐字照搬 demo JSX，但要吸收视觉结构和状态层级。
- 尽量复用现有游戏数据和事件系统。
- Modal 出现时要锁定背景交互；关闭/选择后状态正确回到游戏。

## 四、Round 4：Endgame / Leaderboard / Share Card 落地

Claude Design 已完成 Round4：

- `Endgame.html`
- `endgame.jsx`
- `endgame.css`

并已通过 verifier，12 个 artboard clean。需要落地：

1. End Screen
   - 通关/失败两种终局。
   - 大号评级 S/A/B/C/D。
   - 角色身份、分数、排名、存活季度、失败原因。
   - 六维能力评估。
   - 按钮：再来一局、排行榜、生成分享卡片。

2. Leaderboard Modal
   - Top 20 表格。
   - 角色筛选 tabs：全部 / CFO / IM / GOV。
   - 高亮当前玩家行。
   - 移动端表格可横向滚动，不要压缩到不可读。

3. Share Card
   - 750 x 1200 竖版卡片方向。
   - 适合截图分享。
   - 包含评级、角色、平台、分数、六维能力、二维码占位/水印。
   - 当前不要求真实二维码，先保留可替换占位。

## 五、Round 5：Design System 落地

Claude Design 已生成 `DesignSystem.md`，里面包含：

- color tokens：bg / text / role / status / grade / risk。
- typography：`PingFang SC` + `SF Mono`，数字使用 tabular nums。
- spacing / radius / shadow scale。
- 12 个核心组件规范。
- responsive breakpoint：
  - mobile < 640
  - tablet 640-1024
  - desktop > 1024
- micro-interactions：
  - metric 变化约 200ms ease
  - choice hover / selected
  - toast enter / exit
  - crisis modal entrance
  - end screen grade reveal

请把这些规范沉淀到当前 CSS，而不是散落在每个组件里。建议先建立/修正统一 token 区：

- role 变量：`data-role="cfo" | "im" | "gov"` 驱动 accent。
- status 变量：success / warn / danger / info。
- grade 变量：S/A/B/C/D。
- 背景层、文本层、边框层统一。

## 六、实施边界

请严格遵守：

- 不要重写游戏逻辑。
- 不要删除或回滚用户/其他 agent 已经做过的功能。
- 不要用 `git reset --hard`。
- 不要把页面改成纯静态设计稿；本地 `http://localhost:8080` 必须仍能玩。
- 不要为了视觉统一牺牲可读性，中文正文优先清楚。
- 不要引入大框架；沿用当前 vanilla JS / CSS 结构，除非现有项目已经引入。
- 不要把所有信息堆到首屏；移动端允许自然滚动。

## 七、建议实施顺序

1. 先跑当前项目，确认 `http://localhost:8080` 的现状。
2. 对照 Round1/2 已落地部分，修正用户仍不满意的主界面差异：
   - 主动操作位置。
   - 目标卡位置。
   - 留白。
   - 移动端分段切换/滚动。
3. 落地 Round3 overlays。
4. 落地 Round4 endgame / leaderboard / share card。
5. 抽出 Round5 design tokens，消除重复硬编码颜色和尺寸。
6. 最后做桌面 + 移动验收。

## 八、验收清单

完成后请至少验证：

- `npm test` 或项目现有测试命令通过；如果没有测试，说明原因。
- `node --check` / syntax check 对改动的 JS 文件通过。
- 桌面端 `http://localhost:8080`：
  - CFO 开局、事件、主动操作、预测区、日志、目标卡位置正确。
  - IM 赎回压力和目标位置正确。
  - GOV 红色风险风格明显但不糊。
- 移动端：
  - Fate Card 三大挑战完整。
  - Briefing 能完整滚动查看。
  - 指标/目标/操作/市场变化不重叠。
  - modal 可滚动且按钮可点。
- Round3:
  - Operation Modal / Toast / Crisis Modal 都能触发。
- Round4:
  - 通关/失败终局页能展示。
  - 排行榜 modal 能打开。
  - 分享卡片能展示或生成 DOM 截图入口。

## 九、交付说明

交付时请告诉用户：

- 修改了哪些文件。
- 哪些 Claude Design 内容已经落地。
- 哪些只是视觉参考、暂未完全实现。
- 如何启动本地预览。
- 验证命令和结果。

