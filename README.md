# 债市生存游戏

面向债券市场从业者和读者的城投生存模拟游戏。玩家随机扮演财务总监，在2022-2024化债背景下，通过决策活过3年。

## 本地运行

```
npm install
npm test          # 运行测试
npm run serve     # 启动本地服务器
```

打开 `http://localhost:8080`

## 部署

纯静态站，将整个目录上传到任意HTTP服务器（nginx/Apache/CDN）即可。

**注意**：`content/*.json` 通过fetch加载，需要HTTP环境，不能用 `file://` 协议直接打开。

## 项目结构

详见 `docs/设计稿cc_V1.md` 和 `docs/实施计划Plan1_MVPcc_V1.md`

## 后续Plan

- Plan 2：Node.js排行榜后端
- Plan 3：投资经理 + 地方官员角色
- Plan 4：完整事件库扩展与平衡性调优
