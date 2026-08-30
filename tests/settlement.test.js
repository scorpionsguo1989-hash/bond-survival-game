// tests/settlement.test.js
// 归因：每季结算必须说清楚钱去哪了。
// 原来玩家只看到现金从 5.2 掉到 2.0，不知道是到期债务、运营、项目缺口
// 还是三季前某个决策的延迟后果——这是"策略游戏"和"随机数字跳动"的分界线。
import { describe, it, expect } from 'vitest';
import { createInitialState, advanceTurn } from '../js/engine.js';
import { ROLE_CFO } from '../js/roles/cfo.js';
import { ROLE_IM } from '../js/roles/im.js';
import { ROLE_GOV } from '../js/roles/gov.js';

const origins = {
  cfo: { role: 'cfo', regionTier: 'central_capital', businessType: 'infrastructure', healthLevel: 'medium', tag: 'leadership_change', starterKit: 'balanced', platformName: 'X', directorName: 'Y' },
  im: { role: 'im', scale: 'medium', healthLevel: 'medium', tag: 'fresh_product', starterKit: 'balanced', platformName: 'X', directorName: 'Y' },
  gov: { role: 'gov', cityTier: 'prefecture', fiscalStatus: 'transfer_dep', tag: 'major_project', starterKit: 'balanced', platformName: 'X', directorName: 'Y' },
};
// 每个角色的"主账户"：结算条目要能解释它这一季的变化
const primary = { cfo: 'cash', im: 'nav', gov: 'cash' };

describe('每季结算归因', () => {
  for (const [roleId, role] of [['cfo', ROLE_CFO], ['im', ROLE_IM], ['gov', ROLE_GOV]]) {
    it(`${roleId}：advanceTurn 返回结算明细`, () => {
      const state = { ...createInitialState(origins[roleId]), role };
      const { settlement } = role.advanceTurn(state);
      expect(Array.isArray(settlement), '缺少 settlement 明细').toBe(true);
      expect(settlement.length).toBeGreaterThan(1);
      for (const item of settlement) {
        expect(typeof item.label).toBe('string');
        expect(item.label.length).toBeGreaterThan(0);
        expect(typeof item.delta).toBe('number');
        expect(Number.isFinite(item.delta)).toBe(true);
      }
    });

    it(`${roleId}：明细加总必须等于主指标的实际变化`, () => {
      const state = { ...createInitialState(origins[roleId]), role };
      const key = primary[roleId];
      const before = state.metrics[key];
      const { metrics, settlement } = role.advanceTurn(state);
      const explained = settlement
        .filter(s => (s.metric || key) === key)
        .reduce((sum, s) => sum + s.delta, 0);
      expect(explained, `${key} 实际变化 ${(metrics[key] - before).toFixed(4)}，明细只解释了 ${explained.toFixed(4)}`)
        .toBeCloseTo(metrics[key] - before, 2);
    });
  }

  it('引擎把结算明细挂到 state 上，并把延迟后果也算进去', () => {
    let state = createInitialState(origins.cfo);
    state = {
      ...state,
      pendingEffects: [{ quarter: 1, effects: { cash: -1.5 }, sourceEvent: 'e1', sourceTitle: '三季前的非标' }],
    };
    const next = advanceTurn(state);
    expect(Array.isArray(next.lastSettlement)).toBe(true);
    const delayed = next.lastSettlement.find(s => s.label.includes('前情') || s.label.includes('三季前的非标'));
    expect(delayed, '延迟后果没有出现在结算明细里').toBeTruthy();
    expect(delayed.delta).toBe(-1.5);
  });

  it('结算明细能解释引擎层的现金变化（含延迟后果）', () => {
    let state = createInitialState(origins.cfo);
    state = {
      ...state,
      pendingEffects: [{ quarter: 1, effects: { cash: -1.5 }, sourceEvent: 'e1', sourceTitle: '旧账' }],
    };
    const before = state.metrics.cash;
    const next = advanceTurn(state);
    const explained = next.lastSettlement
      .filter(s => (s.metric || 'cash') === 'cash')
      .reduce((sum, s) => sum + s.delta, 0);
    expect(explained).toBeCloseTo(next.metrics.cash - before, 2);
  });
});
