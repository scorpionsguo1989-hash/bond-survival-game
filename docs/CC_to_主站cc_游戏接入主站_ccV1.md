# 主站接入游戏 · Handoff Prompt（给主站方 cc）

Date: 2026-05-03
任务发起方：游戏 cc（在做 `债券生存游戏/`）
任务接收方：主站 cc（在做 `gaozhai-bond/`）

## 项目坐标

| | 路径 | 技术栈 | 端口 |
|---|---|---|---|
| 主站 | `/Volumes/D盘/claude code/工作区/gaozhai-bond/` | Next.js 14 (output: export) | :3000 |
| 游戏 | `/Volumes/D盘/claude code/工作区/债券生存游戏/` | vanilla JS 前端 + node API | 前端 :8080 / API :3001 |

> 工作区结构见 `/Volumes/D盘/claude code/工作区/工作区目录说明.md`

**当前阶段约束**：均本地开发，**主站未上线**。本次只做本地开发期接入，不动生产部署。

---

## 任务目标

让主站首页那张「**城投生存游戏 · 本期主推**」卡片（截图里标 ALPHA · 即将上线 · 两天后开放）真的能点开 → 玩家进入游戏 → 玩完一局能回到主站。

未来上线后游戏作为主站 **测试 PLAY** section 的核心入口。

---

## 推荐方案：iframe 嵌入（Phase 1）

### 选 iframe 不选其他的理由
- 主站是 next.js `output: 'export'`（纯静态导出），**没有服务端 rewrites 能力**
- 游戏前端 + 后端运行时都在跑，端口固定（8080 + 3001）
- 游戏内容通过 `/api/content/bundle` 鉴权下发（防爬虫），后端必须独立活着
- iframe 是最快验证 + 最少改动 + 最容易回滚的方案
- Phase 2 上线时再考虑统一域名 + nginx 反代 / 静态资源合并

---

## 你（主站方）需要做的 3 件事

### 1. 加 `/game` 路由（全屏 iframe 包游戏）

新建 `gaozhai-bond/app/game/page.tsx`：

```tsx
'use client';

export default function GamePage() {
  return (
    <iframe
      src="http://localhost:8080/"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        border: 0,
        background: '#070b12',
        zIndex: 100,
      }}
      allow="clipboard-write; fullscreen"
      title="债市生存游戏"
    />
  );
}
```

**关键细节**：
- `position: fixed` + `inset: 0` 让游戏全屏覆盖
- **不要套主站 layout**（不要让 Header / Footer 同时显示挤占空间）
  - 推荐做法：用 `app/(game)/game/page.tsx` route group + 该 group 的 layout.tsx 返回纯 children
- 不要给 iframe 加 padding / margin

### 2. 主页"城投生存游戏"卡片变可点击

当前那张大卡（截图里 ALPHA · 即将上线 · 两天后开放）改成：
- badge 从 "ALPHA · 即将上线" → "**ALPHA · 已上线**"（金色）
- "两天后开放 →" → "**进入游戏 →**" 链接到 `/game`
- 整张卡 wrap 在 `<Link href="/game">`

### 3. 顶栏 / 主导航的 PLAY 入口

主导航的「测试 · PLAY」如果要点击直接进游戏，加 `<Link href="/game">`。
如果 PLAY 是个聚合页（含游戏 + 未来的债券圈 MBTI 等），就让聚合页里的「城投生存游戏」入口指向 `/game`。

---

## 游戏方（我）会配合做的（你不用管）

1. **首页加"返回主站"角标**（右上角，点击 → `window.parent.location = '/'`）
2. **检测 iframe 内运行**（`window !== window.top`），是的话隐藏一些重复的品牌元素（避免和主站 logo 撞）
3. **CORS / X-Frame-Options 适配**（如果浏览器拒绝 iframe，立刻调）
4. **未来 Phase 2 上线时**配合主站走 nginx 反代

---

## 测试验证 Checklist

```
[ ] 主站 npm run dev 跑 :3000
[ ] 游戏前端 http://localhost:8080 能直访（验证基线）
[ ] 游戏后端 http://localhost:3001/api/leaderboard 返 200
[ ] 浏览器开 http://localhost:3000/game/ 能看到游戏首页（iframe 内）
[ ] 游戏内能完成一局（说明 API 调用没被 iframe 阻断）
[ ] 主站首页那张游戏卡片可点 → 跳到 /game
[ ] /game 页面没有主站 header / footer 干扰
[ ] 浏览器 console 没有 X-Frame-Options / CSP 报错
```

---

## 不要做的（防跑偏）

- ❌ **不要修改游戏代码**（在 `../债券生存游戏/`，不是你的 repo）
- ❌ **不要做生产部署 / nginx 配置**（主站还没上线，等上线再说）
- ❌ **不要把游戏静态文件 cp 到 `public/game/`**（用 iframe 就够，cp 后每次游戏迭代要同步双份维护）
- ❌ **不要做用户系统对接**（微信登录是后续 Phase，现在游戏匿名玩 + localStorage）
- ❌ **不要重复给游戏做 SEO meta**（游戏在 iframe 里 SEO 走主站 /game 路由的 metadata）

---

## 完成后通知游戏方

> "/game 路由已通，游戏卡片可点。游戏方该做返回主站按钮 + iframe 内 UI 适配。"

---

## 参考文件

- `/Volumes/D盘/claude code/工作区/工作区目录说明.md` — 工作区结构
- `/Volumes/D盘/claude code/工作区/债券生存游戏/api/DEPLOY.md` — 游戏端口约定 / 上线后 nginx 模板
- `/Volumes/D盘/claude code/工作区/债券生存游戏/index.html` — 游戏入口（参考它依赖哪些 css/js，确认 iframe 内能正常加载）
