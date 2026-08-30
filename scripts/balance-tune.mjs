// scripts/balance-tune.mjs
// 难度调参器：在内存里改 config.DIFFICULTY，扫一组取值，找出同时满足
//   decent 通关率 ≈ 70% · random 尽量低 · 技能差距（decent−random）尽量大
// 的组合。只报告，不落盘——选定的值要手工写回 config.js 并跑 balance-check 复核。
//
//   node scripts/balance-tune.mjs <role> [每档每角色局数，默认 80]
import { DIFFICULTY } from '../js/config.js';
import { runBalance, summarize } from './balance-lib.mjs';

const role = process.argv[2] || 'gov';
const RUNS = Number(process.argv[3] || 80);

const GRIDS = {
  gov: {
    politicalDecayPerQuarter: [4.0, 4.6],
    debtRatioCapacitySensitivity: [0.20, 0.24, 0.28],
  },
  im: { creditPenaltyRate: [0.015, 0.024, 0.033], policyImpactRate: [0.005, 0.008, 0.011] },
  cfo: { gapAtEasiest: [7, 8, 9], gapAtHardest: [20, 23, 26] },
};

const grid = GRIDS[role];
const keys = Object.keys(grid);
const combos = keys.reduce((acc, k) => acc.flatMap(a => grid[k].map(v => ({ ...a, [k]: v }))), [{}]);

const orig = { ...DIFFICULTY[role] };
const rows = [];
for (const combo of combos) {
  Object.assign(DIFFICULTY[role], combo);
  const s = summarize(runBalance(RUNS));
  const dec = s.decent[role], rnd = s.random[role], shp = s.sharp[role];
  rows.push({
    ...combo,
    random: (rnd * 100).toFixed(1) + '%',
    decent: (dec * 100).toFixed(1) + '%',
    sharp: (shp * 100).toFixed(1) + '%',
    技能差: '+' + ((dec - rnd) * 100).toFixed(1) + 'pp',
    // 目标偏离：decent 离 70% 多远 + random 超 25% 的部分
    偏离: (Math.abs(dec - 0.70) + Math.max(0, rnd - 0.25)).toFixed(3),
  });
}
Object.assign(DIFFICULTY[role], orig);
rows.sort((a, b) => Number(a.偏离) - Number(b.偏离));
console.log(`${role.toUpperCase()} 调参（每组 ${RUNS * 3} 局/档），按"离目标最近"排序：`);
console.table(rows.slice(0, 12));
