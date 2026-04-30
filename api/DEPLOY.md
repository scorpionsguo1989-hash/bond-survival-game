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
pm2 start server.js --name bond-game-api
pm2 save
pm2 startup  # 按照输出提示执行命令，实现开机自启
```

验证：
```bash
curl http://localhost:3000/api/leaderboard
# 应返回 {"ok":true,"data":[]}
```

## 3. 配置 nginx

在 nginx 配置中添加（或修改已有 server block）：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/game;
    index index.html;

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
