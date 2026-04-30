# Codex 执行任务包 · Plan 2（Task 1-5, 9）

## 角色与上下文

你是债市生存游戏的执行者。Claude 已完成 Plan 1 全部 21 个 Task（前端 MVP），现在进入 Plan 2——排行榜后端。请执行 Task 1-5 和 Task 9。

Task 6-8（前端整合：改 ui.js/main.js/css）由 Claude 接手做。你只负责后端模块和部署文档。

## 工作目录

`/Volumes/D盘/claude code/工作区/债券生存游戏/`

## 当前状态

```
git log --oneline (最近5条):
616b4c4 docs: Plan 2 leaderboard backend implementation plan (9 tasks)
2a17e50 docs: Plan 2 leaderboard backend design spec
51d89ea fix(balance): rebalance game economy and expand main event pool
ed1efa5 fix: add uncertainty probability gate, validate action input, refresh pendingEvent on resume
bb69708 fix(main): preserve reducer pattern for pendingEvent and handle loadEvents failure

测试状态：35 passing across 7 files
```

已完成模块（Plan 1）：
- 9 个前端 js 模块 + 7 个测试文件 + 2 个 content JSON + 1 个 CSS
- 完整可玩的单页游戏

## 核心参考文档

- **实施计划（你的 spec）**：`docs/实施计划Plan2_排行榜后端cc_V1.md`
- **设计稿**：`docs/设计稿Plan2_排行榜后端cc_V1.md`

**实施计划里有完整的代码**——每个 Task 的每个 Step 都给了完整代码块，严格照做。

## 任务范围

执行实施计划中的：

- **Task 1**：后端脚手架 (api/package.json + 安装依赖 + .gitignore)
- **Task 2**：数据层 (api/db.js + tests/api-db.test.js)
- **Task 3**：校验层 (api/validate.js + tests/api-validate.test.js)
- **Task 4**：Express 服务入口 (api/server.js + 手动冒烟测试)
- **Task 5**：前端 API 封装 (js/api.js)
- **Task 9**：部署文档 (api/DEPLOY.md)

**跳过 Task 6、7、8**——那三个改 ui.js/main.js/css 的任务由 Claude 做。

## 执行规范

1. **严格按 plan 的代码执行**——plan 里给的代码是 spec，逐字照做。

2. **每个 Task 一个独立 commit**，commit message 用 plan 里给的。

3. **TDD 节奏**（Task 2 和 Task 3）：
   - 写测试 → 跑确认失败 → 实现 → 跑确认通过 → 提交
   - Task 2 预期 6 个测试
   - Task 3 预期 14 个测试

4. **每个 Task 完成后跑 `npm test`**——确认新测试通过，且原有 35 个测试不受影响。

5. **Task 1 特殊说明**：
   - 在项目根目录下创建 `api/` 子目录
   - `api/package.json` 是独立的后端 package（不是修改根目录的 package.json）
   - `cd api && npm install` 安装后端依赖
   - 更新根目录 `.gitignore` 追加 `api/node_modules/` 和 `api/leaderboard.db`

6. **Task 4 特殊说明**：
   - 不需要写单元测试（server.js 是胶水层，逻辑已在 Task 2-3 测试覆盖）
   - plan 里有手动冒烟测试的 curl 命令，按顺序执行验证
   - 冒烟测试完成后关闭服务器并删除测试数据库 `rm api/leaderboard.db`

7. **Task 5 说明**：
   - `js/api.js` 是浏览器端代码，用 fetch API
   - 不需要写单元测试（依赖网络）
   - 确认 `npm test` 不受影响即可

8. **Task 9 说明**：
   - 创建 `api/DEPLOY.md`，内容在 plan 里已给出

9. **遇到问题立刻停下汇报**：
   - 测试断了
   - `npm install` 失败（better-sqlite3 需要编译，确认有 build tools）
   - plan 里的代码有 bug

10. **不要做 plan 之外的事**——不改 ui.js、不改 main.js、不改 css、不加额外 export。

## 质量标准

- **api/ 目录完全独立**：不 import 前端 js/ 下的任何文件
- **db.js 纯数据层**：不做校验，不做 HTTP，只管 SQLite 读写
- **validate.js 纯函数**：不依赖数据库，不依赖 Express
- **server.js 是胶水**：组合 db + validate + Express，自身不含业务逻辑
- **所有后端文件用 ES module**（`"type": "module"` 在 api/package.json 中）
- **import 路径用相对路径带 .js 后缀**

## better-sqlite3 编译注意

`better-sqlite3` 是原生 Node 模块，需要编译。如果 `npm install` 报错：
- macOS：确认已安装 Xcode Command Line Tools (`xcode-select --install`)
- Linux：需要 `build-essential` 和 `python3`
- 如果实在编不过，换用 `sql.js`（纯 JS 的 SQLite），但 API 不同，需要调整 db.js

## 完成后汇报格式

做完所有指定 Task 后，回复：

```
完成 Plan 2 Task 1-5 + 9，汇总：

Task 1 (api scaffold): commit XXXXXX
Task 2 (db.js): commit XXXXXX, 测试 6/6 通过
Task 3 (validate.js): commit XXXXXX, 测试 14/14 通过
Task 4 (server.js): commit XXXXXX, 冒烟测试 [通过/失败+说明]
Task 5 (js/api.js): commit XXXXXX
Task 9 (DEPLOY.md): commit XXXXXX

git log --oneline (最近15条)：
[贴]

npm test 输出：
[Test Files / Tests 行]

ls api/ 输出：
[贴]

遇到的问题/偏离 plan 的地方：
[列出，如果没有就写"无"]
```

之后 Claude 接 Task 6-8（前端整合：排行榜弹窗 + 昵称输入 + main.js 对接 + 终局界面改造）。

---

**开始吧。需要澄清的随时问。**
