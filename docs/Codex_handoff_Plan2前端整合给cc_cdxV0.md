# Claude Code 接力任务 · Plan 2 Task 6-8 前端整合

## 背景

Codex 已完成 Plan 2 的后端与 API 封装任务：Task 1-5 + Task 9。现在请你接 Plan 2 的 Task 6-8，完成排行榜前端整合。

工作目录：

`/Volumes/D盘/claude code/工作区/债券生存游戏/`

## 当前最新提交

```text
6eee1a5 docs: backend deployment guide
46adeba feat: frontend API client with graceful error handling
dad54a7 feat(api): express server with scores, leaderboard, rank endpoints
b4078d4 feat(api): request validation with grade-score consistency check
b1b76d3 feat(api): database layer with insert, top-N query, and rank lookup
cc882cb feat(api): scaffold backend package with express and better-sqlite3
```

## 已完成内容

后端：

```text
api/
  DEPLOY.md
  db.js
  package-lock.json
  package.json
  server.js
  validate.js
```

前端 API 封装：

```text
js/api.js
```

新增测试：

```text
tests/api-db.test.js
tests/api-validate.test.js
```

当前测试：

```text
Test Files  9 passed (9)
Tests       57 passed (57)
```

## 冒烟测试结果

Codex 已验证后端服务：

- `POST /api/scores` 合法提交：`200 {"ok":true,"rank":1}`
- `GET /api/leaderboard`：返回刚提交记录
- `GET /api/rank?score=85`：`{"ok":true,"rank":1,"total":1}`
- 非法 `score=999`：`400`
- 60 秒内重复提交：`429`

测试后已停止 3000 端口服务，并清理 `api/leaderboard.db*`。

## 请你执行

执行 `docs/实施计划Plan2_排行榜后端cc_V1.md` 的：

- Task 6：排行榜弹窗 UI + 昵称输入 UI
- Task 7：主流程对接（main.js）
- Task 8：终局界面显示排名 + 排行榜按钮

不要重复做 Task 1-5 和 Task 9。

## 重要注意事项

1. 当前工作树里有一个未提交的 `js/origins.js` 修改，是平台名/花名从真实城投风改成虚构代号风：

```text
platformName: 云中城建 / 星河基投 / ...
directorName: 铁算盘 / 老城墙 / ...
```

这个改动不是 Codex 本轮任务产生的。请你先判断它是否应该作为独立 commit 处理，或者继续保留未提交；不要无意覆盖。

2. 仍有两个旧 handoff 文档未跟踪，不需要纳入提交：

```text
docs/Codex_handoff_第一批cc_V1.md
docs/Codex_handoff_第二批cc_V1.md
```

3. `api/node_modules/` 和 `api/leaderboard.db` 已加入 `.gitignore`，不要提交数据库和 node_modules。

4. `validate.js` 的分数等级范围和前端 `score.js` 当前保持一致：

- S: 90+
- A: 75-89
- B: 60-74
- C: 40-59
- D: 0-39

5. `server.js` 的 POST rate limit 在校验前执行。如果你做联调，重复提交可能会先返回 429。

## 验证要求

完成 Task 6-8 后至少运行：

```bash
npm test
node --check js/main.js
node --check js/ui.js
```

建议联调：

```bash
cd api && node server.js
# 另一个终端
npm run serve
```

打开 `http://localhost:8080`，跑完整局或直接构造终局，确认：

- 昵称输入能提交成绩
- 排行榜弹窗能打开
- 终局界面能显示 rank
- API 不可用时前端不崩
- 不破坏原本单机可玩流程

## 期望提交

按 plan 分 task 提交：

```bash
git add js/ui.js css/style.css
git commit -m "feat(ui): leaderboard modal and nickname prompt components"

git add js/main.js
git commit -m "feat(main): integrate leaderboard submission, nickname prompt, and homepage entry"

git add js/ui.js
git commit -m "feat(ui): show player rank on endscreen and add leaderboard button"
```

最后汇报：

```text
完成 Plan 2 Task 6-8：
Task 6 commit xxx
Task 7 commit xxx
Task 8 commit xxx

npm test:
[Test Files / Tests 行]

手动联调：
[通过/未做 + 原因]

遗留问题：
[列出]
```
