# Plan 2 设计稿：排行榜后端

> 版本：cc_V1 · 2026-04-30

---

## 一、范围

为债市生存游戏添加排行榜后端。玩家通关后成绩持久化到服务端数据库，支持 Top 20 展示和个人排名查询。

**不含**：登录/注册、个人历史战绩页（localStorage 已有本地记录）、分组排行、分页。

---

## 二、架构

```
玩家浏览器
    ↓ 访问网页
nginx (轻量云服务器)
    ├── 静态文件 → /var/www/game/ (HTML/JS/CSS/JSON)
    └── /api/* → proxy_pass → Node.js :3000
                                 ├── Express 路由
                                 └── SQLite (leaderboard.db)
```

前端静态文件由 nginx 直接托管。仅 `/api/*` 路径反代到 Node.js 进程。Node.js 挂掉时游戏本体仍可正常游玩，排行榜暂不可用。

---

## 三、API 接口

### 3.1 POST /api/scores

提交通关成绩。

**请求体** (JSON)：

```json
{
  "nickname": "玩家自选昵称",
  "directorName": "铁算盘",
  "platformName": "云中城建",
  "regionTier": "central_capital",
  "healthLevel": "medium",
  "score": 85,
  "grade": "A",
  "survived": true,
  "quartersPassed": 12
}
```

- `nickname` 可选，不传则排行榜展示 `directorName`（花名）
- 其余字段必填

**响应** (200)：

```json
{
  "ok": true,
  "rank": 42
}
```

**错误响应** (400)：

```json
{
  "ok": false,
  "error": "score must be between 0 and 200"
}
```

### 3.2 GET /api/leaderboard

获取 Top 20 排行榜。

**响应** (200)：

```json
{
  "ok": true,
  "data": [
    {
      "rank": 1,
      "nickname": "债王",
      "directorName": "铁算盘",
      "platformName": "云中城建",
      "regionTier": "central_capital",
      "healthLevel": "medium",
      "score": 142,
      "grade": "S",
      "survived": true,
      "quartersPassed": 12,
      "createdAt": "2026-04-30T12:00:00Z"
    }
  ]
}
```

### 3.3 GET /api/rank?score=85

查询某分数在排行榜中的排名。

**响应** (200)：

```json
{
  "ok": true,
  "rank": 42,
  "total": 1580
}
```

---

## 四、数据库

SQLite 单文件 `leaderboard.db`，单表。

```sql
CREATE TABLE IF NOT EXISTS scores (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  nickname      TEXT,
  director_name TEXT    NOT NULL,
  platform_name TEXT    NOT NULL,
  region_tier   TEXT    NOT NULL,
  health_level  TEXT    NOT NULL,
  score         INTEGER NOT NULL,
  grade         TEXT    NOT NULL,
  survived      INTEGER NOT NULL DEFAULT 0,
  quarters_passed INTEGER NOT NULL,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_scores_score ON scores(score DESC);
```

---

## 五、防作弊（轻度校验）

服务端对 POST /api/scores 做以下过滤，拒绝明显非法提交：

| 校验项 | 规则 |
|--------|------|
| score | 0 ≤ score ≤ 200 |
| quartersPassed | 1 ≤ quartersPassed ≤ 12 |
| grade | 必须是 S/A/B/C/D 之一 |
| grade-score 一致性 | 按 score.js 的 getScoreGrade 区间校验 |
| survived-quarters 一致性 | survived=true 时 quartersPassed 必须 = 12 |
| 频率限制 | 同 IP 60秒内限1次提交 |
| 字符串长度 | nickname ≤ 20字符，directorName/platformName ≤ 30字符 |

不通过校验返回 400 + 错误原因。

---

## 六、前端对接

### 6.1 终局界面（修改 main.js + ui.js）

通关流程变更：

1. `enterEndScreen()` 中计算完 finalScore 后
2. 弹出昵称输入框（可选，有"跳过"按钮）
3. 调用 `POST /api/scores` 提交成绩
4. 用返回的 `rank` 在终局界面显示"你的排名：第 N 名"
5. 提交失败时静默降级（不影响终局界面展示）

### 6.2 首页排行榜入口（修改 ui.js + main.js）

1. 首页（命运卡界面之前或之后）添加"排行榜"按钮
2. 点击后调用 `GET /api/leaderboard`
3. 渲染 Top 20 榜单弹窗/面板
4. 每行展示：排名、昵称/花名、平台名、出身难度标签、评级徽章、总分、存活季度

### 6.3 新增文件

`js/api.js` — 封装三个 API 调用函数：

- `submitScore(data)` → POST /api/scores
- `fetchLeaderboard()` → GET /api/leaderboard
- `fetchRank(score)` → GET /api/rank?score=N

所有调用带 try/catch，网络失败时返回 null，不阻断游戏流程。

---

## 七、部署

### 7.1 服务端文件结构

```
/var/www/game/
├── index.html
├── js/
├── css/
├── content/
└── api/
    ├── server.js        # Express 入口
    ├── package.json     # 后端独立依赖
    └── leaderboard.db   # SQLite 数据文件（自动创建）
```

### 7.2 依赖

```json
{
  "dependencies": {
    "express": "^4.18.0",
    "better-sqlite3": "^11.0.0"
  }
}
```

### 7.3 进程管理

```bash
# 安装 PM2
npm install -g pm2

# 启动
cd /var/www/game/api
pm2 start server.js --name bond-game-api

# 开机自启
pm2 save
pm2 startup
```

### 7.4 nginx 配置

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/game;
    index index.html;

    # 静态文件
    location / {
        try_files $uri $uri/ =404;
        gzip on;
        gzip_types text/css application/javascript application/json;
    }

    # API 反代
    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

`X-Real-IP` 头用于频率限制获取真实客户端 IP。

---

## 八、排行榜展示规格

| 列 | 内容 | 示例 |
|----|------|------|
| 排名 | #N | #1 |
| 昵称 | nickname 或 directorName | 债王 / 铁算盘 |
| 平台 | platformName | 云中城建 |
| 难度 | regionTier + healthLevel 中文标签 | 中部省会·一般 |
| 评级 | grade 徽章 | S |
| 总分 | score | 142 |
| 存活 | quartersPassed/12 | 12/12 |

样式沿用 Bloomberg 暗色风格，与现有 UI 一致。

---

## 九、不做清单

- 登录/注册/账号体系
- 个人历史战绩服务端存储（本地 localStorage 已有）
- 分组排行（按出身/角色分榜）
- 分页浏览
- WebSocket 实时更新
- 数据库备份/迁移工具
- HTTPS 证书配置（假设 nginx 已有或用户自行配置）
