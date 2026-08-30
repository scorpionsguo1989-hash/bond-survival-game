// tests/balance.test.js
// 难度护栏。立项口径：**称职玩家通关率 ≈ 70%（约 30% 的人过不了关），
// 而且乱点必须过不了** —— 差距要来自"看懂 effects、按专业判断做选择"。
//
// 这里的阈值放得比实测宽，是为了只在真正的回归时报警、不被随机波动吵到。
// 精确调参用 `node scripts/balance-check.mjs` 和 `scripts/balance-tune.mjs`。
import { describe, it, expect } from 'vitest';
import { runBalance, summarize } from '../scripts/balance-lib.mjs';

// 每角色 50 局 × 3 角色 × 3 档 ≈ 450 局，几秒内跑完
const stats = summarize(runBalance(50));
const pct = (v) => (v * 100).toFixed(1) + '%';

describe('难度护栏', () => {
  it('称职玩家通关率落在 55%-85%（目标 70%）', () => {
    expect(stats.decent.all, `实测 ${pct(stats.decent.all)}`).toBeGreaterThan(0.55);
    expect(stats.decent.all, `实测 ${pct(stats.decent.all)}`).toBeLessThan(0.85);
  });

  it('乱点过不了关：随机操作通关率不超过 30%', () => {
    expect(stats.random.all, `实测 ${pct(stats.random.all)}`).toBeLessThanOrEqual(0.30);
  });

  it('每个角色的专业判断都要值钱：技能差距至少 20pp', () => {
    for (const role of ['cfo', 'im', 'gov']) {
      const gap = stats.decent[role] - stats.random[role];
      expect(gap, `${role.toUpperCase()} 只有 +${(gap * 100).toFixed(1)}pp（乱点 ${pct(stats.random[role])} / 称职 ${pct(stats.decent[role])}）`)
        .toBeGreaterThanOrEqual(0.20);
    }
  });

  it('打得更好不能反而更差：sharp 不低于 decent 太多', () => {
    expect(stats.sharp.all, `sharp ${pct(stats.sharp.all)} vs decent ${pct(stats.decent.all)}`)
      .toBeGreaterThan(stats.decent.all - 0.08);
  });

  it('没有角色是躺赢的：三个角色乱点通关率都不超过 45%', () => {
    for (const role of ['cfo', 'im', 'gov']) {
      expect(stats.random[role], `${role.toUpperCase()} 乱点 ${pct(stats.random[role])}`)
        .toBeLessThanOrEqual(0.45);
    }
  });
});
