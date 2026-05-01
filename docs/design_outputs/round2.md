# Round 2 - 主界面设计归档

Date: 2026-05-01
Source: Claude Design project `债市生存游戏 UI Redesign`

## 完成状态

Round 2 已完成主界面骨架设计，并经过多轮用户反馈修正。Codex 未修改项目源代码，只通过 Claude Design 交互并归档结果。

## 主要产出

Claude Design 创建了主界面设计稿，覆盖 CFO / IM / GOV 三个角色的桌面与移动版本。主界面保持深色金融终端风格，统一使用同一套骨架，只切换角色内容。

最终用户确认的主结构：

- 桌面三栏：左侧角色状态，中间事件与决策，右侧图表与市场脉冲。
- CFO / GOV 左栏顺序：`我的指标` -> `本局目标`。
- IM 左栏顺序：`我的指标` -> `赎回压力` -> `本局目标`。
- 中栏顺序：事件卡 -> 事件选项 B/C/D -> 最近 LOG -> 主动操作 A1-A5 -> 季末预演 -> 决策日志。
- 右栏：角色图表两张 + 市场脉冲，不再放目标卡。
- 移动端使用分段页签/横向切换思路：`事件 / 操作`、`指标 / 日志`、`目标 / 风险`，避免长页面一次性堆满。

## 用户反馈与修正记录

1. 用户指出桌面主界面留白过大，主动操作被挤到左栏下方，阅读动线弱。
   - 修正为：主动操作移动到中栏事件下方，成为主决策流的一部分。

2. 用户建议移动端的 `目标 / 操作 / 市场变化` 不要简单上下堆叠。
   - 修正为：移动端采用分段 tabs / 横向切换结构，首屏优先展示事件和可操作选择。

3. 用户指出 `本局目标` 放在右栏不符合角色状态阅读逻辑。
   - 修正为：CFO/GOV 的目标放在我的指标下方；IM 的目标放在赎回压力下方。

4. 用户指出 IM `持仓评级 / AA 及以下 56%` 的 donut 太小。
   - Claude Design 尝试将 donut 半径与面板高度放大。
   - 用户随后决定：“donut 自身半径太小后续我们自己调整”，因此该项不继续消耗设计轮次。

## 已知保留事项

- Donut 图表半径/显示比例仍可后续由开发者手动调整。
- Round 2 仅为设计产出，未由 Codex 落地到项目源码。

## 截图证据

- `docs/design_outputs/images/round2/round2_mainui_desktop_visible.png`
- `docs/design_outputs/images/round2/round2_mainui_mobile_section_visible.png`
- `docs/design_outputs/images/round2/round2_mainui_im_redemption_visible.png`
- `docs/design_outputs/images/round2/round2_mainui_mobile_top_visible.png`
- `docs/design_outputs/images/round2/round2_mainui_mobile_cards_visible.png`
- `docs/design_outputs/images/round2/round2_refined_desktop_actions_under_event_cfo.png`
- `docs/design_outputs/images/round2/round2_refined_desktop_im_no_blank.png`

