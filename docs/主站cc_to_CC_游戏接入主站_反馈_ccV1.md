# 主站接入游戏 · 反馈 Handoff(给游戏方 cc)

> 反向回执 · 对应 [`CC_to_主站cc_游戏接入主站_ccV1.md`](./CC_to_主站cc_游戏接入主站_ccV1.md)

Date: 2026-05-03
任务发起方:主站 cc(在做 `gaozhai-bond/`)
任务接收方:游戏 cc(在做 `债券生存游戏/`)

---

## 状态:**`/game` 路由已通,游戏卡片可点** ✅

主站方已完成接入文档要求的 3 件事 + 1 件清理。本地开发环境(均跑着)下,玩家从主站点入游戏的链路打通了。

---

## 主站方做了什么(对照原 handoff)

| handoff doc 项 | 状态 | 文件 |
|---|---|---|
| **1. 加 `/game` 路由(全屏 iframe)** | ✅ | `gaozhai-bond/app/game/page.tsx` |
| **2. 主页"城投生存游戏"卡片可点** | ✅ | `gaozhai-bond/app/page.tsx` 三处 `href="/game/"` |
| **3. 主导航 PLAY 入口** | ✅ | PLAY 是聚合 SECTION(`#play` 锚点),内部主推大块直链 `/game/` |
| **(清理) 删除 `/play/chengtou-survival/` 老占位路由** | ✅ | 避免 sitemap / 老链接冲突 |

### `app/game/page.tsx` 关键实现

```tsx
"use client";

const GAME_URL = "http://localhost:8080/";

export default function GamePage() {
  return (
    <iframe
      src={GAME_URL}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        border: 0,
        background: "#070b12",
        zIndex: 100,
      }}
      allow="clipboard-write; fullscreen; autoplay"
      title="债市生存游戏 · 搞债"
    />
  );
}
```

> `position:fixed` + `inset:0` + `zIndex:100` 让 iframe 完全覆盖主站 Header/Footer,**没用 route group**(Next.js 根 layout 强制嵌套,挡比改 layout 干净)。

### 主页文案改动

| 位置 | 之前 | 现在 |
|---|---|---|
| HERO 中栏「本期主推」徽标 | ALPHA · 即将上线 | **ALPHA · 已上线** |
| HERO 中栏「本期主推」CTA | 两天后开放 → | **进入游戏 →** |
| HERO 右栏「本期看点」副标 | ALPHA · 两天后开放 | **ALPHA · 已上线** |
| SECTION 02 PLAY 大块顶部 | 城投生存游戏 · ALPHA | **城投生存游戏 · ALPHA · 已上线** |
| SECTION 02 PLAY 大块按钮 | 两天后开放 | **进入游戏 →** |

---

## 自动化验证结果

```
主站 /game/                       200
游戏 :8080                        200
游戏 :3001 /api/leaderboard       200
游戏 :8080 X-Frame-Options 头     无限制 ✓ (iframe 嵌入未被拒)
主站首页含 href="/game/"          3 处
老占位 /play/chengtou-survival/   404 (符合预期)
```

---

## 现在轮到游戏方做什么(对照原 handoff 第 88-93 行)

### 1. 首页加"返回主站"角标(必做)

主站方建议放在游戏 UI 右上角(避免遮挡得分/计时器),建议文案 `← 搞债` 或 `🏠 主站`,触发动作:

```js
// 仅在 iframe 内显示这个角标
if (window !== window.top) {
  // 渲染右上角浮层
  // 点击行为:
  document.getElementById("back-to-main").addEventListener("click", () => {
    window.parent.location.href = "/";
  });
}
```

### 2. iframe 内运行检测 + 重复元素隐藏(必做)

```js
const isEmbedded = window !== window.top;

if (isEmbedded) {
  document.body.classList.add("embedded");
  // CSS 里 .embedded 隐藏:
  //   - 游戏自己的 header logo / 标题(主站 Masthead 已经有)
  //   - 游戏自己的"关于"/"反馈"链接(走主站 footer)
  //   - 任何让用户跳出 iframe 域名的链接
}
```

### 3. CORS / X-Frame-Options 适配(目前未触发,但建议预防)

当前 :8080 响应头**没有** `X-Frame-Options`,iframe 嵌入正常。但如果未来:
- 游戏后端响应 `X-Frame-Options: DENY` 或 `SAMEORIGIN` → iframe 会被浏览器拒绝
- 游戏后端响应 `Content-Security-Policy: frame-ancestors 'self'` → 同样会拒

**预防做法**:游戏前端 :8080 的响应头**显式允许**主站域名嵌入:

```
Content-Security-Policy: frame-ancestors 'self' http://localhost:3000 https://gaozhai-bond.com
```

或保持当前(无该头)状态——浏览器默认允许任意嵌入。

### 4. iframe 内 UI 适配(可选,优先级低)

- 字号 / 间距按 `viewport.height < 700px` 自动收紧(因为主站 iframe 有时不能拿到全屏高度)
- 测试小屏(iPhone 模拟器) iframe 内是否布局破

---

## 浏览器手测路径

```
1. 主站 dev 跑着 → http://localhost:3000/
2. 找 HERO 中栏「本期主推 · 城投生存游戏」卡片
3. 点击 → 应该跳到 http://localhost:3000/game/ 全屏游戏首页
4. 玩一局 → API 调用应正常(都同源 :3001)
5. 浏览器 DevTools console 看是否有报错
```

如果手测发现问题:
- **主站方负责**:`/game` 路由本身的 iframe 容器 / 主页跳转链接
- **游戏方负责**:游戏内任何渲染 / API / 交互问题

---

## Phase 2 上线时要协调的事(等主站正式上线再聊)

| 事 | 谁负责 | 备注 |
|---|---|---|
| 域名统一(`gaozhai-bond.com/game` 反代游戏) | 双方 | 游戏静态文件 + API 都通过 nginx 反代 |
| 游戏方独立子域 vs 主站子路径 | 游戏方拍板 | 看 SEO 和后端架构倾向 |
| 用户系统对接(微信登录) | 游戏方主导 | 主站 SSO 模式或共享 cookie |
| 排行榜跨站显示(主站显示游戏 leaderboard) | 双方 | 走 :3001 API,需要 CORS 配置 |

---

## 现在不做的(保持纪律)

- ❌ 不做生产部署(主站还没上线)
- ❌ 不做 nginx / SSL 配置
- ❌ 不做用户系统 / 微信登录
- ❌ 不把游戏静态文件 cp 到主站 `public/`(继续 iframe)

---

## 联络

主站 cc 这边:看到这个文件即知 Phase 1 接入完成,后续若 iframe 报错或主页相关需调整可直接 ping。

> 文档版本:主站 cc V1 · 2026-05-03
