# Round 5 - Design System Summary

Date: 2026-05-02
Source: Claude Design project `债市生存游戏 UI Redesign`

## 完成状态

Round 5 已完成。Claude Design 生成：

- `DesignSystem.md`

该文件在 Claude Design 项目内可见，内容为开发导向的设计系统文档。

## 核心内容摘要

### 1. Color Tokens

覆盖：

- Background layers：base / surface / elevated / overlay。
- Text layers：primary / secondary / tertiary / disabled。
- Role accents：CFO cyan / IM gold / GOV red。
- Status colors：success / warn / error / info。
- Grade colors：S / A / B / C / D。
- Risk colors：normal / warning / crisis。

关键实现原则：

- 在屏幕根节点设置 `data-role="cfo" | "im" | "gov"`。
- 组件内部读取 `var(--role)`，不要各处硬编码角色色。
- 危机态只保留 normal / warning / crisis 三层，不新增第四层严重程度。

### 2. Typography

建议：

- 中文 UI：`PingFang SC`，Windows fallback `Microsoft YaHei`。
- 数字/ID/meta：`SF Mono` / `JetBrains Mono` / `Menlo`。
- 全局数字启用 tabular nums。
- 尺寸覆盖 10 / 11 / 12 / 14 / 16 / 18 / 22 / 32 / 96 / 220。
- 权重只用 400 / 500 / 600。

设计原则：

- 终端密度来自“小号 meta + 大号数字 + 清楚中文正文”，不是把所有文字都压小。

### 3. Spacing / Radius / Shadow

Spacing scale：

- 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64。

Radius：

- 小标签接近 2-4px。
- 常规 card/control 约 6px。
- Modal/顶层 panel 约 10px。

Shadow：

- in-flow card 尽量用边框而不是厚阴影。
- modal 使用角色 glow。
- crisis modal 使用红色 glow 和强遮罩。

### 4. Core Components

Claude Design 文档覆盖 12 个组件：

- Button
- MetricCard
- EventCard
- ChoiceButton with preview
- ActionStrip
- PressureCard
- GoalCard
- Modal
- Toast
- LeaderboardTable
- RoleBadge
- SegmentedTabs

每个组件包含 purpose、visual anatomy、variants、responsive behavior、implementation notes。

### 5. Responsive Strategy

Breakpoints：

- mobile < 640
- tablet 640-1024
- desktop > 1024

策略：

- 桌面端使用三栏终端布局。
- 移动端改为分段/横向切换 + 自然纵向滚动。
- 不要为了一屏展示牺牲可读性。

### 6. Micro-interactions

建议落地：

- 指标值变化：约 200ms ease。
- 选择卡 hover / selected 状态。
- Toast enter / exit。
- Crisis modal entrance。
- End screen grade reveal。

## 给开发的落地提示

- 先抽 token，再改组件，避免颜色和间距继续散落。
- 角色色要从根节点继承。
- 保留高信息密度，但压缩留白时不要让中文说明低于可读尺寸。
- 不要转成卡通、营销 hero、低密度 SaaS dashboard。

