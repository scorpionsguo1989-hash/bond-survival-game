// js/roles/index.js
// 角色注册表：engine.js 通过 getRole() 拿到角色对象注入 state
import { ROLE_CFO } from './cfo.js';
import { ROLE_IM } from './im.js';
import { ROLE_GOV } from './gov.js';

export const ROLE_REGISTRY = {
  cfo: ROLE_CFO,
  im: ROLE_IM,
  gov: ROLE_GOV,
};

export function getRole(roleId) {
  const r = ROLE_REGISTRY[roleId];
  if (!r) throw new Error(`Unknown role: ${roleId}`);
  return r;
}

export function listRoles() {
  return Object.values(ROLE_REGISTRY);
}
