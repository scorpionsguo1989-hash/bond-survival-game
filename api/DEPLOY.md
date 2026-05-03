# 排行榜后端部署指南

## 前提

- 轻量云服务器已安装 Node.js 18+
- 已安装 nginx
- 项目文件已部署到 `/var/www/game/`

## 1. 安装后端依赖

```bash
cd /var/www/game/api
npm install --production
```

## 2. 启动服务

使用 PM2 守护进程：

```bash
npm install -g pm2
cd /var/www/game/api

# 方式 A：直接启动（DeepSeek 不配置，自动走模板兜底，依然能出战后画像）
pm2 start server.js --name bond-game-api

# 方式 B：启用 AI 战后画像（推荐）
# 先在 https://platform.deepseek.com/api_keys 申请 key（充 ¥10 够 5000+ 次画像）
DEEPSEEK_API_KEY=sk-xxxxxx pm2 start server.js --name bond-game-api --update-env

pm2 save
pm2 startup  # 按照输出提示执行命令，实现开机自启
```

或用 `ecosystem.config.cjs` 管理环境变量（推荐生产用）：

```js
// /var/www/game/api/ecosystem.config.cjs
module.exports = {
  apps: [{
    name: 'bond-game-api',
    script: 'server.js',
    env: {
      PORT: 3000,
      DEEPSEEK_API_KEY: 'sk-xxxxxx',         // 替换为真实 key
      DEEPSEEK_MODEL: 'deepseek-chat',
    },
  }],
};
```
启动：`pm2 start ecosystem.config.cjs`

验证：
```bash
curl http://localhost:3000/api/leaderboard
# 应返回 {"ok":true,"data":[]}

curl -X POST http://localhost:3000/api/portrait \
  -H 'Content-Type: application/json' \
  -d '{"role":"cfo","platformName":"x","directorName":"y","regionTier":"central_capital","healthLevel":"medium","survived":true,"quartersPassed":12,"score":{"total":78,"grade":"A","gradeLabel":"优秀","dimensions":{"流动性管理":80}},"decisions":[]}'
# 配 key 后 source=deepseek；未配则 source=fallback
```

## 3. 配置 nginx

在 nginx 配置中添加（或修改已有 server block）：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/game;
    index index.html;

    # 关键：屏蔽 /content/* 直接访问
    # 30 saga + 50 开场 + 280 hermes 事件 + 41 NPC 全部内容必须经
    # POST /api/content/bundle + sessionId 鉴权才能拿（防 wget 白嫖）
    location /content/ {
        return 403;
    }

    # 关键：屏蔽 .git / .env / 配置文件 / node_modules
    location ~ /\.(git|env|DS_Store) {
        return 404;
    }
    location ~ /(node_modules|api/|tests/|docs/) {
        return 404;
    }

    location / {
        try_files $uri $uri/ =404;
        gzip on;
        gzip_types text/css application/javascript application/json;
    }

    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $host;
    }
}
```

```bash
nginx -t          # 测试配置
nginx -s reload   # 重载
```

## 4. 验证

```bash
# 从服务器外部访问
curl https://your-domain.com/api/leaderboard
```

## 5. 常用运维命令

```bash
pm2 status              # 查看状态
pm2 logs bond-game-api  # 查看日志
pm2 restart bond-game-api  # 重启
```

数据库文件位于 `api/leaderboard.db`，定期备份即可。

**首次上线前**：本地开发可能塞过种子数据（让 leaderboard 视觉完整）。生产服初始应该是空的，部署前一次性清掉：

```bash
# 在生产服运行（清空所有 scores + decisions）
sqlite3 /var/www/game/api/leaderboard.db "DELETE FROM scores; DELETE FROM decisions;"
# 验证
sqlite3 /var/www/game/api/leaderboard.db "SELECT COUNT(*) FROM scores;"  # 应返回 0
```

## 6. AI 战后画像 · DeepSeek 集成

**为什么用 DeepSeek（不用 Claude）**：国内服务器到 Anthropic API 通常被墙，DeepSeek 走国内 BGP，~200ms 延迟、价格 ¥1/百万 token，单次画像约 ¥0.001。

**关键事项**：
- API key **永不**暴露给前端：所有 LLM 调用走 `POST /api/portrait` 后端代理
- 未配置 key 时**自动走模板兜底**：玩家依然能看到一段画像，标注为「程式化画像（AI 未配置）」
- 后端有内置缓存（5 分钟），同一战绩重复请求不重复计费
- 后端速率限制：单 IP 20 秒一次，避免恶意刷量

**成本估算**：
- 每次画像：~500 输入 + ~300 输出 token = ¥0.001/次
- 公众号阅读 1 万、转化 10% 玩游戏 = 1000 局 = ¥1
- 充 ¥10 够日常使用 ~10000 次，够吃很久

**监控**：
```bash
pm2 logs bond-game-api | grep portrait
# 每次 DeepSeek 失败会打印 [portrait] DeepSeek failed, fallback: <原因>
```

## 7. 内容鉴权下发（防白嫖）

游戏的所有 content/*.json（30 saga + 50 开场 + 280 hermes + 41 NPC）**不再以静态文件下发**。
启动时 `contentVault.loadAllContent()` 把所有内容读到 memory，玩家必须经过两步鉴权才能拿到：

```
1) POST /api/session/init           → { sessionId } （32 hex，2 小时过期）
2) POST /api/content/bundle         → { bundle: {...} } （含全部事件，但每个 body 末尾嵌入 32 个零宽字符水印 = sessionId 前 8 hex）
```

**双重限流**：
- 每 IP 1 小时最多创建 5 个 session
- 每 token 1 小时只能拿 1 次完整 bundle
- 单接口调用 6 秒限流

**水印用途**（运营手册）：
当发现盗版站时，复制盗版站的某段 event body → 调 `extractWatermark(text)` → 拿到 sessionId 前 8 hex → 后端日志查到原始 IP/UA → 走律师函流程。

**Nginx 必须屏蔽 /content/***（见上面 nginx 配置 `location /content/ { return 403; }`），否则前面这层鉴权完全失效。

## 7.5 容量规划（2000 同时在线）

按 **2000 同时在线** 校准的限流参数（位于 `server.js` + `contentVault.js`）：

| 接口 | 限流 | 原因 |
|---|---|---|
| `session/init` | 1s/IP | 公司 NAT 多人同时进游戏，防爆破即可 |
| `content/bundle` | 5s/token（vault 内部）| 玩家刷新无感，爬虫拿到也水印一致 |
| `PER_IP_MAX_SESSIONS` | 500/小时 | 公司级 NAT 一出口可能 200 人 |
| `scores` 提交 | 5s/IP | 一波结束 50 人都要交 |
| `portrait` (DeepSeek) | 3s/IP | 结束页可能"重新生成"频次高 |
| `headline` (DeepSeek) | 3s/IP | "换一段"按钮频次 |
| `coach` (DeepSeek) | 2s/IP | 一局上限 3 次靠 `COACHING_MAX_PER_GAME` 控制 |

**DeepSeek 成本**：一局 ~5-8 次调用 ≈ ¥0.005-0.008/局。
- 高峰 2000 局/小时 ≈ ¥10-16/小时
- 充 ¥50 ≈ 4-8 小时持续高峰，建议**自动告警 < ¥10 余额**

**服务器资源（1.8GB VPS / 2 核 / 39GB）扛 2000 在线**：
- bundle JSON ~100KB 内存常驻 → 内存无压力
- 网络：bundle 下发 + scores/decisions 上传 ≈ 500KB/s 高峰
- SQLite WAL 模式（默认）：5-10 写/秒可承受
- 加 `pm2 ecosystem` 配置 `max_memory_restart: '800M'` 防内存泄漏

**降级行为**：前端 `loadEvents()` 优先调 API，API 不可用时**自动降级**到 `fetch('content/*.json')`。所以本地开发不用启 API 也能跑游戏。生产环境因为 nginx 屏蔽了 /content/*，降级路径无效——必须 API 服务存活。

**验证清单**（上线前必跑）：
```bash
# 应 403
curl -sI https://your-domain.com/content/historicalSagas.json

# 应 200 + 返回 sessionId
curl -X POST https://your-domain.com/api/session/init -H 'Content-Type: application/json' -d '{}'

# 应 200 + 返回 bundle（注意 6s 限流）
SID=<上一步拿到的 sessionId>
sleep 7
curl -X POST https://your-domain.com/api/content/bundle \
  -H 'Content-Type: application/json' -d "{\"sessionId\":\"$SID\"}"
```

