# Claude Design Round 6 · Home Page 重设计 Prompt

Date: 2026-05-03
Project: `/Volumes/D盘/claude code/工作区/债券生存游戏`
Claude Design project: `债市生存游戏 UI Redesign`

## 背景

当前游戏首页（`css/home.css` + `js/home.js`）是 cc 一小时撸出的 MVP，能用但视觉过于朴素 ——
**没有 Round 1-5 那种密度感和戏剧性**，跟 fate-card / main-ui 不在一个层级。

主站 → 游戏的入口节点，需要一秒钟把玩家"推进战场氛围"。
现在的 MVP 太"产品化"，缺少游戏的能量。

## 使用方式

直接发下面的 prompt 给 Claude Design，让它做 Round 6。
完成后把 `Home.html` / `home.css` / `home.jsx` 拷到 `docs/design_outputs/`，
cc 拿到稿子后会按 1:1 落地（替换当前的 `css/home.css`）。

---

## Round 6 Prompt（直接粘给 Claude Design）

````text
Round 6: Game Home Page (启动门面 / Landing screen).

Context:
- This is the entry screen when player lands on /game from the main site.
- Continuing visual language from Round 1-5 (Fate Card, Main UI, Endgame, Overlays).
- Current MVP is too plain — needs upgrade to the same density / drama level
  as Fate Card and Endgame.

Do NOT:
- 不要修改任何已存在的 css/js（fate-card.css, main-ui.css, endgame.css, overlays.css,
  tokens.css 等都已锁死）。
- 不要引入新字体 / 新图片资产（只能用 assets/brand-avatar.png, assets/brand-qr.jpg）。
- 不要做"3 角色介绍卡"、"玩法 3 步"、"上次战绩"等次要内容
  —— 保持 MVP 范围，only Hero + entry。
- 不要 lorem ipsum，全部用真实文案（下方提供）。

DO create new artboard files:
- `Home.html`           — 静态 demo，self-contained，可双击打开预览
- `home.jsx`            — React component 描述（可选，方便 cc 落地参考结构）
- `home.css`            — 拆出来的 CSS，cc 会直接覆盖项目里的 css/home.css

Required content（必含元素）:

1. **顶栏 (.home-topbar)**
   - 左：● BOND·SURVIVE （绿点 = LIVE，golden hint）
   - 右：日期 + "搞债 OUT" / "VOL.0X · NO.0X" 杂志感角标

2. **Hero 中段 (.home-hero)**
   - eyebrow（金色 mono 小字）：YEAR 1 · Q4 · ALPHA BUILD
   - 巨大主标题 "搞债"（中文双字，至少 168px desktop）
     · 第一字 "搞" 用主文本色
     · 第二字 "债" 用金色 + 发光阴影
     · 字间距 ≥ 0.12em，让两字感觉是"双 logo"
   - 副标 "BOND · SURVIVE"（mono，全大写，0.42em letter-spacing）
   - 金色横线 divider（80-120px）
   - tagline（金色 24-28px）："在 12 季度里活下来"
   - pitch 副文案（text-2 颜色 16px，1-2 行）：
     "你扮演中国债券市场一线人 —— 城投 CFO、债券基金经理、地方官员。
      做出每一个决定，承担每一个后果。"
   - **主 CTA**：「▶  开始游戏  →」
     · 金色描边 + 渐变底
     · hover 金色扫光（已有简单版，可加强）
     · 高度 ≥ 60px，按钮要"重"
   - 数字勾子（CTA 下方，4 项横排）：
     "3 角色 · 4 剧本 · 30 段历史 · 12 季生存挑战"
     · 数字用大字号（28-36px）+ 金色发光，旁边 mono 小字 label

3. **二级入口 (.home-secondary)**
   - 「查看排行榜 [L]」（带键盘快捷键标记）
   - 「关注「搞债」公众号」
   · 透明底 + 1px 描边，hover 金色

4. **底栏 (.home-foot)**
   - 左：搞债 · 一个搞债人的实验室
   - 右：v1.2 · CONTENT VAULT（版本号 + build name）

Visual Punch（必须升级，让首页有戏剧性）:

- **背景层次**：除了现有 radial gradient，加一层很淡的"市场数据底纹"
  · 选 1：candlestick / 散点 / 折线 暗纹（非常淡，opacity 0.04-0.08）
  · 选 2：terminal grid lines + 偶发数据点流动
  · 选 3：很淡的"搞债" 水印重复在底层（journal 风）
- **"搞债" 主标题装饰**：
  · 第一种：双字下方加一条金色细线 + 两端十字标识（terminal hairline）
  · 第二种：金色 "债" 字背后有微弱的 candlestick 阴影
  · 第三种：两字之间加竖线分隔符（书法落款风）
- **数字勾子升级**：
  · 4 个数字之间加竖线分隔
  · 数字 hover 时发光增强 + tooltip 微浮（"30 段历史 = 4 万亿到化债 2.0"）
- **CTA 按钮升级**：
  · 周围一圈微弱的脉冲光晕（不闪眼）
  · 左右两端有 "[ ]" 像 terminal 命令的方括号包裹
- **底部装饰**：
  · 一行很淡的 mono fake-quote 流：
    "T+0  CHN-CITY-AAA  3.84  -2bp   ·   CHN-CITY-AA  4.62  +3bp   ..."
  · 缓慢从右往左滚动 / 或者静态显示

Style anchors（沿用 tokens.css，**严格用变量**）:

- 背景: `var(--bg-1)` (#070b12) → `var(--bg-2)` (#0f1623) 渐变
- 金色: `var(--gold)` (#ffd54f) + glow `rgba(255, 213, 79, 0.18-0.32)`
- 角色色（仅装饰用）:
  - CFO: `var(--info)` (#4fc3f7)
  - IM:  `var(--gold)` (#ffd54f)
  - GOV: `var(--danger)` (#ef5350)
- 字体:
  - mono: `var(--font-mono)` ("SF Mono", monospace)
  - sans: `var(--font-sans)` ("PingFang SC", system-ui, sans-serif)
  - display: `var(--font-display)` (放主标题用)
- 间距: `var(--sp-3)` 12 / `--sp-4` 16 / `--sp-5` 24 / `--sp-6` 32 / `--sp-7` 48
- 圆角: `var(--r-sm)` 4 / `--r-md` 6 / `--r-lg` 10
- 描边: `var(--line)` (rgba 弱) / `var(--line-strong)` (rgba 中)

Layout:
- Desktop first (1280-1920px)，Hero 居中铺满整屏
- Tablet (720-1280px)：主标题缩到 120px
- Mobile (< 720px)：
  - 主标题缩到 84px
  - 数字勾子可以堆 2 行（2x2）
  - 二级入口堆叠（max-width 280px）
  - CTA 仍要明显（min height 56px）

Reference vibes（找这种感觉）:
- Bloomberg Terminal 启动屏（密度高、金融感、信息分层）
- 经典电影海报排版（中文大字 + 一句 tagline 那种 confident statement）
- 暗黑系游戏开场（Hades / Disco Elysium 那种"你即将进入一个世界"的氛围）
- **不要**：SaaS / Linear / Notion / Vercel 那种纯产品风（没有戏剧性 + 没有圈内身份感）

文案（写真，不用 placeholder）:

| 槽 | 文本 |
|---|---|
| eyebrow | YEAR 1 · Q4 · ALPHA BUILD |
| 主标题 | 搞 债 |
| 副标 | BOND · SURVIVE |
| tagline | 在 12 季度里活下来 |
| pitch | 你扮演中国债券市场一线人 —— 城投 CFO、债券基金经理、地方官员。<br>做出每一个决定，承担每一个后果。 |
| CTA | ▶  开始游戏  → |
| 数字勾子 | 3 角色 · 4 剧本 · 30 段历史 · 12 季生存挑战 |
| 二级 1 | 查看排行榜 [L] |
| 二级 2 | 关注「搞债」公众号 |
| 底栏左 | 搞债 · 一个搞债人的实验室 |
| 底栏右 | v1.2 · CONTENT VAULT |
| topbar 右 | 2026.05.03 · 搞债 OUT |

Stop after Round 6. Do NOT start any other round.
````

---

## 落地约定

Claude Design 完成后：

1. **产物归档**：
   - `Home.html` → `docs/design_outputs/Home.html`
   - `home.css` → `docs/design_outputs/home.css`
   - `home.jsx` → `docs/design_outputs/home.jsx`（如果有）

2. **cc 落地动作**（用户给信号后 cc 自动做）：
   - `cp docs/design_outputs/home.css css/home.css`（替换 MVP 版）
   - 检查 `js/home.js` HTML 结构是否还匹配新 CSS class，必要时调整
   - 浏览器强刷验证 + 截图给用户看
   - 通过后 `git commit` + 备份

3. **如果 Claude Design 加了新元素需要 JS 交互**（例如数据流滚动），
   cc 在 home.js 里加对应 JS（例如 `requestAnimationFrame` 滚动 fake quotes）

## 风险提示

- 这次只动 home，不要让 design 顺手"统一全站"——之前的 Round 1-5 已经锁死了。
- 如果 design 给的稿子用了项目里没有的 CSS 变量（比如 `--bg-3` 不存在），cc 落地时会用 fallback 替换，不要等。
- 如果 design 加了图片素材（如 SVG icon），cc 会评估是否需要新建 `assets/icons/`。

## 完成后通知 cc

> "Round 6 设计稿已出，文件放到 `docs/design_outputs/Home.*`，开始落地"
