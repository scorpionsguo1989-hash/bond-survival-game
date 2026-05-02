# Claude Design Round 3-5 续跑 Prompt

Date: 2026-05-02
Project: `/Volumes/D盘/claude code/工作区/债券生存游戏`
Claude Design project: `债市生存游戏 UI Redesign`

## 使用方式

不要继续点旧 Round 3 的 `Retry`。旧任务已经两次卡住：

- 2026-05-01：触发 Claude Design 独立 usage limit。
- 2026-05-02：点击 Retry 后停在 `Searching tokens.css / Writing overlays.css`，没有生成 `Overlays` 文件列表，继续等待会消耗 Claude Design usage。

建议按下面顺序手动调用：

1. 先发 `Round 3 窄化版 Prompt`，只做 Overlays，不让它继续搜索旧 token。
2. Round 3 成功后，再发 `Round 4 Prompt`。
3. Round 4 成功后，再发 `Round 5 Prompt`。
4. 每一轮完成后，把设计说明、文件名、截图结果补回 `docs/design_outputs/`。

---

## Round 3 窄化版 Prompt

```text
Round 3 resume with narrow scope.

Important:
- Do NOT retry the old blocked run.
- Do NOT keep searching existing token files.
- Do NOT edit Main UI.html, Fate Card.html, main-ui.jsx, fate-card.jsx, main-ui.css, fate-card.css, or tokens.css.
- Create only new overlay files.
- Stop after Round 3. Do NOT start Round 4.

Use this known visual language directly:
- Dark financial terminal background: #070b12 / #0f1623 surfaces.
- Thin borders, dense panels, 4-8px radius.
- Mono numeric typography.
- CFO accent: #4fc3f7.
- IM / PM accent: #ffd54f.
- GOV accent: #ef5350.
- Status colors: success green, warning amber, error red, info cyan.
- Style should feel like a Chinese bond-market risk terminal, not generic SaaS.

Create new files:
- Overlays.html
- overlays.jsx
- overlays.css

Build only these Round 3 overlay component artboards:

1. Operation Input Modal, CFO desktop + mobile.
Scenario: player clicks "申请银行续贷" and must input amount from 0.5 to 5 亿.
Required elements:
- Title: "申请银行续贷"
- One-line operation description.
- Numeric input with label "借款金额（亿）" and min/max hint "0.5-5 亿".
- Slider for amount selection.
- Secondary block "预计影响": show cash +X / creditUsed -Y / financingCost +Z.
- Buttons: 取消 / 确认.
- It must feel like a serious terminal transaction confirmation, not a normal web form.

2. Toast notifications, desktop + mobile.
Create 3 variants:
- success: green border/icon/check, for operation success.
- error: red border/icon/x, for validation or failure.
- info: cyan border/icon/i, for autosave or leaderboard submission.
Placement:
- Desktop: top-right floating stack.
- Mobile: top drop-down, full-width safe inset.
Behavior notes:
- Auto-dismiss after 3 seconds.
- Manual close button.
- Support one-line and two-line copy.

3. Crisis Modal, IM desktop + mobile + GOV desktop.
Use 3 example triggers:
- CFO cash < 0.5 亿.
- IM 赎回压力 >= 80.
- GOV 隐债敞口 > 200 亿.
Required visual structure:
- Full-screen translucent dark red mask.
- Top red banner: "危机警报 · 时间暂停 · 必须处置后继续".
- Main card with title + description.
- Three key metrics, each label + value.
- Three resolution option cards, each with label, cost tag, description, and predicted effects.
- Option cards must feel weighty and high-stakes. They are not simple buttons.

Output requirements:
- At least 6 artboards total.
- Desktop and mobile versions for OperationModal, Toasts, and CrisisModal.
- Use CFO / IM / GOV examples across the set.
- Mobile text must be legible with no overlaps.
- Modal must fit viewport.
- Toast placement must be clear.
- Crisis red urgency must be strong.
- Run one concise verifier pass and report the result.
```

## Round 3 本地归档要求

完成后保存：

- 设计说明：`docs/design_outputs/round3.md`
- 截图：`docs/design_outputs/images/round3/`
- 如果 Claude Design 产出代码：`docs/design_outputs/code/round3/`

---

## Round 4 Prompt

```text
Round 4: Endgame, Leaderboard, and Share Card.

Important:
- Keep Round 1 Fate Card and Round 2 Main UI unchanged.
- Use the same dark Chinese bond-market terminal style.
- Use CFO cyan / IM gold / GOV red role accents.
- Create only endgame-related design files.
- Do not start Round 5.

Create new files:
- Endgame.html
- endgame.jsx
- endgame.css

Design 3 endgame-related surfaces:

1. End Screen, desktop + mobile.
Required elements:
- Top status: "成功通关" or "中途失败" with death reason.
- Giant grade: S / A / B / C / D, 96px+ on desktop.
- Grade label, e.g. "流动性守夜人".
- Total score: xx / 100.
- Ranking highlight: "你的排名：第 5 名", gold.
- Role info: platform name, role name, survived quarters.
- Six-dimensional radar chart.
  For IM labels use:
  "流动性管理 / 收益管理 / 信用筛选 / 合规指数 / 危机应对 / AUM稳定性".
- CTA buttons:
  "再来一局" primary
  "排行榜"
  "生成分享卡片"

2. Leaderboard Modal, desktop + mobile.
Required elements:
- Title: "排行榜 · Top 20".
- Close X.
- Tabs: 全部 / 财务总监 / 投资经理 / 地方官员.
- Table columns:
  排名 / 角色 / 昵称 / 平台 / 难度 / 评级 / 总分 / 存活季度.
- Highlight the current player's own row.
- Empty state: "暂无记录，等你来创造历史".
- Mobile table must remain readable: use compact rows or horizontally scrollable terminal table.

3. Share Card, fixed 750 x 1200.
Required elements:
- Top logo or text mark + subtitle, e.g. "搞债 · 财务总监模式".
- Huge grade, 200px+.
- Grade label.
- Total score, 60px, with "总分（满分100）".
- Platform name + role image or role badge.
- Pass/fail status.
- Six-dimensional score list with labels, values, and progress bars.
- Bottom watermark: "搞债公众号出品 · 长按识别打开游戏".
- It should be instantly screenshot/share worthy.

Output requirements:
- At least 5 artboards total:
  End Screen desktop/mobile,
  Leaderboard desktop/mobile,
  Share Card 750x1200.
- Include examples across CFO / IM / GOV where useful.
- Text must not overlap on mobile.
- Run one concise verifier pass and report the result.
```

## Round 4 本地归档要求

完成后保存：

- 设计说明：`docs/design_outputs/round4.md`
- 截图：`docs/design_outputs/images/round4/`
- 如果 Claude Design 产出代码：`docs/design_outputs/code/round4/`

---

## Round 5 Prompt

```text
Round 5: Design System Summary.

Based on the completed Fate Card, Main UI, Overlays, and Endgame work, output a complete design system document for developers.

Important:
- Do not create new product screens.
- Do not redesign prior artboards.
- Output as Markdown.
- If useful, include CSS variable snippets, but keep the document implementation-oriented for vanilla JS + hand-written CSS.

Include:

1. Color tokens
- Background layers: base / surface / elevated / overlay.
- Text layers: primary / secondary / tertiary / disabled.
- Role accents: CFO / IM / GOV.
- Status colors: success / warn / error / info.
- Grade colors: S / A / B / C / D.
- Risk colors: normal / warning / crisis.

2. Typography
- Chinese UI font recommendation.
- Mono numeric font recommendation.
- Font size scale:
  10 / 11 / 12 / 14 / 16 / 18 / 22 / 32 / 96 / 220.
- Font weight rules:
  light / regular / bold.
- Rule: terminal density with readable Chinese text.

3. Spacing, radius, shadow
- Spacing scale:
  4 / 8 / 12 / 16 / 20 / 24 / 32 / 48.
- Radius scale:
  2 / 4 / 6 / 8 / 12.
- Shadow levels:
  subtle / card / modal / crisis.

4. Core components
Document 8-12 components:
- Button: primary / secondary / danger.
- MetricCard.
- EventCard.
- ChoiceButton with preview.
- ActionStrip.
- PressureCard for IM.
- GoalCard.
- Modal.
- Toast.
- LeaderboardTable.
- RoleBadge.
- SegmentedTabs.

For each component include:
- Purpose.
- Visual anatomy.
- Variants.
- Responsive behavior.
- Implementation notes.

5. Responsive breakpoints
- mobile < 640.
- tablet 640-1024.
- desktop > 1024.
- Key layout strategy:
  desktop three-column terminal -> mobile segmented/horizontal section switching, with natural page scroll.

6. Micro-interactions
- Metric value change animation, about 200ms ease.
- Choice hover / selected state.
- Toast enter/exit.
- Crisis modal entrance.
- End screen grade reveal.
- Things not to do:
  no cartoon style,
  no marketing hero,
  no oversized decorative gradients,
  no low-density SaaS dashboard conversion.

Output file target:
- DesignSystem.md or round5_design_system.md.
```

## Round 5 本地归档要求

完成后保存：

- `docs/design_outputs/round5_design_system.md`
- 如有 CSS variables：`docs/design_outputs/code/round5/`

---

## 最终汇总更新

全部完成后更新：

- `docs/design_outputs/Claude_Design_产出汇总.md`

至少写明：

- Round 3 / 4 / 5 完成状态。
- 文件清单。
- 关键设计决策。
- 哪些内容建议交给 Claude Code 落地。
- 哪些内容只作为视觉参考，不要逐字照抄。
