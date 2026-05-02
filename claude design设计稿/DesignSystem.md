# 债市生存游戏 · Design System

> A terminal-style dark UI for a Chinese bond-market survival game.
> Three roles: **CFO** (城投财务总监) / **IM** (债券基金经理) / **GOV** (地方政府官员).
> All values below are already in `tokens.css`; this document is the contract.

---

## 0 · Aesthetic in one paragraph

Bloomberg-terminal density meets Chinese financial reading habits. Dark base, tabular monospace numerics, dashed dividers, narrow letter-spacing on Chinese text and wide letter-spacing on Latin all-caps meta. No gradients larger than a 2px rail, no rounded "card" shadows above modal scope, no emoji, no cartoon iconography. Color is functional: role accent identifies *who* you are, status color identifies *how it's going*, grade color identifies *the verdict*.

---

## 1 · Color Tokens

### 1.1 Background layers

| Token | Value | Use |
|---|---|---|
| `--bg-0` | `#07090f` | Outer canvas / off-screen scrim base |
| `--bg-1` | `#0a0e1a` | App background |
| `--bg-2` | `#10162a` | Surface / panel / card |
| `--bg-3` | `#161e35` | Elevated · row hover · button hover |
| `--bg-4` | `#1d2742` | Border-as-fill / strong divider |

Use `--bg-1` as the page, `--bg-2` for panels and modals, `--bg-3` for hover/selected. Modals overlay a scrim of `rgba(4,6,12,0.72)` with `backdrop-filter: blur(2px)`.

### 1.2 Text layers

| Token | Value | Use |
|---|---|---|
| `--text-1` | `#e6ebf5` | Primary text · numbers · titles |
| `--text-2` | `#98a3bd` | Secondary text · descriptions |
| `--text-3` | `#5b667f` | Tertiary · meta · ALL-CAPS labels |
| `--text-4` | `#38415a` | Disabled · decoration · grid ticks |

Disabled state = `--text-4` text on `--bg-2` background, with `cursor: not-allowed`. Never color disabled controls — desaturate them.

### 1.3 Role accents

| Role | Token | Hex | When |
|---|---|---|---|
| CFO | `--role` (cyan) | `#4fc3f7` | 城投财务总监 — liquidity, banks |
| IM  | `--role` (gold) | `#ffd54f` | 债券基金经理 — alpha, NAV |
| GOV | `--role` (red)  | `#ef5350` | 地方政府官员 — fiscal, hidden debt |

Each role brings four CSS vars that any component reads:

```css
[data-role="cfo"] {
  --role:      #4fc3f7;
  --role-soft: rgba(79, 195, 247, 0.12);
  --role-line: rgba(79, 195, 247, 0.32);
  --role-glow: rgba(79, 195, 247, 0.18);
}
[data-role="im"]  { --role: #ffd54f; --role-soft: rgba(255,213,79,0.10); --role-line: rgba(255,213,79,0.36); --role-glow: rgba(255,213,79,0.16); }
[data-role="gov"] { --role: #ef5350; --role-soft: rgba(239,83,80,0.10); --role-line: rgba(239,83,80,0.36); --role-glow: rgba(239,83,80,0.18); }
```

**Rule:** put `data-role` on the highest container that owns the screen (modal root, app root). Components inside read `var(--role)` and never hardcode the accent.

### 1.4 Status colors

| Token | Value | Meaning | Typical use |
|---|---|---|---|
| `--ok`     | `#4caf50` | success / cash healthy | Toast.success, up arrows, "通关" badge |
| `--warn`   | `#ffb74d` | warning / approaching limit | Mid-grade dimensions, 接近触线 metrics |
| `--danger` | `#ef5350` | error / breach / death | Toast.error, crisis banner, fail screen |
| `--info`   | `#4fc3f7` | informational | Toast.info, neutral system messages |
| `--gold`   | `#ffd54f` | reward / rank highlight | Leaderboard `me` row, top-3 ranks |

> `--info` and the CFO accent are the same hex — that's intentional (CFO **is** the "informational" role color); never put a blue info toast on top of a CFO modal at the same time.

### 1.5 Grade colors

Used in EndScreen, ShareCard, LeaderboardTable.

| Grade | Color | Token |
|---|---|---|
| **S** | gold     | `var(--gold)`   `#ffd54f` |
| **A** | cyan     | `var(--info)`   `#4fc3f7` |
| **B** | green    | `var(--ok)`     `#4caf50` |
| **C** | orange   | `var(--warn)`   `#ffb74d` |
| **D** | red      | `var(--danger)` `#ef5350` |

In EndScreen the giant grade glyph uses the **role accent**, not the grade color, because the grade label already conveys verdict — coloring the glyph by role keeps the screen identifiable across runs. The per-dimension `S/A/B/C/D` chips inside cards *do* use grade colors.

### 1.6 Risk colors (game state)

A semantic alias for the three pressure levels every system shows:

| State | Color | Use |
|---|---|---|
| normal  | `--text-2` for label, `--text-1` for value | Default metric |
| warning | `--warn` | Crossing 70% of a limit, yellow banner |
| crisis  | `--danger` | Breach, sev-1 modal, full-screen red wash |

Crisis level adds: top-of-viewport red banner (`linear-gradient` red 42%→18%), `radial-gradient` scrim, pulsing red dot, and modal border `rgba(239,83,80,0.45)`. Don't invent a fourth severity.

---

## 2 · Typography

### 2.1 Families

```css
--font-sans:    -apple-system, BlinkMacSystemFont, "PingFang SC",
                "Microsoft YaHei", "Segoe UI", system-ui, sans-serif;
--font-mono:    "SF Mono", "JetBrains Mono", "Cascadia Code",
                "Menlo", "Consolas", ui-monospace, monospace;
--font-display: "SF Mono", "JetBrains Mono", ui-monospace, monospace;
```

- **Chinese UI**: `PingFang SC` (macOS/iOS) → `Microsoft YaHei` (Windows). Falls back through system stacks. Do NOT load a webfont for CJK — the latency cost outweighs the visual gain on a terminal aesthetic.
- **Latin/Numbers/Mono**: `SF Mono` → `JetBrains Mono` → `Menlo`. Used for *every* number, every ID, every meta label, and every uppercase Latin tag (e.g. `OPS · OP-2023Q2-0417`).
- **Display**: same as mono — the giant `S` / `A` / `92` are mono glyphs scaled up. Never use a serif or display webfont.

Always enable tabular numerics globally:

```css
.mono, .num, [class*="num"] {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1;
}
```

### 2.2 Size scale

| px  | Token         | Use |
|----:|---------------|---|
|  10 | `--fs-xs`     | ALL-CAPS meta labels, tag chips, table header (`letter-spacing: 0.18–0.22em`). Never plain Chinese. |
|  11 | —             | Mono meta runners, footer hints, leaderboard cells on mobile |
|  12 | `--fs-sm`     | Secondary text, table cell, dim list rows |
|  14 | —             | Buttons, Chinese body inside dense rows |
|  16 | `--fs-body`   | Default Chinese body (`15` is also valid; the token is `15px`) |
|  18 | —             | Modal title, leaderboard title |
|  22 | `--fs-h2`     | Card title, metric value in CrisisModal |
|  32 | `--fs-h1`     | Page title, EndScreen total score |
|  96 | (mobile grade)| EndScreen mobile grade glyph (~112px in code) |
| 220 | `--fs-display`| ShareCard giant grade (240px in code), terminal "money shot" only |

### 2.3 Weight rules

Only three weights ship:

- **400 regular** — body, descriptions, table cells, secondary
- **500 medium** — primary text, button labels, metric numbers, anything that needs to stand against `--text-2` siblings
- **600 semibold** — titles, role badges, grade labels, "ME" tag, the giant grade glyph

No 300/light. No 700/bold. No italics anywhere except `<em>` inside crisis copy where it overrides to `font-style: normal` and uses `--danger` color — italics on Chinese render terribly.

### 2.4 Letter-spacing rule

| Content | Spacing |
|---|---|
| Chinese body / titles | `0.01em` to `0.04em` (very tight; CJK has built-in metrics) |
| Latin all-caps meta   | `0.16em` to `0.22em` (the wider, the more "terminal") |
| Mono numbers          | `0.01em` to `0.02em` |
| Display grade glyph   | `-0.03em` to `-0.04em` (tighten to feel monumental) |

### 2.5 Density rule

Terminal density means **lots of small mono runners around fewer big numbers**. The hierarchy is always: `[10px UPPERCASE LABEL] → [22–32px MONO VALUE] → [12px Chinese description]`. If you find yourself reaching for a 16px Chinese label above a 14px number, you've inverted the ladder.

---

## 3 · Spacing · Radius · Shadow

### 3.1 Spacing scale (8px-ish baseline)

```css
--sp-1:  4px;   /* gap inside a chip, between icon and text */
--sp-2:  8px;   /* default internal gap */
--sp-3: 12px;   /* card inner padding small axis */
--sp-4: 16px;   /* default card padding, modal section gap */
--sp-5: 24px;   /* between major panels */
--sp-6: 32px;   /* page padding desktop, between tall sections */
--sp-7: 48px;   /* hero / share-card outer padding */
--sp-8: 64px;   /* rare; only ShareCard / extra-tall hero blocks */
```

20px is **not** in the scale on purpose — splitting between 16 and 24 is enough. If you need 20, reach for 16 first.

### 3.2 Radius scale

```css
--r-sm:  4px;   /* tags, chips, ALL-CAPS pills, table corners */
--r-md:  6px;   /* default control / card / mobile modal */
--r-lg: 10px;   /* desktop modals, top-level panels */
--r-xl: 14px;   /* reserved; not used in shipped surfaces */
```

`2px` is for sharp tag-style chips with role-line borders (`opm-tag`, `cm-sev`, `lb-tag`). `8px` and `12px` aren't on the scale — they round too "consumer-app-y" for this aesthetic.

### 3.3 Shadow levels

| Level | Value | When |
|---|---|---|
| **subtle** | none — use a 1px border in `--line-strong` instead | Any in-flow card |
| **card**   | `0 8px 18px rgba(0,0,0,0.45)` | Floating toasts |
| **modal**  | `0 0 0 1px rgba(0,0,0,0.4), 0 24px 48px rgba(0,0,0,0.55), 0 0 28px var(--role-glow)` | OperationModal, Leaderboard |
| **crisis** | `0 0 0 1px rgba(0,0,0,0.5), 0 32px 64px rgba(0,0,0,0.7), 0 0 60px rgba(239,83,80,0.22)` | CrisisModal only |

The role-glow ring on modal shadow is non-negotiable — it's how role identity carries past the title bar.

```css
--line:        rgba(120, 140, 200, 0.12);  /* dashed dividers, inner lines */
--line-strong: rgba(120, 140, 200, 0.22);  /* card borders, table column rules */
```

---

## 4 · Core Components

> All components are vanilla DOM. Class names below are the actual production classes from the four built rounds.

### 4.1 Button — `.opm-btn` / `.es-cta` / `.cm-opt-cta`

**Purpose** — the primary affordance for *applying* a numeric or single-choice action.

**Anatomy** — flat rectangle, 1px top accent rail (only on primary), icon-arrow + label + optional `.kbd` keyboard hint.

```
┌─────────────────────────────────────┐
│ ─── role-color rail (primary only)  │ 1px
│                                     │
│   ▶  确认执行                  ⏎    │
│                                     │
└─────────────────────────────────────┘
```

**Variants**

- `primary` — `background: var(--role-soft)`, color `var(--role)`, top rail `var(--role)`, weight 600, glow shadow on container.
- `secondary` (default) — `background: var(--bg-2)`, color `var(--text-2)`, hover → `--bg-3`. ESC/back actions.
- `danger` — same shape as primary but `background: rgba(239,83,80,0.16)`, color `#ffd9d8`, top rail `--danger`. Reserved for irreversible (清盘 / 退出本局).

**Responsive** — full-width on mobile (stack with `flex-direction: column`); inline on desktop with `flex: 1`.

**Notes**
- Always include the keyboard hint `<span class="kbd">⏎</span>` on the primary action; the design *expects* a discoverable shortcut.
- Never round-corner above `--r-md`; pill buttons break the terminal.

---

### 4.2 MetricCard — `.cm-metric` / `.es-meta .cell`

**Purpose** — display one named number with a trend descriptor.

**Anatomy**

```
┌──────────────────────────┐
│ 赎回压力                 │  10px UPPERCASE label, --text-3
│ 84%                      │  22px mono, --text-1 (or --danger / --warn)
│ ▲ 21 pt · 触线 80%       │  11px mono, semantic color
└──────────────────────────┘
```

Three nodes: `.k` label, `.v` value (with optional `.u` unit subscript), `.d` delta line.

**Variants** — `default` / `.warn` / `.danger`. Variant changes the value + delta colors only; the label stays neutral.

**Responsive** — desktop = horizontal grid (3 columns) with `border-left: 1px dashed`. Mobile = stack with `border-top` between rows.

**Notes**
- Always show a delta. A standalone number with no comparator violates the density rule.
- Unit (`亿`, `%`, `pt`) goes in `.u` at 12px regardless of value size.

---

### 4.3 EventCard — `.cm-head` block (used in CrisisModal headers)

**Purpose** — present a triggered event: severity tag + ID + timestamp + title + Chinese description.

**Anatomy**

```
[SEV-1 · LIQUIDITY]  [EVT-2023Q3-IM-014]            T-暂停 · 3.2s 前触发
─────────────────────────────────────────────────────────────────────
客户赎回压力骤升至 84%
上海某险资委外今日下午发起 9.5 亿 大额赎回申请。若 T+1 现金及高流动品不足……
```

**Variants** — `info` (cyan tag), `warning` (orange), `crisis` (white-on-red). The crisis variant adds `linear-gradient(180deg, rgba(239,83,80,0.10), transparent)` background.

**Responsive** — title scales 24px → 19px on mobile. Description never drops below 12.5px (the readable floor for Chinese).

**Notes**
- Always carry an ID like `EVT-YYYYQX-{ROLE}-NNN`. It's free flavor and helps QA.
- Keep `<em>` inside the description to highlight the single critical number — but only one per card.

---

### 4.4 ChoiceButton with preview — `.cm-opt`

**Purpose** — one of several reasoned choices in a crisis or operation. Shows letter key, cost class, title, description, and a preview of consequences.

**Anatomy**

```
┌──────────────────────────────────┐
│ A                  [代价 · 净值] │  letter + cost-tag
│ 折价抛售信用债                   │  14.5px 600
│ 按市价 −1.2% 卖出 7 亿城投永续…  │  11.5px desc
│ ─ 预计影响 ────────────────────  │  9px ALL CAPS
│   现金        +7.00 亿        ▲ │  pred row
│   净值        −0.84%          ▼ │
│   客户信任    −12 pt          ▼ │
│ 选择此方案                    ▶  │  cta footer
└──────────────────────────────────┘
```

Slots: `.cm-opt-key` (A/B/C, role-colored), `.cm-opt-cost` (pill), `.cm-opt-title`, `.cm-opt-desc`, `.cm-opt-pred` block (label + N rows of `pk`/`pv` with tone class `up` / `down` / `warn` / `flat`), `.cm-opt-cta`.

**Variants** — color of `.cm-opt-key` shifts to `--role` outside crisis; in crisis it's always `--danger`.

**Responsive** — desktop = 3-up grid. Mobile = 1 column. Min-height of `.cm-opt-desc` is 30px so cards in a row stay aligned even when copy varies.

**Notes**
- 1/2/3 keyboard shortcut is implied by the letter; surface it in the modal footer hint, not on each card.
- Never put more than 3 preview rows — past 3 the eye gives up.

---

### 4.5 ActionStrip — `.opm-foot` / `.es-ctas` / `.lb-foot`

**Purpose** — sticky/anchored row of 1–3 buttons closing a modal or screen.

**Anatomy** — flex row with `border-top: 1px solid --line`, each button takes `flex: 1`, separator is `border-left: 1px solid --line`. Primary button has its own top rail in role color.

**Variants**
- `2-button` — Cancel + Primary (modals).
- `3-button` — Primary + Secondary + Tertiary (EndScreen: 再来一局 / 排行榜 / 分享卡片).

**Responsive** — desktop = horizontal `flex`; mobile = vertical `flex-direction: column` with `gap: 10px` and the inner border becomes `border-top` instead of `border-left`.

**Notes**
- Primary always rightmost on desktop, topmost on mobile.
- Each button carries a `.kbd` shortcut chip — the strip is the keyboard cheat-sheet.

---

### 4.6 PressureCard (IM) — derived from `.cm-metric.danger`

**Purpose** — IM-specific tile that shows redemption pressure / NAV / cash-gap with an inline progress bar and threshold marker.

**Anatomy**

```
┌──────────────────────────────────┐
│ 赎回压力                  [SEV-1] │  label + sev tag
│ ████████████████████░░  84%      │  bar (gold/warn/danger by zone) + value
│ 触线 80% · ▲ 21 pt · T+1 缺口 6.3│  composite delta line
└──────────────────────────────────┘
```

Composes a MetricCard but adds a pressure bar:

```css
.pc-bar {
  position: relative; height: 6px;
  background: rgba(120,140,200,0.10);
  border-radius: 1px;
}
.pc-bar .fill {
  position: absolute; inset: 0 auto 0 0;
  background: var(--role);
  box-shadow: 0 0 8px var(--role-glow);
}
.pc-bar .threshold {
  position: absolute; top: -2px; bottom: -2px;
  width: 1px; background: var(--warn);
}
```

**Variants** — color of `.fill` switches to `--warn` above 60%, `--danger` above 80%. The `.threshold` tick stays orange.

**Responsive** — full width in IM main UI middle column on desktop; in mobile it occupies a single horizontal-scroll segment.

**Notes** — only IM uses this. CFO uses cash-runway tiles, GOV uses debt-to-revenue tiles. Don't reach across roles.

---

### 4.7 GoalCard — derived from `.es-meta` cell + progress bar

**Purpose** — show a season/long-term objective with progress, deadline, and reward hint.

**Anatomy**

```
┌──────────────────────────────────┐
│ S2 · OBJECTIVE                   │  10px UPPERCASE meta
│ 化债任务进度                     │  15px Chinese title
│ ████████░░░░░░░░░  42% / 65%     │  6px bar + mono value
│ T-30 天 · 完成奖励 +12 政绩      │  11px mono footer
└──────────────────────────────────┘
```

**Variants**
- `pending` — neutral colors, `--text-1` numerics.
- `at-risk` — `--warn` value + bar, deadline gets a pulsing dot.
- `breached` — `--danger` value + bar, plus a left-border accent in `--danger`.

**Responsive** — sits inside the right rail on desktop; on mobile becomes a row in the "目标" segment.

**Notes** — deadline format is always `T-N 天` or `Q{N}` — never an absolute date. The fictional clock is the contract.

---

### 4.8 Modal — `.opmodal` / `.cmodal` / `.lb-modal`

**Purpose** — block input until a decision is made.

**Anatomy**

```
┌──────────────────────────────────┐
│ ▬▬▬▬▬▬▬▬ role-rail (2px)         │  --opm-rail
│ [TAG]  ID                     ✕  │  head (dashed-bottom border)
│                                  │
│ Title (21–24px)                  │
│ Chinese description              │
│                                  │
│ — body —                         │  cards / inputs / metrics
│                                  │
│ ─────── ActionStrip ───────────  │  --opm-foot
└──────────────────────────────────┘
```

Three pieces every modal must have: 2px role-color top rail, dashed-bottom header, ActionStrip footer.

**Variants**
- `default` — width 480px, `--r-lg`, modal shadow.
- `wide` — width 720px (CrisisModal, Leaderboard).
- `mobile` — width auto, `--r-md`, max-height 88vh, body `overflow: auto`.
- `crisis` — top crisis-banner bar above modal, red shadow, scrim with red radial gradient.

**Responsive** — `transform: translate(-50%, -50%)` always; on mobile the wrapper instead pins `top: 6%` and lets the body scroll. Never full-bleed — keep the gutter so the underlying app reads as paused.

**Notes**
- ESC always cancels except in CrisisModal (which states "ESC 不可关闭" in the footer hint).
- Modals never animate from the side; only fade + 4px lift (see §6).

---

### 4.9 Toast — `.toast`

**Purpose** — non-blocking confirmation, error, info.

**Anatomy**

```
┌─────────────────────────────────────┐
│ ▌ ⓘ  [INFO] 排行榜已更新…       ⏱ ✕ │
└─────────────────────────────────────┘
```

Slots: 2px left rail in semantic color, 22px circular icon (✓/✕/i), `.meta` UPPERCASE tag, `.t1` Chinese line, optional `.t2` mono detail line, SVG ring `.timer` showing TTL, `✕` dismiss.

**Variants** — `success` (green) / `error` (red) / `info` (cyan). Variant only changes left rail, icon ring, timer stroke, and meta tag color.

**Responsive**
- Desktop: stack `.tr` (top-right) max width 360px.
- Mobile: stack `.tc` (top-center, full-width with 12px gutters).

**Notes**
- Stack max 4 visible; older toasts auto-dismiss as new ones arrive.
- Timer ring counts down — progress prop is `(timeLeft / total)`.
- Never stack a crisis-modal under a toast — toasts must mute while a Sev-1 modal is open.

---

### 4.10 LeaderboardTable — `.lb-table`

**Purpose** — Top-N table with role chip, grade chip, and a highlighted "you" row.

**Anatomy** — sticky thead with 10px UPPERCASE column labels, dashed-bottom rows, role chip in column 2, grade letter colored by §1.5 in column 6, score and `q/16` right-aligned mono.

**Variants**
- `desktop` — fixed column widths (rank 56 / role 112 / nick auto / plat 200 / diff 84 / grade 64 / score 76 / q 76).
- `mobile` — `min-width: 720px` with horizontal scroll on the wrapper; column widths preserved.
- `me-row` — `linear-gradient(90deg, rgba(255,213,79,0.16) 0%, transparent 100%)`, gold horizontal borders, `▶` glyph in column 1 (absolute-positioned), `[YOU]` mini-tag after the nickname.

**Responsive** — never collapse to cards; the table identity is the point.

**Notes**
- Top-3 ranks get specific colors: 1 gold, 2 silver `#d6dde8`, 3 bronze `#cd9b66`.
- `q < 16` adds the small red `·失` suffix.

---

### 4.11 RoleBadge — `.lb-role-chip`

**Purpose** — compact identity chip used in tables, share cards, and headers.

**Anatomy**

```
[● 投资经理]   [● 财务总监]   [● 地方官员]
```

`<span class="lb-role-chip" data-r="im|cfo|gov">` with a 5px glowing dot + Chinese label, 11px, `letter-spacing: 0.06em`, role-soft background + role-line border.

**Variants** — three roles. No size variants; if you need bigger, compose with display text alongside.

**Responsive** — size is fixed; truncate the label to 4 chars max ("投资经理" is exactly the max).

**Notes**
- Box-shadow on the dot uses `currentColor` so the glow inherits role color automatically.
- Never use the chip alone as a button — pair it with the actual control.

---

### 4.12 SegmentedTabs — `.lb-tabs`

**Purpose** — switch the data scope (全部 / CFO / IM / GOV) with role-colored underlines.

**Anatomy**

```
─────────────────────────────────────────
 全部 1082   财务总监 312   投资经理 487   地方官员 283
═════           ──────────       ▔▔▔▔▔        ▔▔▔▔▔
   ↑ active: gold rule              (inactive: transparent)
```

Each tab = mono UPPERCASE label + faint count chip; active tab gets a 2px bottom border in role color (or `--gold` for "全部"), and the count chip switches to that role color.

**Variants**
- `default` — gold active rule for "全部".
- `role-tinted` — when tab `data-role` is set, active rule pulls from that role.

**Responsive** — overflow horizontally with `overflow-x: auto`; no wrapping. On mobile counts may drop a digit (still legible because of mono).

**Notes**
- Tabs are an inline-flex row, not a grid — counts have variable width and the design wants them to breathe.
- Always show the count; a tab without a count breaks the data-density commitment.

---

## 5 · Responsive breakpoints

```css
/* mobile  */ @media (max-width: 639px)  { /* phone */ }
/* tablet  */ @media (min-width: 640px) and (max-width: 1023px) { /* iPad portrait, narrow desktop */ }
/* desktop */ @media (min-width: 1024px) { /* terminal */ }
```

### 5.1 Layout strategy

The app is a **3-column terminal on desktop** (left rail = nav + status, center = primary content + cards, right rail = meta / objectives / log). On mobile this collapses to a **single column with a top SegmentedTabs strip** that switches which "column" you're looking at — *not* a stacked scroll of all three. Within the chosen segment, the page scrolls naturally.

```
desktop                          mobile (segmented)
┌───┬─────────────┬────┐         ┌────────────────┐
│ L │     C       │ R  │         │ [L][C][R]      │  ← segmented tabs
│   │             │    │   →     │                │
│   │             │    │         │   (one column) │
│   │             │    │         │                │
└───┴─────────────┴────┘         └────────────────┘
```

Modals override the rule — they always center and stay narrow. CrisisModal is the only thing allowed to push the banner full-width.

### 5.2 Column widths (desktop)

| Region | Width |
|---|---|
| Left rail | 244px |
| Right rail | 296px |
| Center | `1fr` |
| Page padding | 24px (32px ≥1440) |

Below 1280px, the right rail collapses *first* (to a slide-over). Below 1024px, both rails collapse and the segmented switcher takes over.

### 5.3 Touch targets

- Minimum 44px tap height on any button on mobile.
- Tabs widen to 48px tall.
- Toast `✕` becomes 32×32 hit area even though the visual stays 14px.

---

## 6 · Micro-interactions

All values below; copy them verbatim.

### 6.1 Metric value change

```css
.metric-value {
  transition: color 200ms ease, transform 200ms ease;
}
.metric-value.flash-up   { color: var(--ok);     transform: translateY(-1px); }
.metric-value.flash-down { color: var(--danger); transform: translateY( 1px); }
```

JS: when a metric changes, add the flash class for 200ms then remove. Numbers themselves count from old → new over 240ms with `requestAnimationFrame` (linear is fine — easing makes it feel sluggish on small deltas).

### 6.2 Choice hover / selected

```css
.cm-opt { transition: background 150ms ease, border-color 150ms ease; }
.cm-opt:hover  { background: var(--bg-3); border-color: rgba(239,83,80,0.6); }
.cm-opt.is-focused, .cm-opt:focus-visible {
  outline: none;
  border-color: var(--role);
  box-shadow: 0 0 0 1px var(--role), 0 0 12px var(--role-glow);
}
.cm-opt.is-selected { background: var(--bg-3); border-color: var(--role); }
```

Keyboard nav (1/2/3 or A/B/C) toggles `.is-focused` instantly — no transition lag on focus.

### 6.3 Toast enter / exit

```css
@keyframes toast-in  { from { transform: translateY(-6px); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes toast-out { to   { transform: translateX(20px); opacity: 0; } }
.toast            { animation: toast-in 180ms ease-out both; }
.toast.is-leaving { animation: toast-out 160ms ease-in both; }
```

Mobile slides down from the top (`translateY(-12px)`); desktop slides in from the right (`translateX(20px)` reversed).

### 6.4 Crisis modal entrance

Two phases:

1. **Banner** drops from top in 220ms with `cubic-bezier(0.22, 1, 0.36, 1)` (snappy ease-out).
2. **Modal + scrim** fade + lift 4px in 260ms `ease-out`, starting at +60ms (banner first, then content).

```css
@keyframes crisis-banner-in { from { transform: translateY(-100%); }    to { transform: none; } }
@keyframes crisis-modal-in  { from { transform: translate(-50%, calc(-50% + 4px)); opacity: 0; } to { transform: translate(-50%, -50%); opacity: 1; } }
@keyframes crisis-scrim-in  { from { opacity: 0; } to { opacity: 1; } }
```

The pulsing red dot (`@keyframes crisis-pulse`, 1.4s `ease-in-out infinite`) starts on banner-in and never stops while the modal is open.

### 6.5 End screen grade reveal

Sequence (total ~1.3s):

1. `0ms` — top status bar fades in, 200ms.
2. `200ms` — score row counts up `0 → totalScore`, 600ms `linear`.
3. `400ms` — radar polygon `stroke-dasharray` draws around perimeter, 500ms `ease-out`; then fill polygon fades in 200ms.
4. `600ms` — grade glyph scales `0.85 → 1.0` with opacity `0 → 1` in 380ms `cubic-bezier(0.22, 1, 0.36, 1)`; on completion the role-glow text-shadow fades in over 200ms.
5. `1000ms` — dimension list rows stagger 40ms each, 220ms each row, fade + 2px lift.
6. CTAs fade last, 200ms.

```css
@keyframes grade-in {
  0%   { transform: scale(0.85); opacity: 0; text-shadow: none; }
  60%  { transform: scale(1);    opacity: 1; text-shadow: none; }
  100% { transform: scale(1);    opacity: 1; text-shadow: 0 0 28px var(--role-glow); }
}
```

The ShareCard does **not** animate — it must be instantly screenshot-able.

### 6.6 Don'ts (hard rules)

- **No cartoon style.** No mascots, no rounded character illustrations, no soft pastels. Placeholders in monospace, period.
- **No marketing hero.** No 70vh image with a giant heading and a "Get started" CTA. Every screen is functional dense.
- **No oversized decorative gradients.** The only gradients allowed: 2px role rails, the crisis banner, and the very subtle radial fades on EndScreen / ShareCard backgrounds (already specified).
- **No low-density SaaS dashboard conversion.** No 24px icons floating in cards, no "card with rounded corners and a single big number and lots of whitespace". A card without at least 3 pieces of information is a bug.
- **No emoji.** ✓ ✕ ▶ ▲ ▼ are typographic glyphs we use intentionally — anything color-emoji is out.
- **No webfonts for CJK.** Use the system stack.
- **No page transitions.** Routes swap instantly; only modals and toasts animate.

---

## Appendix · Required CSS contract

Every screen root **must**:

1. Set `data-role="cfo|im|gov"` on a top-level container.
2. Inherit `--font-sans` on body and let `.mono` / `.num` classes opt into mono.
3. Apply `font-feature-settings: "tnum" 1, "ss01" 1` globally.
4. Include `tokens.css` first, then the per-round CSS.

Every component **must**:

1. Read color via `var(--*)` — never hardcode hex.
2. Carry a 1px border (`--line` or `--line-strong`) instead of a soft drop shadow at card scope.
3. Provide a mobile path even if it's "this component is fine as-is at 390px wide".

---

*Round 5 of 5 · 债市生存游戏 design system · status: complete.*
