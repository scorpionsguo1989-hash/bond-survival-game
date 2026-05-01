// js/origins/index.js
import { generateOrigin as generateCfoOrigin, computeChallengeScore } from './cfoOrigin.js';
import { generateImOrigin } from './imOrigin.js';

export { computeChallengeScore, generateImOrigin };

export function generateOrigin(roleHint = null) {
  let role = roleHint;
  if (!role) {
    role = Math.random() < 0.5 ? 'cfo' : 'im';
  }
  if (role === 'cfo') return generateCfoOrigin('cfo');
  if (role === 'im') return generateImOrigin();
  throw new Error(`Unknown role: ${role}`);
}
