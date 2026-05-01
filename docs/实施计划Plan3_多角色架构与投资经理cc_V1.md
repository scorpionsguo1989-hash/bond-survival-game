# 实施计划 Plan 3 · 多角色架构 + 投资经理角色

## 0. 元信息

- **作者**：Claude（designer + executor）
- **依赖文档**：`docs/设计稿Plan3_多角色架构与投资经理cc_V1.1.md`
- **执行节奏**：Plan 3A（架构 3 天 / T1-T5）→ Plan 3B（IM 3 天 / T6-T11）
- **整体目标**：57 测试 → 78+ 测试，CFO 100% 兼容，IM 完整可玩

---

## 总体执行规则

1. **TDD 节奏**（涉及引擎/数据/校验的 task）：写测试 → 跑确认失败 → 实现 → 跑确认通过 → 提交
2. **每个 Task 一个独立 commit**，commit message 见 task 内说明
3. **每个 Task 完成后必须跑 `npm test`** 全绿才 commit
4. **每个 Task 完成后必须跑 `node --check js/<modified>.js`** 确认语法
5. **不要做 plan 之外的事**——发现新问题用 `mcp__ccd_session__spawn_task` 起独立任务

---

# Plan 3A：架构改造（3 天 / T1-T5）

目标：让代码支持多角色注入，CFO 玩法 100% 不变，全量回归测试通过。

---

## Task 1：迁移 CFO 到 roles/cfo.js

**Files：**
- Create: `js/roles/index.js`
- Create: `js/roles/cfo.js`
- Modify: `js/roles.js`（保留 re-export 做向后兼容）

### Step 1：建目录 + 写 index.js

```bash
mkdir -p "js/roles"
```

```js
// js/roles/index.js
import { ROLE_CFO } from './cfo.js';

export const ROLE_REGISTRY = {
  cfo: ROLE_CFO,
};

export function getRole(roleId) {
  const r = ROLE_REGISTRY[roleId];
  if (!r) throw new Error(`Unknown role: ${roleId}`);
  return r;
}

export function listRoles() {
  return Object.values(ROLE_REGISTRY);
}
```

### Step 2：写 roles/cfo.js（合并现有 roles.js + actions.js）

把当前 `js/roles.js` 的 `ROLE_CFO`、`getInitialMetrics` 全部搬到 `js/roles/cfo.js`，并按 V1.1 §2.3 schema 包装：

```js
// js/roles/cfo.js
import { CFO_ACTIONS, applyAction as cfoApplyAction, isActionAvailable as cfoIsActionAvailable } from '../actions.js';

const REGION_MODIFIERS = { /* 复制原 roles.js 内容 */ };
const HEALTH_MODIFIERS = { /* 复制原 roles.js 内容 */ };
const INITIAL_CREDIT_USAGE_RATIO = 0.55;

function generateDebtSchedule(rMult, hMult) { /* 复制 */ }

function getInitialMetrics(profile) { /* 复制 */ }

// CFO 的季度自动结算（从 engine.js 抽出）
function advanceTurn(state) {
  let newMetrics = { ...state.metrics };
  const dueIdx = state.quartersPassed;
  if (dueIdx < newMetrics.debtMaturity.length) {
    const due = newMetrics.debtMaturity[dueIdx] || 0;
    newMetrics.cash = round(newMetrics.cash - due, 2);
  }
  newMetrics.cash = round(newMetrics.cash - newMetrics.opCostRate, 2);
  newMetrics.cash = round(newMetrics.cash - newMetrics.projectGap, 2);
  newMetrics.cash = round(newMetrics.cash + 2.5, 2);
  return { metrics: newMetrics, score: state.score };
}

function detectCrisis(state) {
  // 复用现有 engine.js 中的 detectCrisis 逻辑（CFO 部分）
}

function getOnboardingHints(profile) {
  return {
    goal: '存活 12 季度，期末现金不归零',
    topRisks: [
      '现金归零 → 资金链断裂',
      `Q5-Q7 是债务到期高峰，提前备款很重要`,
    ],
    firstActionHint: '先看授信使用率，如果 < 70% 可考虑申请续贷预留子弹',
  };
}

export const ROLE_CFO = {
  id: 'cfo',
  name: '城投财务总监',
  shortName: '财务总监',
  description: '管理一家城投平台的债务与现金流，存活到 2024 年底',

  metrics: ['cash', 'debtMaturity', 'financingCost', 'creditUsage', 'leverageRatio', 'collateralRoom', 'projectGap', 'opCostRate'],
  metricLabels: {
    cash: '现金余量', debtMaturity: '债务到期日历', financingCost: '综合融资成本',
    creditUsage: '授信使用率', leverageRatio: '资产负债率', collateralRoom: '抵押物剩余空间',
    projectGap: '项目投资缺口', opCostRate: '运营成本消耗率',
  },
  deathConditions: [
    { metric: 'cash', op: '<=', threshold: 0, reason: '现金归零，资金链断裂' },
  ],
  scoreWeights: {
    liquidity: 1.0, costControl: 1.0, projectProgress: 1.0,
    compliance: 1.0, crisisResponse: 1.0, development: 1.0,
  },
  dimensionLabels: {
    liquidity: '流动性管理', costControl: '融资成本控制', projectProgress: '项目推进',
    compliance: '合规指数', crisisResponse: '危机应对', development: '综合发展',
  },

  actions: CFO_ACTIONS,
  applyActionEffects: cfoApplyAction,
  isActionAvailable: cfoIsActionAvailable,

  getInitialMetrics,
  advanceTurn,
  detectCrisis,
  getOnboardingHints,
};

function round(v, n) { return parseFloat(v.toFixed(n)); }
```

### Step 3：旧 roles.js 改为 re-export（向后兼容）

```js
// js/roles.js（保留兼容）
export { ROLE_CFO, getInitialMetrics } from './roles/cfo.js';
```

> 这样 engine.js / 其他文件仍能 `import { ROLE_CFO, getInitialMetrics } from './roles.js'`，T2 再统一改 import 路径。

### Step 4：跑全量测试

```bash
npm test
```

**期望**：全 57 个测试通过（schema 兼容，所有引用都还能解析）。

### Step 5：Commit

```bash
git add js/roles/ js/roles.js
git commit -m "refactor(roles): migrate CFO to roles/cfo.js with full role schema"
```

---

## Task 2：角色注册表 + engine 角色驱动

**Files：**
- Modify: `js/engine.js`
- Modify: `js/roles.js`（删除 re-export 后的过渡内容）
- Modify: 所有引用 `from './roles.js'` 的文件改为 `from './roles/index.js'` 或 `from './roles/cfo.js'`
- Test: 扩 `tests/engine.test.js` 增加 5 个 role-aware 测试

### Step 1：先扩测试（TDD）

在 `tests/engine.test.js` 末尾追加：

```js
import { getRole, ROLE_REGISTRY } from '../js/roles/index.js';

describe('role registry', () => {
  it('exposes cfo role', () => {
    expect(getRole('cfo').id).toBe('cfo');
  });
  it('throws on unknown role', () => {
    expect(() => getRole('xxx')).toThrow();
  });
});

describe('createInitialState injects role', () => {
  it('attaches role object to state', () => {
    const origin = { roleId: 'cfo', regionTier: 'central_capital', healthLevel: 'medium', /* ... */ };
    const s = createInitialState(origin);
    expect(s.role).toBeDefined();
    expect(s.role.id).toBe('cfo');
  });
});

describe('checkDeath uses role.deathConditions', () => {
  it('detects death from role-defined condition', () => {
    const origin = { roleId: 'cfo', /* ... */ };
    let s = createInitialState(origin);
    s.metrics.cash = 0;
    expect(checkDeath(s).dead).toBe(true);
    expect(checkDeath(s).reason).toMatch(/现金归零/);
  });
});

describe('advanceTurn delegates to role.advanceTurn', () => {
  it('CFO season settle deducts opCost and adds cash flow', () => {
    const origin = { roleId: 'cfo', /* ... */ };
    let s = createInitialState(origin);
    const initialCash = s.metrics.cash;
    s = advanceTurn(s);
    // CFO 季度结算：减债 + 减运营 + 减项目缺口 + 加现金流
    expect(s.metrics.cash).not.toBe(initialCash);
  });
});
```

```bash
npm test
```

**期望**：FAIL（5 个新测试失败，因为 origin 还没 roleId 字段，且 createInitialState 还没注入 role）。

### Step 2：改造 engine.js

```js
// js/engine.js
import { GAME_CONFIG } from './config.js';
import { getRole } from './roles/index.js';
import { driftPolicy, applyPolicyShift } from './policy.js';

export function createInitialState(origin) {
  const role = getRole(origin.roleId);
  return {
    origin,
    role,                                          // ← 注入
    year: GAME_CONFIG.startYear,
    quarter: GAME_CONFIG.startQuarter,
    policyValue: GAME_CONFIG.policyAxisStart,
    metrics: role.getInitialMetrics(origin),
    score: {},
    actionsUsed: 0,
    quartersPassed: 0,
    survived: true,
    deathReason: null,
    history: [],
    eventLog: [],
    pendingEvent: null,
  };
}

export function advanceTurn(state) {
  // 1. 政策漂移
  const dir = state.policyValue < 0 ? 'tight' : (state.policyValue > 0 ? 'loose' : 'stable');
  let newPolicy = driftPolicy(state.policyValue, dir);

  // 2. 角色独有的季度结算
  const { metrics: newMetrics, score: newScore } = state.role.advanceTurn(state);

  // 3. 季度推进
  let newQuarter = state.quarter + 1;
  let newYear = state.year;
  if (newQuarter > 4) {
    newQuarter = 1;
    newYear += 1;
  }

  // 4. history snapshot
  const newHistory = [...state.history, {
    year: state.year, quarter: state.quarter,
    snapshot: { ...newMetrics }, policyValue: newPolicy,
  }];

  return {
    ...state,
    metrics: newMetrics,
    score: newScore,
    policyValue: newPolicy,
    year: newYear,
    quarter: newQuarter,
    quartersPassed: state.quartersPassed + 1,
    history: newHistory,
    actionsUsed: 0,
    pendingEvent: null,
  };
}

export function checkDeath(state) {
  for (const c of state.role.deathConditions) {
    const v = state.metrics[c.metric];
    if (v == null) continue;
    if (compareThreshold(v, c.op, c.threshold)) {
      return { dead: true, reason: c.reason };
    }
  }
  return { dead: false };
}

function compareThreshold(value, op, threshold) {
  switch (op) {
    case '<':  return value < threshold;
    case '<=': return value <= threshold;
    case '>':  return value > threshold;
    case '>=': return value >= threshold;
    case '==': return value === threshold;
    default: throw new Error(`Unknown op: ${op}`);
  }
}

export function detectCrisis(state) {
  if (state.role.detectCrisis) {
    return state.role.detectCrisis(state);
  }
  return null;
}

export function isGameOver(state) {
  if (state.year > GAME_CONFIG.endYear ||
     (state.year === GAME_CONFIG.endYear && state.quarter > GAME_CONFIG.endQuarter)) {
    return { over: true, reason: 'completed' };
  }
  return { over: false };
}

export function applyEventChoice(state, event, choiceIdx) {
  // 保留原有逻辑（事件已在 eventEngine 拍平）
  // 但 score.<key> 现在用内部 English key（事件 schema 升级后保证）
  // ...
}
```

### Step 3：处理 storage.js 反序列化

`storage.js` 的 `loadGame` 反序列化时要重新注入 `state.role`：

```js
// js/storage.js
import { getRole } from './roles/index.js';

export function loadGame() {
  try {
    const raw = localStorage.getItem('bondgame_save');
    if (!raw) return null;
    const state = JSON.parse(raw);
    if (state && state.origin?.roleId) {
      state.role = getRole(state.origin.roleId);  // ← 反注入
    }
    return state;
  } catch (e) {
    return null;
  }
}

export function saveGame(state) {
  // 序列化时剔除 role（避免循环引用 + 函数无法序列化）
  const { role, ...persistable } = state;
  localStorage.setItem('bondgame_save', JSON.stringify(persistable));
}
```

### Step 4：origin 加 roleId 字段

`js/origins.js`（暂时还在旧路径，T5 才迁移到 origins/）：

```js
// js/origins.js（生成 CFO origin 时加 roleId）
export function generateOrigin(roleHint) {
  const roleId = roleHint || 'cfo';  // 暂时只有 cfo
  // ... 现有逻辑 ...
  return {
    roleId,
    regionTier, businessType, healthLevel, tag,
    platformName, directorName,
  };
}
```

### Step 5：跑测试确认通过

```bash
npm test
```

**期望**：全 62 个测试通过（57 + 5 新增）。

### Step 6：Commit

```bash
git add js/engine.js js/storage.js js/origins.js tests/engine.test.js
git commit -m "refactor(engine): role-driven state with injected role hooks"
```

---

## Task 3：事件 schema 升级 + 23 事件包装 + IM stub

**Files：**
- Modify: `content/mainEvents.json`（schema 升级 + 加 `roles.cfo` 包装 + `roles.im` stub）
- Modify: `content/randomEvents.json`（schema 升级）
- Modify: `js/eventEngine.js`
- Test: 修 `tests/eventEngine.test.js`

### Step 1：修测试（TDD）

`tests/eventEngine.test.js` 改为按新 schema 测试：

```js
describe('findMainEvent with role filter', () => {
  it('returns flattened event for cfo role', () => {
    const events = [{
      id: 'test_1', trigger: { year: 2022, quarter: 1 }, title: 'Test',
      policyShift: 0,
      roles: {
        cfo: { body: 'CFO body', choices: [{ label: 'A', effects: {} }] },
        im:  { body: 'IM body',  choices: [{ label: 'B', effects: {} }] },
      },
    }];
    const e = findMainEvent(events, 2022, 1, 'cfo');
    expect(e.body).toBe('CFO body');
    expect(e.choices[0].label).toBe('A');
  });
  it('skips events without role data', () => {
    const events = [{
      id: 'cfo_only', trigger: { year: 2022, quarter: 1 }, title: 'X',
      policyShift: 0, roles: { cfo: { body: '', choices: [] } },
    }];
    expect(findMainEvent(events, 2022, 1, 'im')).toBeNull();
  });
});
```

```bash
npm test -- tests/eventEngine.test.js
```

**期望**：FAIL。

### Step 2：升级 eventEngine.js

```js
// js/eventEngine.js
export function findMainEvent(mainEvents, year, quarter, roleId) {
  const matching = mainEvents.filter(e =>
    e.trigger.year === year &&
    e.trigger.quarter === quarter &&
    e.roles && e.roles[roleId]
  );
  if (matching.length === 0) return null;
  const event = matching[Math.floor(Math.random() * matching.length)];
  return flattenForRole(event, roleId);
}

export function sampleRandomEvents(randomEvents, direction, opts, roleId = 'cfo') {
  const pool = randomEvents.filter(e => {
    if (e.policyDirection && e.policyDirection !== direction && e.policyDirection !== 'any') return false;
    return e.roles && e.roles[roleId];
  });
  const min = opts?.min ?? 1, max = opts?.max ?? 1;
  const count = min + Math.floor(Math.random() * (max - min + 1));
  const selected = [];
  const available = [...pool];
  for (let i = 0; i < count && available.length > 0; i++) {
    const idx = Math.floor(Math.random() * available.length);
    selected.push(flattenForRole(available[idx], roleId));
    available.splice(idx, 1);
  }
  return selected;
}

function flattenForRole(event, roleId) {
  const r = event.roles[roleId];
  return {
    id: event.id,
    title: event.title,
    body: r.body,
    choices: r.choices,
    policyShift: event.policyShift || 0,
  };
}

export function getPolicyDirection(policyValue) {
  if (policyValue <= -2) return 'tight';
  if (policyValue >= 2) return 'loose';
  return 'stable';
}

export async function loadEvents() {
  const [main, random] = await Promise.all([
    fetch('content/mainEvents.json').then(r => r.json()),
    fetch('content/randomEvents.json').then(r => r.json()),
  ]);
  return { main, random };
}
```

### Step 3：写脚本批量包装现有 23 个 mainEvents

写个一次性脚本（执行后即可删除）`scripts/migrate-events.mjs`：

```js
// scripts/migrate-events.mjs
import fs from 'fs';
const events = JSON.parse(fs.readFileSync('content/mainEvents.json', 'utf8'));
const migrated = events.map(e => {
  if (e.roles) return e;  // 已迁移
  const cfo = { body: e.body, choices: e.choices };
  return {
    id: e.id,
    trigger: e.trigger,
    title: e.title,
    policyShift: e.policyShift,
    roles: {
      cfo,
      im: { body: '[TODO IM 视角文案]', choices: [{ label: '[TODO]', effects: {} }] },
    },
  };
});
fs.writeFileSync('content/mainEvents.json', JSON.stringify(migrated, null, 2));
console.log(`Migrated ${migrated.length} events`);

// 同样处理 randomEvents.json
const randoms = JSON.parse(fs.readFileSync('content/randomEvents.json', 'utf8'));
const migratedRandoms = randoms.map(e => {
  if (e.roles) return e;
  return {
    id: e.id,
    policyDirection: e.policyDirection || 'any',
    roles: { cfo: { body: e.body, choices: e.choices }, im: { body: '[TODO]', choices: [{ label: '[TODO]', effects: {} }] } },
  };
});
fs.writeFileSync('content/randomEvents.json', JSON.stringify(migratedRandoms, null, 2));
```

```bash
node scripts/migrate-events.mjs
```

**重要**：迁移完后用脚本检查 effects 中所有 `score.<key>` 把中文 key 转为 English key（`score.合规指数` → `score.compliance` 等）。可以临时手动 sed：

```bash
# macOS sed 备份并替换
sed -i '' 's/score\.合规指数/score.compliance/g' content/mainEvents.json
sed -i '' 's/score\.流动性管理/score.liquidity/g' content/mainEvents.json
sed -i '' 's/score\.融资成本控制/score.costControl/g' content/mainEvents.json
sed -i '' 's/score\.项目推进/score.projectProgress/g' content/mainEvents.json
sed -i '' 's/score\.危机应对/score.crisisResponse/g' content/mainEvents.json
sed -i '' 's/score\.综合发展/score.development/g' content/mainEvents.json
# 同样处理 randomEvents.json
```

### Step 4：同步改 score.js + applyEventChoice 用 English key

`score.js` 用 English key 计算 dimensions，最后 UI 显示时通过 `state.role.dimensionLabels` 翻译。

```js
// js/score.js（关键改动：用 English key）
const DIM_KEYS = ['liquidity', 'costControl', 'projectProgress', 'compliance', 'crisisResponse', 'development'];

export function computeFinalScore(state) {
  const dimensions = {};
  // 1. liquidity
  const liquidityFromMetric = state.role.id === 'cfo' ? Math.min(20, state.metrics.cash * 4) : /* IM 的等价指标 */ 0;
  dimensions.liquidity = clamp(((state.score?.liquidity || 0) + liquidityFromMetric + 30) / DIM_MAX_RAW * 100);
  // 2. costControl
  // ...
  // 3-6 同理（CFO 用现有公式，IM 在 T6 实装时补完）

  const weights = state.role.scoreWeights;
  const labels = state.role.dimensionLabels;
  const totalWeight = DIM_KEYS.reduce((s, k) => s + (weights[k] || 1), 0);
  const total = DIM_KEYS.reduce((s, k) => s + dimensions[k] * (weights[k] || 1), 0) / totalWeight;

  // 终局界面用的 dimensions 对象 key 翻译为中文标签（兼容旧 UI）
  const labeledDimensions = {};
  DIM_KEYS.forEach(k => labeledDimensions[labels[k]] = dimensions[k]);

  // ... 失败惩罚等
  return { dimensions: labeledDimensions, total: Math.round(total), grade: getScoreGrade(...), ... };
}
```

`engine.js` 的 `applyEventChoice` 处理 effects 时，`score.<key>` 直接读 English key：

```js
// applyEventChoice 中：
if (k.startsWith('score.')) {
  const dim = k.slice(6);  // English key, e.g. 'compliance'
  state.score[dim] = (state.score[dim] || 0) + v;
}
```

### Step 5：跑测试

```bash
npm test
```

**期望**：全 62 个测试通过 + eventEngine 新测试通过 = 64+ 通过。如果 score.js 有测试断 -> 修测试断言（key 改了）。

### Step 6：手动跑一局 CFO 验证

启动前端：

```bash
npm run serve
```

打开 localhost:8080，跑完一局 CFO，确认：
- 事件能正常显示
- 选项 effects 应用正常（现金/score 变化）
- 终局界面六维评分显示正确

### Step 7：Commit

```bash
git add content/mainEvents.json content/randomEvents.json js/eventEngine.js js/score.js js/engine.js tests/eventEngine.test.js
git commit -m "refactor(events): role-aware schema + migrate 23 main events with IM stubs"
rm scripts/migrate-events.mjs  # 一次性脚本，删了
```

---

## Task 4：DB role 字段 + API 向后兼容 + 排行榜筛选 UI

**Files：**
- Modify: `api/db.js`
- Modify: `api/validate.js`
- Modify: `api/server.js`
- Modify: `js/api.js`
- Modify: `js/ui.js`（renderLeaderboardModal 加 tab）
- Test: 扩 `tests/api-db.test.js` + `tests/api-validate.test.js`

### Step 1：扩 db.js 测试

```js
// tests/api-db.test.js 追加
describe('role-aware queries', () => {
  it('insertScore stores role field', () => {
    const id = insertScore(db, { ...validData, role: 'im' });
    const row = db.prepare('SELECT role FROM scores WHERE id = ?').get(id);
    expect(row.role).toBe('im');
  });
  it('getTopScores filters by role', () => {
    insertScore(db, { ...validData, role: 'cfo', score: 80 });
    insertScore(db, { ...validData, role: 'im',  score: 90 });
    const cfoTop = getTopScores(db, 10, 'cfo');
    expect(cfoTop.every(r => r.role === 'cfo')).toBe(true);
    expect(cfoTop[0].score).toBe(80);
  });
  it('getTopScores without role returns all', () => {
    insertScore(db, { ...validData, role: 'cfo' });
    insertScore(db, { ...validData, role: 'im' });
    const all = getTopScores(db, 10);
    expect(all.length).toBeGreaterThanOrEqual(2);
  });
});
```

### Step 2：改 db.js

```js
// api/db.js
export function createDb(path) {
  const db = new Database(path);
  db.exec(`
    CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nickname TEXT,
      directorName TEXT NOT NULL,
      platformName TEXT NOT NULL,
      regionTier TEXT NOT NULL,
      healthLevel TEXT NOT NULL,
      score INTEGER NOT NULL,
      grade TEXT NOT NULL,
      survived INTEGER NOT NULL,
      quartersPassed INTEGER NOT NULL,
      role TEXT NOT NULL DEFAULT 'cfo',
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_scores_score ON scores(score DESC);
    CREATE INDEX IF NOT EXISTS idx_scores_role_score ON scores(role, score DESC);
  `);
  // 兼容老 db：补 role 字段
  try {
    db.exec(`ALTER TABLE scores ADD COLUMN role TEXT NOT NULL DEFAULT 'cfo'`);
  } catch (e) { /* already exists */ }
  return db;
}

export function insertScore(db, data) {
  const role = data.role || 'cfo';
  const stmt = db.prepare(`INSERT INTO scores
    (nickname, directorName, platformName, regionTier, healthLevel, score, grade, survived, quartersPassed, role)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  return stmt.run(data.nickname, data.directorName, data.platformName,
    data.regionTier, data.healthLevel, data.score, data.grade,
    data.survived ? 1 : 0, data.quartersPassed, role).lastInsertRowid;
}

export function getTopScores(db, limit = 20, role = null) {
  const where = role ? 'WHERE role = ?' : '';
  const stmt = db.prepare(`SELECT *, ROW_NUMBER() OVER (ORDER BY score DESC) as rank
    FROM scores ${where} ORDER BY score DESC LIMIT ?`);
  return role ? stmt.all(role, limit) : stmt.all(limit);
}

export function getRank(db, score, role = null) {
  const where = role ? 'WHERE role = ?' : '';
  const params = role ? [role, score] : [score];
  const total = role
    ? db.prepare(`SELECT COUNT(*) as n FROM scores WHERE role = ?`).get(role).n
    : db.prepare(`SELECT COUNT(*) as n FROM scores`).get().n;
  const better = db.prepare(`SELECT COUNT(*) as n FROM scores ${where} ${role ? 'AND' : 'WHERE'} score > ?`).get(...params).n;
  return { rank: better + 1, total };
}
```

### Step 3：扩 validate.js 测试 + 实现

```js
// tests/api-validate.test.js 追加
it('accepts missing role (defaults to cfo)', () => {
  const { role, ...noRole } = validData;
  const result = validateScoreSubmission(noRole);
  expect(result.valid).toBe(true);
});
it('accepts role=cfo', () => {
  expect(validateScoreSubmission({ ...validData, role: 'cfo' }).valid).toBe(true);
});
it('accepts role=im', () => {
  expect(validateScoreSubmission({ ...validData, role: 'im' }).valid).toBe(true);
});
it('rejects invalid role', () => {
  expect(validateScoreSubmission({ ...validData, role: 'xxx' }).valid).toBe(false);
});
```

```js
// api/validate.js 新增
const VALID_ROLES = ['cfo', 'im', 'gov'];

// 在 validateScoreSubmission 中追加：
if (data.role !== undefined && !VALID_ROLES.includes(data.role)) {
  return fail('role must be one of: cfo, im, gov');
}
// 注意：data.role 缺失不报错，server.js 那边默认填 cfo
```

### Step 4：server.js 路由

```js
// api/server.js
app.post('/api/scores', (req, res) => {
  // ... rate limit 检查 ...
  const data = { ...req.body };
  if (!data.role) {
    data.role = 'cfo';
    console.warn('[BC-FALLBACK] POST /api/scores without role, defaulted to cfo');
  }
  const v = validateScoreSubmission(data);
  if (!v.valid) return res.status(400).json({ ok: false, error: v.error });
  const id = insertScore(db, data);
  const { rank } = getRank(db, data.score, data.role);
  res.json({ ok: true, rank, id });
});

app.get('/api/leaderboard', (req, res) => {
  const role = req.query.role || null;
  if (role && !['cfo', 'im', 'gov'].includes(role)) {
    return res.status(400).json({ ok: false, error: 'invalid role' });
  }
  const data = getTopScores(db, 20, role);
  res.json({ ok: true, data });
});

app.get('/api/rank', (req, res) => {
  const score = parseInt(req.query.score);
  const role = req.query.role || null;
  if (!Number.isInteger(score)) return res.status(400).json({ ok: false, error: 'invalid score' });
  const r = getRank(db, score, role);
  res.json({ ok: true, ...r });
});
```

### Step 5：前端 api.js 接口扩展

```js
// js/api.js
export async function submitScore(data) {
  // data 已包含 role 字段
  // ...
}
export async function fetchLeaderboard(role = null) {
  const url = role ? `${API_BASE}/leaderboard?role=${role}` : `${API_BASE}/leaderboard`;
  // ...
}
export async function fetchRank(score, role = null) {
  const url = role ? `${API_BASE}/rank?score=${score}&role=${role}` : `${API_BASE}/rank?score=${score}`;
  // ...
}
```

### Step 6：renderLeaderboardModal 加角色筛选 tab

```js
// js/ui.js renderLeaderboardModal 改造
export function renderLeaderboardModal(initialData, onClose, fetchFn) {
  let currentRole = null;  // null = 全部
  // 渲染 tab + 表格
  const overlay = document.createElement('div');
  // ...
  overlay.innerHTML = `
    <div class="lb-container">
      <div class="lb-header">
        <span class="lb-title">排行榜 · Top 20</span>
        <button id="btn-lb-close" class="lb-close-btn">✕</button>
      </div>
      <div class="lb-tabs">
        <button class="lb-tab active" data-role="">全部</button>
        <button class="lb-tab" data-role="cfo">财务总监</button>
        <button class="lb-tab" data-role="im">投资经理</button>
      </div>
      <table class="lb-table">...</table>
    </div>
  `;

  function renderRows(data) { /* 渲染表格 body */ }
  renderRows(initialData);

  overlay.querySelectorAll('.lb-tab').forEach(tab => {
    tab.addEventListener('click', async () => {
      overlay.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentRole = tab.dataset.role || null;
      const result = await fetchFn(currentRole);
      renderRows(result?.data || []);
    });
  });
}
```

CSS 加 `.lb-tabs` / `.lb-tab` 样式（深色 tab 风格）。

`main.js` 中调用方式：

```js
async function showLeaderboard() {
  const result = await fetchLeaderboard(null);
  renderLeaderboardModal(result?.data || [], null, fetchLeaderboard);
}
```

### Step 7：跑测试 + 手动联调

```bash
npm test
```

**期望**：78+ 通过。

启 api + serve，手动确认排行榜 tab 切换正常。

### Step 8：Commit

```bash
git add api/ js/api.js js/ui.js js/main.js css/style.css tests/api-db.test.js tests/api-validate.test.js
git commit -m "feat(leaderboard): role field + role filter API + tab UI"
```

---

## Task 5：UI 拆分 + 命运卡 onboarding for CFO

**Files：**
- Create: `js/ui/index.js` (re-export 入口)
- Create: `js/ui/fateCard.js`
- Create: `js/ui/mainScreenShell.js`
- Create: `js/ui/mainScreenCFO.js`
- Create: `js/ui/endScreen.js`
- Create: `js/ui/leaderboard.js`
- Create: `js/ui/nicknamePrompt.js`
- Modify: `js/ui.js`（保留为 re-export 入口）
- Modify: `js/main.js`（import 路径改为 './ui/index.js'）
- Modify: `js/roles/cfo.js`（实现 getOnboardingHints）

### Step 1：抽 fateCard.js（含 onboarding 卡片）

```js
// js/ui/fateCard.js
import { escapeHtml } from './utils.js';

export function renderFateCard(origin, role, onStart) {
  const app = document.getElementById('app');
  const hints = role.getOnboardingHints(origin);

  app.innerHTML = `
    <div class="screen active">
      <div class="fate-container">
        <div class="fate-title">命运卡 · ${role.name}</div>
        <div class="fate-card">
          <span class="role-badge">${role.shortName}</span>
          <div class="role-name">${escapeHtml(origin.directorName)}</div>
          <div class="role-org">${escapeHtml(origin.platformName)}</div>
          <!-- 既有的 fate tags / challenges 部分保留 -->
        </div>

        <div class="onboarding-card">
          <div class="onb-section">
            <div class="onb-title">🎯 本局目标</div>
            <div class="onb-content">${escapeHtml(hints.goal)}</div>
          </div>
          <div class="onb-section">
            <div class="onb-title">⚠ 致命风险</div>
            <ul class="onb-list">
              ${hints.topRisks.map(r => `<li>${escapeHtml(r)}</li>`).join('')}
            </ul>
          </div>
          <div class="onb-section">
            <div class="onb-title">💡 推荐首操作</div>
            <div class="onb-content">${escapeHtml(hints.firstActionHint)}</div>
          </div>
        </div>

        <button id="btn-start" class="start-btn">开始游戏</button>
      </div>
    </div>
  `;

  document.getElementById('btn-start').addEventListener('click', onStart);
}
```

CSS 加 onboarding 卡片样式（深色背景 + 蓝色高亮，与 fate-card 风格一致）。

### Step 2：抽 mainScreenShell.js + mainScreenCFO.js

把现有 `ui.js` 的 `renderMainScreen` 拆分为：

- `mainScreenShell.js`：topbar、事件卡、操作卡、statusbar（共享）
- `mainScreenCFO.js`：CFO 专属指标卡 + 图表

```js
// js/ui/mainScreenShell.js
export function renderMainScreen(state, callbacks) {
  // 渲染骨架（topbar / 事件卡 / 操作卡 / statusbar）
  // 调用角色子渲染器渲染指标卡 + 图表
  if (state.role.id === 'cfo') {
    renderCFOPanel(state);
  }
  // T8 加 IM 分支
}
```

### Step 3：抽 endScreen.js / leaderboard.js / nicknamePrompt.js

把 `renderEndScreen`、`renderLeaderboardModal`、`renderNicknamePrompt`、`generateShareCard`、`downloadShareCard` 拆到对应文件。

### Step 4：ui.js 改为 re-export 入口

```js
// js/ui.js
export * from './ui/fateCard.js';
export * from './ui/mainScreenShell.js';
export * from './ui/endScreen.js';
export * from './ui/leaderboard.js';
export * from './ui/nicknamePrompt.js';
// ...
```

`main.js` 不需要改 import（仍 from './ui.js'）。

### Step 5：CFO getOnboardingHints 落地

`roles/cfo.js` 已在 T1 加了 stub，这里完善文案：

```js
function getOnboardingHints(profile) {
  const isWeak = profile.healthLevel === 'weak';
  return {
    goal: '存活 12 季度，期末现金不归零',
    topRisks: [
      '现金归零 → 资金链断裂',
      'Q5-Q7 是债务到期高峰，提前备款很重要',
      isWeak ? '初始现金紧张，Q1-Q2 不能大手大脚' : null,
    ].filter(Boolean),
    firstActionHint: isWeak
      ? '第一回合先申请银行续贷预留 1-2 亿子弹'
      : '先观察主线事件再决定主动操作时机',
  };
}
```

### Step 6：跑测试 + 手动验证

```bash
npm test
node --check js/ui.js
node --check js/main.js
```

启动前端，跑一局 CFO，确认：
- 命运卡显示 onboarding 卡片
- 主界面布局正常
- 终局/排行榜/分享卡片功能正常

### Step 7：Commit

```bash
git add js/ui/ js/ui.js js/main.js js/roles/cfo.js css/style.css
git commit -m "refactor(ui): split into ui/ modules + add CFO onboarding card"
```

**🎉 Plan 3A 完成。CFO 玩法不变但代码已支持多角色，可以发布"架构升级版"。**

---

# Plan 3B：投资经理实装（3 天 / T6-T11）

目标：实装可玩的 IM 角色，玩家能从命运卡随机抽到 IM 并跑完 12 季度。

---

## Task 6：roles/im.js 完整实现 + 单测

**Files：**
- Create: `js/roles/im.js`
- Create: `js/actions/im.js`（IM 操作定义）
- Modify: `js/roles/index.js`（注册 IM）
- Test: `tests/im-role.test.js`

### Step 1：写测试

```js
// tests/im-role.test.js
import { ROLE_IM } from '../js/roles/im.js';

describe('IM role definition', () => {
  it('has 8 metrics including leverage', () => {
    expect(ROLE_IM.metrics).toContain('leverage');
    expect(ROLE_IM.metrics.length).toBe(8);
  });
  it('has 5 actions', () => {
    expect(ROLE_IM.actions.length).toBe(5);
  });
  it('has 3 death conditions', () => {
    expect(ROLE_IM.deathConditions.length).toBe(3);
  });
});

describe('IM getInitialMetrics', () => {
  it('produces nav=1.0', () => {
    const m = ROLE_IM.getInitialMetrics({ scale: 'medium', healthLevel: 'medium' });
    expect(m.nav).toBe(1.0);
    expect(m.leverage).toBe(100);
    expect(m.cashRatio).toBeGreaterThanOrEqual(8);
  });
});

describe('IM advanceTurn', () => {
  it('NAV decays under tight policy + high credit exposure', () => {
    const state = { policyValue: -3, metrics: ROLE_IM.getInitialMetrics({ scale: 'medium', healthLevel: 'weak' }), score: {} };
    const { metrics } = ROLE_IM.advanceTurn(state);
    expect(metrics.nav).toBeLessThan(1.0);
  });
  it('NAV grows under loose policy', () => {
    const state = { policyValue: 3, metrics: ROLE_IM.getInitialMetrics({ scale: 'medium', healthLevel: 'good' }), score: {} };
    const { metrics } = ROLE_IM.advanceTurn(state);
    expect(metrics.nav).toBeGreaterThan(1.0);
  });
  it('redemption pressure rises when NAV drops', () => { /* ... */ });
  it('leverage decays by 2 each turn', () => { /* ... */ });
  it('triggers redemption when pressure >= 50', () => { /* ... */ });
});

describe('IM actions', () => {
  it('buy_bond increases aum, decreases cashRatio', () => { /* ... */ });
  it('repo_leverage caps at 140', () => { /* ... */ });
  it('manage_expectation reduces redemptionPressure', () => { /* ... */ });
});
```

```bash
npm test -- tests/im-role.test.js
```

**期望**：FAIL（模块还没建）。

### Step 2：写 IM 操作

```js
// js/actions/im.js
export const IM_ACTIONS = [
  {
    id: 'buy_bond', name: '买入债券',
    desc: '加仓债券，可选久期/评级；消耗现金比例',
    cost: 1,
    params: [
      { key: 'amount', label: '买入规模（亿）', min: 1, max: 20, step: 1, default: 5 },
      { key: 'durationTilt', label: '久期倾向', min: -1, max: 1, step: 1, default: 0 },  // -1 短 / 0 中 / 1 长
      { key: 'creditTilt', label: '信用倾向', min: -1, max: 1, step: 1, default: 0 },    // -1 高评级 / 0 中 / 1 下沉
    ],
  },
  {
    id: 'sell_bond', name: '卖出债券',
    desc: '减仓回笼现金，市价折损',
    cost: 1,
    params: [{ key: 'amount', label: '卖出规模（亿）', min: 1, max: 30, step: 1, default: 5 }],
  },
  {
    id: 'repo_leverage', name: '回购加杠杆',
    desc: '短借现金加仓，杠杆率上限 140%',
    cost: 1,
    params: [{ key: 'amount', label: '杠杆规模（亿）', min: 1, max: 20, step: 1, default: 5 }],
  },
  {
    id: 'restructure', name: '调整持仓结构',
    desc: '卖差券买好券，降信用敞口',
    cost: 1,
    params: [{ key: 'amount', label: '调整规模（亿）', min: 1, max: 15, step: 1, default: 5 }],
  },
  {
    id: 'manage_expectation', name: '管理客户预期',
    desc: '降低赎回压力，"画饼"代价',
    cost: 1,
    params: [{ key: 'intensity', label: '强度', min: 1, max: 3, step: 1, default: 2 }],
  },
];

export function imApplyAction(state, actionId, params) {
  const m = { ...state.metrics };
  const score = { ...(state.score || {}) };

  switch (actionId) {
    case 'buy_bond': {
      const cost = params.amount;
      m.cashRatio = round(m.cashRatio - (cost / m.aum) * 100, 2);
      m.aum = round(m.aum + cost, 2);
      m.duration = clamp(m.duration + params.durationTilt * 0.3, 0.5, 7);
      m.creditExposure = clamp(m.creditExposure + params.creditTilt * 5, 0, 100);
      m.concentration = Math.min(25, m.concentration + (cost > 5 ? 2 : 0.5));  // 大单加集中度
      addScore(score, 'projectProgress', 2);
      break;
    }
    case 'sell_bond': {
      const lossPct = state.policyValue <= -2 ? 0.025 : 0.01;  // 政策紧时折损大
      const cashIn = params.amount * (1 - lossPct);
      m.aum = round(m.aum - params.amount, 2);
      m.cashRatio = round(m.cashRatio + (cashIn / m.aum) * 100, 2);
      addScore(score, 'liquidity', 3);
      break;
    }
    case 'repo_leverage': {
      const newLeverage = m.leverage + params.amount;
      if (newLeverage > 140) {
        // 超限制：仍允许加但扣分大
        addScore(score, 'compliance', -10);
        addScore(score, 'crisisResponse', -5);
      }
      m.leverage = Math.min(160, newLeverage);  // 硬上限 160 防止滚雪球
      m.aum = round(m.aum + params.amount, 2);
      m.cashRatio = round(m.cashRatio + (params.amount / m.aum) * 100, 2);
      break;
    }
    case 'restructure': {
      m.creditExposure = Math.max(0, m.creditExposure - params.amount * 0.8);
      m.cashRatio = round(m.cashRatio - 1.5, 2);
      addScore(score, 'compliance', 3);
      addScore(score, 'projectProgress', 2);  // 信用筛选 = projectProgress 内部 key
      break;
    }
    case 'manage_expectation': {
      m.redemptionPressure = Math.max(0, m.redemptionPressure - params.intensity * 8);
      addScore(score, 'compliance', -2);  // "画饼"代价
      addScore(score, 'crisisResponse', 3);
      break;
    }
  }

  return { ...state, metrics: m, score, actionsUsed: (state.actionsUsed || 0) + 1 };
}

export function imIsActionAvailable(state, actionId) {
  const m = state.metrics;
  switch (actionId) {
    case 'buy_bond':
      return m.cashRatio >= 5 ? { available: true } : { available: false, reason: '现金比例 < 5%，无法买入' };
    case 'repo_leverage':
      return m.leverage < 140 ? { available: true } : { available: false, reason: '杠杆已达 140% 上限' };
    case 'sell_bond':
      return m.aum > 1 ? { available: true } : { available: false, reason: 'AUM 太低无法卖出' };
    case 'restructure':
      return m.cashRatio >= 2 ? { available: true } : { available: false, reason: '现金比例不足' };
    case 'manage_expectation':
      return { available: true };
    default:
      return { available: false, reason: '未知操作' };
  }
}

function round(v, n) { return parseFloat(v.toFixed(n)); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function addScore(score, dim, delta) { score[dim] = (score[dim] || 0) + delta; }
```

### Step 3：写 IM 角色注册表

```js
// js/roles/im.js
import { IM_ACTIONS, imApplyAction, imIsActionAvailable } from '../actions/im.js';

const SCALE_PROFILES = {
  large:  { initialAum: 500, cashRatio: 12 },
  medium: { initialAum: 200, cashRatio: 10 },
  small:  { initialAum: 80,  cashRatio: 8  },
};
const HEALTH_PROFILES = {
  good:   { creditExposure: 15, concentration: 8,  initialNavBuffer: 0 },
  medium: { creditExposure: 30, concentration: 12, initialNavBuffer: 0 },
  weak:   { creditExposure: 50, concentration: 14, initialNavBuffer: -0.02 },  // 已经回撤过 2%
};

function getInitialMetrics(profile) {
  const sp = SCALE_PROFILES[profile.scale] || SCALE_PROFILES.medium;
  const hp = HEALTH_PROFILES[profile.healthLevel] || HEALTH_PROFILES.medium;
  return {
    nav: 1.0 + hp.initialNavBuffer,
    aum: sp.initialAum,
    cashRatio: sp.cashRatio,
    duration: 2.5,
    concentration: hp.concentration,
    creditExposure: hp.creditExposure,
    redemptionPressure: profile.tag === 'pending_redemption' ? 35 : 10,
    leverage: 100,
  };
}

function advanceTurn(state) {
  const { policyValue, metrics } = state;
  let { nav, aum, cashRatio, duration, concentration, creditExposure, redemptionPressure, leverage } = metrics;

  // 1. NAV 漂移
  const policyContrib = policyValue * 0.003 * (duration / 3);
  const creditPenalty = (policyValue < 0 ? Math.abs(policyValue) : 0) * (creditExposure / 100) * 0.005;
  const baseYield = 0.012;
  const leverageMultiplier = leverage / 100;
  const navDelta = (baseYield + policyContrib - creditPenalty) * leverageMultiplier;
  nav = round(nav * (1 + navDelta), 4);

  // 2. 赎回压力漂移
  const navMomentum = navDelta < 0 ? Math.abs(navDelta) * 800 : -5;
  const policyMomentum = policyValue < -2 ? 8 : 0;
  redemptionPressure = clamp(redemptionPressure + navMomentum + policyMomentum, 0, 100);

  // 3. 触发部分赎回
  if (redemptionPressure >= 50 && aum > 0) {
    const redeemRatio = (redemptionPressure - 40) / 200;
    const redeemAmount = aum * redeemRatio;
    aum = round(aum - redeemAmount, 2);
    cashRatio = aum > 0 ? round((cashRatio * (aum + redeemAmount) - redeemAmount * 100) / aum, 2) : 0;
  }

  // 4. 杠杆衰减
  leverage = Math.max(100, leverage - 2);

  return {
    metrics: { nav, aum, cashRatio, duration, concentration, creditExposure, redemptionPressure, leverage },
    score: state.score,
  };
}

function detectCrisis(state) {
  const m = state.metrics;
  if (m.redemptionPressure >= 80) {
    return {
      type: 'redemption_run',
      title: '⚠ 赎回挤兑警报',
      body: `赎回压力指数 ${Math.round(m.redemptionPressure)}，临近挤兑临界值。处理失败可能导致流动性枯竭。`,
      options: [
        { label: '紧急砍仓回笼现金', effects: { cashRatio: 5, aum: -10, 'score.crisisResponse': 5 } },
        { label: '管理客户预期', effects: { redemptionPressure: -20, 'score.compliance': -3, _uncertain: 0.6 } },
        { label: '硬扛过去', effects: { redemptionPressure: 5, _uncertain: 0.3 } },
      ],
    };
  }
  return null;
}

function getOnboardingHints(profile) {
  const heavy = profile.healthLevel === 'weak';
  return {
    goal: '存活 12 季度，期末净值不跌穿 0.85',
    topRisks: [
      '净值跌穿 0.85 → 产品清盘',
      '单券集中度超 25% → 监管约谈',
      '回购杠杆超 140% → 强制降杠杆',
      heavy ? '当前持仓重仓弱资质，赎回潮容易踩踏' : null,
    ].filter(Boolean),
    firstActionHint: heavy
      ? '第一回合先卖出 3-5 亿弱资质券，把信用敞口压下来'
      : '观察政策方向，政策松时拉久期，紧时压久期',
  };
}

export const ROLE_IM = {
  id: 'im',
  name: '债券基金经理',
  shortName: '基金经理',
  description: '管理一只债券组合，存活 12 季度且净值不跌穿预警线',

  metrics: ['nav', 'aum', 'cashRatio', 'duration', 'concentration', 'creditExposure', 'redemptionPressure', 'leverage'],
  metricLabels: {
    nav: '组合净值', aum: '持仓规模', cashRatio: '现金比例',
    duration: '组合久期', concentration: '最大单券集中度', creditExposure: 'AA及以下占比',
    redemptionPressure: '赎回压力', leverage: '回购杠杆率',
  },
  deathConditions: [
    { metric: 'nav',           op: '<=', threshold: 0.85, reason: '净值跌穿 0.85，产品被迫清盘' },
    { metric: 'concentration', op: '>',  threshold: 25,   reason: '单券集中度超 25%，被监管约谈处罚' },
    { metric: 'leverage',      op: '>',  threshold: 140,  reason: '杠杆超 140%，触发监管强制降杠杆' },
  ],
  scoreWeights: {
    liquidity: 1.2, costControl: 1.0, projectProgress: 0.8,
    compliance: 1.4, crisisResponse: 1.4, development: 1.0,
  },
  dimensionLabels: {
    liquidity: '流动性管理', costControl: '收益管理', projectProgress: '信用筛选',
    compliance: '合规指数', crisisResponse: '危机应对', development: 'AUM 稳定性',
  },

  actions: IM_ACTIONS,
  applyActionEffects: imApplyAction,
  isActionAvailable: imIsActionAvailable,

  getInitialMetrics,
  advanceTurn,
  detectCrisis,
  getOnboardingHints,
};

function round(v, n) { return parseFloat(v.toFixed(n)); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
```

### Step 4：注册 IM

```js
// js/roles/index.js
import { ROLE_CFO } from './cfo.js';
import { ROLE_IM } from './im.js';

export const ROLE_REGISTRY = {
  cfo: ROLE_CFO,
  im: ROLE_IM,
};
// ...
```

### Step 5：跑测试

```bash
npm test
```

**期望**：78 + 12 ≈ 90 通过。

### Step 6：Commit

```bash
git add js/roles/im.js js/actions/im.js js/roles/index.js tests/im-role.test.js
git commit -m "feat(roles): implement IM role with 8 metrics, 5 actions, 3 death conditions"
```

---

## Task 7：origins/imOrigin.js + 命运卡随机分发

**Files：**
- Create: `js/origins/index.js`
- Create: `js/origins/cfoOrigin.js`（迁移）
- Create: `js/origins/imOrigin.js`
- Modify: `js/origins.js`（保留 re-export）
- Modify: `js/main.js`（startNewGame 使用随机角色）

### Step 1：迁移 CFO origin + 写 IM origin

`js/origins/cfoOrigin.js` = 当前 `js/origins.js`（加 `roleId: 'cfo'`）。

`js/origins/imOrigin.js`：

```js
const INSTITUTIONS = [
  { id: 'bank_wm', label: '银行理财', score: 4 },
  { id: 'mutual',  label: '公募基金', score: 6 },
  { id: 'insur',   label: '保险资管', score: 5 },
  { id: 'private', label: '私募基金', score: 7 },
];
const SCALES = [
  { id: 'large',  label: '大规模（500亿+）', score: 5 },
  { id: 'medium', label: '中规模（100-500亿）', score: 4 },
  { id: 'small',  label: '小规模（<100亿）', score: 7 },
];
const HEALTH = [
  { id: 'good',   label: '干净', score: 3 },
  { id: 'medium', label: '有问题券', score: 5 },
  { id: 'weak',   label: '重仓弱资质', score: 8 },
];
const TAGS = [
  { id: 'fresh_product',     label: '新发产品建仓期', score: 4 },
  { id: 'pending_redemption', label: '大额赎回压力中', score: 7 },
  { id: 'recent_drawdown',   label: '刚经历净值回撤', score: 6 },
  { id: 'star_pm',           label: '明星基金经理光环', score: 3 },
  { id: 'concentrated_clients', label: '机构客户集中度高', score: 6 },
  { id: 'eval_period',       label: '即将考核节点', score: 5 },
];

const PM_NAMES = ['周稳健', '李进取', '陈防御', '王激进', '赵均衡', '钱套利', '孙下沉', '吴久期', '郑流动', '张择时'];
const FUND_NAMES = ['鼎信稳健债', '华瑞精选债', '泰盈优选', '信达增益', '永丰纯债', '安诚信用', '宏远利率', '同泰增强'];

const TARGET_MIN = 16, TARGET_MAX = 26;

export function generateImOrigin() {
  for (let i = 0; i < 50; i++) {
    const inst = pick(INSTITUTIONS);
    const scale = pick(SCALES);
    const health = pick(HEALTH);
    const tag = pick(TAGS);
    const score = inst.score + scale.score + health.score + tag.score;
    if (score >= TARGET_MIN && score <= TARGET_MAX) {
      return {
        roleId: 'im',
        institutionType: inst.id,
        scale: scale.id,
        healthLevel: health.id,
        tag: tag.id,
        directorName: PM_NAMES[Math.floor(Math.random() * PM_NAMES.length)],
        platformName: FUND_NAMES[Math.floor(Math.random() * FUND_NAMES.length)],
        labels: { inst: inst.label, scale: scale.label, health: health.label, tag: tag.label },
        challengeScore: score,
      };
    }
  }
  // fallback
  return { roleId: 'im', institutionType: 'mutual', scale: 'medium', healthLevel: 'medium', tag: 'fresh_product',
           directorName: '钱择时', platformName: '安信纯债', challengeScore: 18,
           labels: { inst: '公募基金', scale: '中规模（100-500亿）', health: '有问题券', tag: '新发产品建仓期' } };
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
```

### Step 2：origins/index.js 路由

```js
// js/origins/index.js
import { generateOrigin as genCfo } from './cfoOrigin.js';
import { generateImOrigin } from './imOrigin.js';

export function generateOrigin(roleHint) {
  // roleHint 可以是 'cfo' / 'im' / null（随机）
  let roleId = roleHint;
  if (!roleId) {
    // 随机分配（Q1 决策）
    roleId = Math.random() < 0.5 ? 'cfo' : 'im';
  }
  if (roleId === 'cfo') return genCfo();
  if (roleId === 'im') return generateImOrigin();
  throw new Error(`Unknown roleId: ${roleId}`);
}
```

### Step 3：main.js startNewGame 用随机角色

```js
// js/main.js
function startNewGame() {
  const origin = generateOrigin();  // 不传参数 = 随机
  state = createInitialState(origin);
  loadCurrentTurnEvent();
  // renderFateCard 现在需要 role 参数（在 T5 已加）
  renderFateCard(origin, state.role, () => enterMainScreen());
  // ... 排行榜按钮 ...
}
```

### Step 4：跑测试 + 手动验证

```bash
npm test
node --check js/main.js
```

启动前端，刷新 5-10 次，确认 CFO 和 IM 都能抽到，命运卡内容正确。

### Step 5：Commit

```bash
git add js/origins/ js/origins.js js/main.js
git commit -m "feat(origins): random role assignment with IM origin generator"
```

---

## Task 8：mainScreenIM + IM 图表 + 赎回压力可视化

**Files：**
- Create: `js/ui/mainScreenIM.js`
- Create: `js/charts/im.js`（净值曲线 + 持仓饼图）
- Modify: `js/ui/mainScreenShell.js`（加 IM 分支）
- Modify: `css/style.css`（IM 指标卡 + 赎回压力组件样式）

### Step 1：mainScreenIM.js

```js
// js/ui/mainScreenIM.js
export function renderIMPanel(state) {
  renderIMMetrics(state);
  renderIMCharts(state);
  renderRedemptionWarningIfNeeded(state);
}

function renderIMMetrics(state) {
  const m = state.metrics;
  const target = document.querySelector('.left-panel');  // mainScreenShell 已渲染容器
  target.innerHTML = `
    <div class="panel">
      <div class="panel-title">核心指标</div>
      ${metricCard('NAV 净值', m.nav.toFixed(4), 'nav-status', m.nav < 0.92 ? 'bad' : (m.nav < 0.97 ? 'warn' : 'ok'))}
      ${metricCard('久期', `${m.duration.toFixed(1)}年`, 'dur', 'neutral')}
      ${metricCard('集中度', `${m.concentration.toFixed(1)}%`, 'conc', m.concentration > 20 ? 'bad' : (m.concentration > 15 ? 'warn' : 'ok'))}
      ${redemptionPressureCard(state)}
    </div>
  `;
}

function metricCard(name, value, key, level) { /* 通用指标卡渲染 */ }

function redemptionPressureCard(state) {
  const m = state.metrics;
  const pressure = Math.round(m.redemptionPressure);
  const expectedRedeem = pressure >= 50 ? (m.aum * (pressure - 40) / 200).toFixed(1) : '0';
  const cashAvail = (m.aum * m.cashRatio / 100).toFixed(1);
  const gap = (parseFloat(expectedRedeem) - parseFloat(cashAvail)).toFixed(1);
  const color = pressure >= 80 ? '#ef5350' : (pressure >= 60 ? '#ffb74d' : (pressure >= 30 ? '#ffd54f' : '#81c784'));
  return `
    <div class="metric metric-redemption" data-pressure="${pressure}">
      <div class="metric-row">
        <span class="metric-name">赎回压力指数</span>
        <span class="metric-value" style="color:${color}">${pressure}</span>
      </div>
      <div class="metric-bar">
        <div class="metric-bar-fill" style="width:${pressure}%; background:${color}"></div>
      </div>
      <div class="redemption-detail">
        <div>🔮 下季预期赎回 ≈ ${expectedRedeem} 亿</div>
        <div>💰 当前现金 ≈ ${cashAvail} 亿</div>
        ${parseFloat(gap) > 0 ? `<div style="color:#ef5350">⚠ 缺口 ${gap} 亿</div>` : ''}
      </div>
    </div>
  `;
}

function renderIMCharts(state) {
  // 净值曲线（从 state.history 提取）
  // 持仓结构饼图（基于 creditExposure / concentration）
  // 调用 js/charts/im.js
}

function renderRedemptionWarningIfNeeded(state) {
  if (state.metrics.redemptionPressure >= 70) {
    const banner = document.createElement('div');
    banner.className = 'redemption-banner';
    banner.innerHTML = `⚠ 赎回压力接近挤兑临界值（≥80 触发挤兑），建议立即处理`;
    // 插入到 topbar 下方
  }
}
```

### Step 2：js/charts/im.js

```js
import Chart from 'chart.js/auto';

let navChart, structureChart;

export function renderNavChart(state) {
  const navHistory = state.history.map(h => h.snapshot.nav).concat(state.metrics.nav);
  const labels = state.history.map((_, i) => `Q${i + 1}`).concat([`Q${state.quartersPassed + 1}`]);
  const ctx = document.getElementById('chart-nav').getContext('2d');
  if (navChart) navChart.destroy();
  navChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'NAV', data: navHistory, borderColor: '#4fc3f7',
        backgroundColor: 'rgba(79,195,247,0.1)', tension: 0.3,
      }, {
        label: '预警线', data: navHistory.map(() => 0.85), borderColor: '#ef5350',
        borderDash: [5, 5], pointRadius: 0,
      }],
    },
    options: { /* 样式 */ },
  });
}

export function renderStructureChart(state) {
  const m = state.metrics;
  const aaPlus = 100 - m.creditExposure;
  const aa = m.creditExposure * 0.6;
  const aaMinus = m.creditExposure * 0.4;
  const ctx = document.getElementById('chart-structure').getContext('2d');
  if (structureChart) structureChart.destroy();
  structureChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['AAA/AA+', 'AA', 'AA-及以下'],
      datasets: [{ data: [aaPlus, aa, aaMinus], backgroundColor: ['#81c784', '#ffb74d', '#ef5350'] }],
    },
    options: { /* 样式 */ },
  });
}
```

### Step 3：mainScreenShell 加 IM 分支

```js
// js/ui/mainScreenShell.js
import { renderCFOPanel } from './mainScreenCFO.js';
import { renderIMPanel } from './mainScreenIM.js';

export function renderMainScreen(state, callbacks) {
  // 渲染共享骨架...
  if (state.role.id === 'cfo') renderCFOPanel(state);
  else if (state.role.id === 'im') renderIMPanel(state);
}
```

### Step 4：CSS 加 IM 样式

```css
/* IM 赎回压力卡 */
.metric-redemption { padding: 10px; border-radius: 6px; background: #07101e; }
.redemption-detail { font-size: 10px; color: #6a8aaa; margin-top: 6px; line-height: 1.6; }
.redemption-banner { background: linear-gradient(90deg, #7f0000, #b71c1c); padding: 8px 16px;
  text-align: center; font-size: 11px; color: #ffcdd2; margin: -20px -20px 10px; }

/* 因果链浮窗（hover） */
.metric-redemption[data-pressure]:hover::after { /* tooltip 实现 */ }
```

### Step 5：操作选项预告（文字 hint）

事件卡渲染时，如果选项 effects 含 `redemptionPressure` 或 `nav`，下方显示一行预告：

```js
// js/ui/mainScreenShell.js renderEventCard
function renderChoiceWithPreview(choice) {
  const previews = [];
  if (choice.effects?.redemptionPressure) previews.push(`赎回压力 ${choice.effects.redemptionPressure > 0 ? '+' : ''}${choice.effects.redemptionPressure}`);
  if (choice.effects?.cashRatio) previews.push(`现金 ${choice.effects.cashRatio > 0 ? '+' : ''}${choice.effects.cashRatio}%`);
  // ...
  return `
    <button class="choice-btn">
      ${escapeHtml(choice.label)}
      ${previews.length > 0 ? `<div class="choice-preview">💡 预计：${previews.join('，')}</div>` : ''}
    </button>
  `;
}
```

### Step 6：手动验证

启动前端，强制构造一局 IM（修改 generateOrigin 临时只返 IM），跑过几个季度确认：
- 指标卡显示正确
- 净值曲线渲染（断点更新）
- 赎回压力卡的预期赎回/缺口计算正确
- 政策紧时 banner 弹出

### Step 7：Commit

```bash
git add js/ui/mainScreenIM.js js/charts/im.js js/ui/mainScreenShell.js css/style.css
git commit -m "feat(ui-im): IM main screen with metrics, charts, and redemption viz"
```

---

## Task 9：23 个主线事件 IM 视角文案

**Files：**
- Modify: `content/mainEvents.json`（替换 23 个事件的 `roles.im` stub 为完整文案）

### 工作方式

把 stub 替换为真实文案。每个事件 IM 视角必须包含：
- `body`：3-5 句话描述事件对买方的影响
- 3 个 `choices`，每个有 `label` + `effects`，effects 必须真实影响 IM 指标
- `teaching` 字段（事件级 metadata，标注教学目标）

### 示例：2022 Q1 事件改写

```json
{
  "id": "main_2022_q1_a",
  "trigger": { "year": 2022, "quarter": 1 },
  "title": "银行收紧城投贷款额度",
  "policyShift": -1,
  "teaching": "valuation_drawdown",
  "roles": {
    "cfo": { /* 已有 */ },
    "im": {
      "body": "央行窗口指导信号传出，商业银行对城投平台贷款全面收紧。市场对城投债估值开始分化，AA 及以下主体收益率上行 30-50bp，二级市场流动性骤降。你管的组合中有 35% AA+ 及以下城投仓位。",
      "choices": [
        {
          "label": "立即减仓 AA 及以下城投，回笼现金等待企稳",
          "effects": { "creditExposure": -8, "cashRatio": 2, "score.crisisResponse": 5, "score.liquidity": 3 }
        },
        {
          "label": "等市场恐慌时博反转，加仓抄底",
          "effects": { "_uncertainty": 0.4, "_uncertainOnSuccess": { "nav": 0.02, "score.development": 5 }, "_uncertainOnFail": { "nav": -0.03, "redemptionPressure": 15 } }
        },
        {
          "label": "增持高评级城投赌'结构性宽松'政策出台",
          "effects": { "creditExposure": -3, "concentration": 2, "score.compliance": 2 }
        }
      ]
    }
  }
}
```

### 23 个事件覆盖一览

按 §3.8 时间轴写完所有 23 个事件 IM 视角，每个事件标注教学目标。可以分成几个写作 session（早上写 8 个，下午写 8 个，晚上写 7 个）。

> **执行建议**：实际撰写时引用真实历史事件（化债政策、城投债务重组试点、2023 年 6 月 1 万亿置换债等），让 IM 视角对从业者读者"对味"。

### 验收

```bash
# 跑事件 schema 校验
node -e "const e=require('./content/mainEvents.json'); console.log('Total:', e.length); console.log('IM stubs:', e.filter(x => x.roles.im.body.includes('TODO')).length)"
```

期望：Total 23，IM stubs 0。

### Commit

```bash
git add content/mainEvents.json
git commit -m "content(events): IM perspective text for all 23 main events"
```

---

## Task 10：10 个 IM 专属随机事件 + 通用随机事件 schema 升级

**Files：**
- Create: `content/randomEventsIM.json`（10 个 IM 独享）
- Modify: `content/randomEvents.json`（已在 T3 升级 schema）
- Modify: `js/eventEngine.js`（加载 IM 随机事件并合并池）

### Step 1：写 10 个 IM 专属事件

```json
[
  {
    "id": "rand_im_1",
    "policyDirection": "any",
    "roles": {
      "im": {
        "body": "持有的某 AAA 城投评级被下调到 AA+，市场报价下跌 2%。",
        "choices": [
          { "label": "立即减仓止损", "effects": { "aum": -3, "cashRatio": 1.5, "score.crisisResponse": 3 } },
          { "label": "持有观望，等评级机构后续动作", "effects": { "nav": -0.005, "_uncertainty": 0.3 } },
          { "label": "加仓博反弹", "effects": { "concentration": 2, "_uncertainty": 0.4, "_uncertainOnSuccess": { "nav": 0.01 }, "_uncertainOnFail": { "nav": -0.015 } } }
        ]
      }
    }
  },
  /* ... 9 个其他 ... */
]
```

### Step 2：合并加载

```js
// js/eventEngine.js loadEvents 改造
export async function loadEvents() {
  const [main, random, randomIm] = await Promise.all([
    fetch('content/mainEvents.json').then(r => r.json()),
    fetch('content/randomEvents.json').then(r => r.json()),
    fetch('content/randomEventsIM.json').then(r => r.json()),
  ]);
  return { main, random: [...random, ...randomIm] };
}
```

### Commit

```bash
git add content/randomEventsIM.json js/eventEngine.js
git commit -m "content(random): 10 IM-specific random events"
```

---

## Task 11：IM 平衡性测试（4 场景 + 5 局手动）

**Files：**
- Create: `tests/im-scenarios.test.js`

### Step 1：4 个确定性场景

```js
// tests/im-scenarios.test.js
import { describe, it, expect } from 'vitest';
import { ROLE_IM } from '../js/roles/im.js';
import { createInitialState, advanceTurn, checkDeath } from '../js/engine.js';
import { imApplyAction } from '../js/actions/im.js';

function simulate(origin, actionPlan, policyTrajectory) {
  let state = createInitialState(origin);
  for (let q = 0; q < 12; q++) {
    state.policyValue = policyTrajectory[q];
    const acts = actionPlan[q] || [];
    for (const a of acts) state = imApplyAction(state, a.id, a.params);
    state = advanceTurn(state);
    const death = checkDeath(state);
    if (death.dead) return { dead: true, reason: death.reason, atQuarter: q + 1, finalNav: state.metrics.nav };
  }
  return { dead: false, finalNav: state.metrics.nav, finalScore: state.score };
}

describe('IM scenario tests', () => {
  it('baseline: 中等机构 + 干净持仓 + 中性政策 → 通关', () => {
    const origin = { roleId: 'im', scale: 'medium', healthLevel: 'good', tag: 'fresh_product',
                     directorName: 'X', platformName: 'Y' };
    const result = simulate(origin, {}, Array(12).fill(0));
    expect(result.dead).toBe(false);
    expect(result.finalNav).toBeGreaterThan(0.95);
  });
  it('redemption stress: 有赎回压力 + 政策紧 → 死或勉强通关', () => {
    const origin = { roleId: 'im', scale: 'medium', healthLevel: 'medium', tag: 'pending_redemption',
                     directorName: 'X', platformName: 'Y' };
    const result = simulate(origin, {}, Array(12).fill(-3));
    expect(result.dead || result.finalNav < 0.92).toBe(true);
  });
  it('high concentration: 不调整结构 → 死于集中度', () => {
    const origin = { roleId: 'im', scale: 'small', healthLevel: 'weak', tag: 'concentrated_clients',
                     directorName: 'X', platformName: 'Y' };
    const plan = { 0: [{ id: 'buy_bond', params: { amount: 15, durationTilt: 0, creditTilt: 1 } }] };  // 大单加仓 + 信用下沉
    const result = simulate(origin, plan, Array(12).fill(-2));
    expect(result.dead).toBe(true);
  });
  it('policy tightening: 持续政策紧 + 高信用敞口 → 死于净值穿线', () => {
    const origin = { roleId: 'im', scale: 'medium', healthLevel: 'weak', tag: 'recent_drawdown',
                     directorName: 'X', platformName: 'Y' };
    const result = simulate(origin, {}, Array(12).fill(-4));
    expect(result.dead).toBe(true);
    expect(result.reason).toMatch(/净值/);
  });
});
```

### Step 2：跑测试

```bash
npm test -- tests/im-scenarios.test.js
```

如果某场景结果不符预期 → 调 IM 公式参数（`baseYield` / `creditPenalty` 系数 / `navMomentum` 系数）。

### Step 3：5 局手动测试

启动前端 + api，刷新随机抽到 IM，跑完 5 局：
- 至少 1 局通关（NAV ≥ 0.95）
- 至少 1 局死于净值穿线
- 至少 1 局触发赎回挤兑

通关率目标：30-60%。

### Step 4：Commit

```bash
git add tests/im-scenarios.test.js
git commit -m "test(im): scenario-based balance tests for IM playability"
```

**🎉 Plan 3 完成。**

---

## 总结：Plan 3 期望最终状态

```
git log --oneline (Plan 3 commits):
xxx test(im): scenario-based balance tests
xxx content(random): 10 IM-specific random events
xxx content(events): IM perspective text for all 23 main events
xxx feat(ui-im): IM main screen with metrics, charts, redemption viz
xxx feat(origins): random role assignment with IM origin
xxx feat(roles): implement IM role
xxx refactor(ui): split into ui/ modules + CFO onboarding
xxx feat(leaderboard): role field + role filter
xxx refactor(events): role-aware schema + migrate 23 events
xxx refactor(engine): role-driven state
xxx refactor(roles): migrate CFO to roles/cfo.js

测试：
Test Files  ~13 passed (was 9)
Tests       ~90 passed (was 57)

新文件结构：
js/
  roles/{index,cfo,im}.js
  origins/{index,cfoOrigin,imOrigin}.js
  actions/im.js
  ui/{index,fateCard,mainScreenShell,mainScreenCFO,mainScreenIM,endScreen,leaderboard,nicknamePrompt}.js
  charts/im.js
content/
  mainEvents.json (23 events × 2 roles)
  randomEvents.json (升级 schema)
  randomEventsIM.json (10 IM 独享)
api/
  db.js (含 role 字段 + role 索引)
  validate.js (含 role 校验)
  server.js (含 ?role= 查询 + BC fallback)
```

**Plan 3 后即可发布"双角色版"——玩家随机抽到 CFO 或 IM，完整可玩，排行榜支持双榜筛选。**
