// js/origins/index.js
import { generateOrigin as generateCfoOrigin, computeChallengeScore } from './cfoOrigin.js';
import { generateImOrigin } from './imOrigin.js';
import { generateGovOrigin } from './govOrigin.js';

export { computeChallengeScore, generateImOrigin, generateGovOrigin };

const ROLES = ['cfo', 'im', 'gov'];

export function generateOrigin(roleHint = null) {
  let role = roleHint;
  if (!role) {
    // Q1 决策：三角色等概率随机分配（命运卡是真"命运"）
    role = ROLES[Math.floor(Math.random() * ROLES.length)];
  }
  if (role === 'cfo') return generateCfoOrigin('cfo');
  if (role === 'im') return generateImOrigin();
  if (role === 'gov') return generateGovOrigin();
  throw new Error(`Unknown role: ${role}`);
}
