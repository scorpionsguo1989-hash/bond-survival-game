// js/actionBudget.js
// 每回合主动操作次数预算。单独成模块是为了避开 engine.js ↔ actions.js 的循环依赖：
// engine.js → roles/index.js → roles/cfo.js → actions.js，所以 actions.js 不能反向 import engine.js。
import { GAME_CONFIG } from './config.js';

/**
 * 本回合还能不能再做一次主动操作。
 * UI 与 main.js 都要走这里，不能只在界面上显示剩余次数。
 */
export function canTakeAction(state) {
  const max = GAME_CONFIG.actionsPerTurn;
  const used = state?.actionsUsed || 0;
  if (used >= max) {
    return { allowed: false, reason: `本季 ${max} 次主动操作已用完` };
  }
  return { allowed: true, remaining: max - used };
}
