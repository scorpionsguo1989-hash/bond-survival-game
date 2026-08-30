// scripts/balance-check.mjs
// 平衡体检 CLI：按三档玩家水平批量跑局，输出通关率 / 死亡季度分布 / 死因。
//
// 设计目标（沿用立项口径，见 config.DIFFICULTY 注释）：
//   称职玩家（decent）通关率 ≈ 70%，且乱点（random）必须过不了。
//
//   node scripts/balance-check.mjs [每档每角色局数，默认 300]
import { runBalance } from './balance-lib.mjs';

const RUNS = Number(process.argv[2] || 300);
const byTier = runBalance(RUNS);
const pct = (n, d) => d ? (n / d * 100).toFixed(1) + '%' : '—';

console.log(`每档 ${RUNS * 3} 局（三角色混合，角色由种子决定）\n`);
console.log('通关率（目标：decent ≈ 70%，random 越低越好——乱点不该过关）');
const table = [];
for (const [tier, runs] of Object.entries(byTier)) {
  const row = { 档位: tier, 总局数: runs.length, 通关率: pct(runs.filter(r => r.survived).length, runs.length) };
  for (const role of ['cfo', 'im', 'gov']) {
    const rr = runs.filter(r => r.role === role);
    row[role.toUpperCase()] = pct(rr.filter(r => r.survived).length, rr.length);
  }
  const scores = runs.map(r => r.total).sort((a, b) => a - b);
  row['中位分'] = scores[Math.floor(scores.length / 2)];
  table.push(row);
}
console.table(table);

console.log('技能差距（decent − random，越大说明专业判断越值钱）：');
for (const role of ['cfo', 'im', 'gov']) {
  const r = byTier.random.filter(x => x.role === role);
  const d = byTier.decent.filter(x => x.role === role);
  const gap = (d.filter(x => x.survived).length / d.length - r.filter(x => x.survived).length / r.length) * 100;
  console.log(`  ${role.toUpperCase()}: +${gap.toFixed(1)}pp`);
}

const dead = byTier.decent.filter(r => !r.survived);
console.log('\ndecent 档出局季度分布：');
const buckets = { 'Q1-3': 0, 'Q4-6': 0, 'Q7-9': 0, 'Q10-12': 0 };
for (const r of dead) {
  const q = r.quartersPassed;
  if (q <= 3) buckets['Q1-3']++; else if (q <= 6) buckets['Q4-6']++;
  else if (q <= 9) buckets['Q7-9']++; else buckets['Q10-12']++;
}
for (const [k, v] of Object.entries(buckets)) console.log(`  ${k}: ${v} 局 (${pct(v, dead.length)} of 出局)`);

console.log('\ndecent 档死因 Top:');
const reasons = {};
for (const r of dead) reasons[r.reason || '未知'] = (reasons[r.reason || '未知'] || 0) + 1;
Object.entries(reasons).sort((a, b) => b[1] - a[1]).slice(0, 6)
  .forEach(([k, v]) => console.log(`  ${v} 局  ${k}`));
