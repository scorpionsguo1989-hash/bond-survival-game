# Round 4 - Endgame / Leaderboard / Share Card

Date: 2026-05-02
Source: Claude Design project `债市生存游戏 UI Redesign`

## 完成状态

Round 4 已完成。Claude Design 生成：

- `Endgame.html`
- `endgame.jsx`
- `endgame.css`

Claude Design 最终提示：`Round 4 complete. All 12 artboards verified clean`.

## 设计内容

### 1. End Screen

- 通关 / 失败两种状态。
- 大号终局评级：S / A / D 等。
- 终局文案：成功通关、失败原因、复盘句。
- 关键数据：总分、排名、平台、角色、存活季度、难度。
- CTA：再来一局、排行榜、生成分享卡片。
- 六维能力评估：维度名称、分数、等级。

覆盖样例：

- IM 桌面，通关，S 评级。
- CFO 桌面，通关，A 评级。
- GOV 桌面，中途失败，D 评级。
- IM 移动，通关，S。
- CFO 移动，失败，C。

### 2. Leaderboard Modal

- Top 20 排行榜表格。
- Tab：全部 / 财务总监 / 投资经理 / 地方官员。
- 当前玩家行高亮。
- 移动端表格用横向滚动策略，不压缩到不可读。
- 空状态带终端风格提示。

### 3. Share Card

- 750 x 1200 竖版分享卡。
- 角色 tint + 大号评级。
- 终局称号、复盘句、六维能力条、分数/排名/角色信息。
- QR/水印区域作为占位，后续可接真实二维码。

覆盖样例：

- IM 通关 S。
- CFO 通关 A。
- GOV 失败 D。

## Verifier 修正记录

Claude Design verifier 初查后做了两轮修正：

- Radar：缩小半径并扩大 label offset，避免 `AUM稳定性` 等中文标签贴边。
- Rank pill：增加 `white-space: nowrap` 和 `flex-shrink: 0`。
- Radar SVG viewBox 增加左右 padding，最终 verifier clean。

## 给开发的落地提示

- 不要把终局页做成单纯弹窗；它是完整游戏结果界面。
- 排行榜必须保留当前玩家高亮。
- 分享卡可以先做 DOM/HTML 截图入口，真实二维码后接。
- 移动端优先可读和可滚动，不要强行把表格缩小。

