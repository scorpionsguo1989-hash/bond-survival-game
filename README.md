# 债市生存游戏

面向债券市场从业者和读者的城投债务管理情景模拟游戏。玩家可扮演财务总监、投资经理或地方政府相关角色，在 2022—2024 年化债背景下，通过连续决策应对融资、兑付和风险事件。

项目以静态前端为主，并提供可选的 Node.js 排行榜后端。游戏中的机构、数据、事件和结果用于情景模拟，不构成投资建议、法律意见、会计意见或现实业务决策依据。

## 功能概览

- 多角色游戏路径与差异化目标
- 季度事件、政策环境、黑天鹅和连续剧情
- 资金、债务、声誉等状态管理与结局评分
- 可选排行榜 API 与 SQLite 本地存储
- Vitest 自动化测试

## 本地运行

需要 Node.js 22。使用 `nvm` 时可直接读取仓库中的 `.nvmrc`：

```bash
nvm use
npm ci
npm ci --prefix api
npm test
npm run serve
```

打开 `http://localhost:8080`。

排行榜后端为可选组件：

```bash
cp api/.env.example api/.env
npm start --prefix api
```

不要把真实 `.env`、API 密钥或排行榜数据库提交到仓库。

## 部署

纯静态模式下，将前端文件上传到 HTTP 服务器或静态托管服务即可。排行榜、画像和其他后端能力需要单独部署 `api/`。

**注意**：`content/*.json` 通过 `fetch` 加载，需要 HTTP 环境，不能用 `file://` 协议直接打开。

## 项目结构

```text
api/       可选排行榜与扩展后端
assets/    项目图像资源
content/   游戏事件与剧情数据
css/       页面样式
js/        游戏与界面逻辑
tests/     自动化测试
docs/      设计、实施与协作记录
```

早期设计与实施背景可参阅 `docs/设计稿cc_V1.md` 和 `docs/实施计划Plan1_MVPcc_V1.md`。

## 参与贡献

请先阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。提交修改前应运行完整测试；GitHub Actions 会在每次推送和 Pull Request 时自动执行同一套测试。

## 许可证

本项目采用 [MIT License](LICENSE)。
