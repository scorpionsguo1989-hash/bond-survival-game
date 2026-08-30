// tests/turn-pipeline.test.js
// 全流程回归：这批用例针对的是「单元测试全绿、系统仍然坏掉」的一类缺陷。
// 每条都对应一个实测确认过的管线断裂，不要在没有等价替代断言的情况下删除。
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createInitialState, advanceTurn } from '../js/engine.js';
import { pickTurnEvent, resolveEventView } from '../js/eventEngine.js';
import { createGame, applyInput } from '../js/gameLoop.js';
import { SCRIPTS } from '../js/scripts.js';

const readJson = (p) => JSON.parse(readFileSync(new URL(`../content/${p}`, import.meta.url), 'utf8'));
const asArray = (d) => (Array.isArray(d) ? d : d.events || []);

const sampleOrigin = {
  role: 'cfo', regionTier: 'central_capital', businessType: 'infrastructure',
  healthLevel: 'medium', tag: 'leadership_change', starterKit: 'balanced',
  platformName: '淮西市城投', directorName: '张明远',
};

function loadRealContent() {
  return {
    main: readJson('mainEvents.json'),
    random: [
      ...readJson('randomEvents.json'),
      ...readJson('randomEventsIM.json'),
      ...readJson('randomEventsGOV.json'),
      ...readJson('seasonalEvents.json'),
      ...readJson('targetedEvents.json'),
    ],
    blackSwans: [...readJson('blackSwans.json'), ...readJson('blackSwansV2.json')],
    sagaEvents: [...readJson('sagaEvents.json'), ...asArray(readJson('historicalSagas.json'))],
    openingEvents: asArray(readJson('openingEvents.json')),
  };
}

// ─────────────────────────────────────────────
// 1. 内容可达性
// 缺陷：mainEvents 覆盖了全部 12 个季度 × 3 角色，而取事件逻辑是「主线优先，
// 主线为空才走随机池 / saga」。于是 253 条随机事件 + 189 条 saga（含 30 条
// 历史复盘）永远抽不到，约 85% 的内容库是死的。
// ─────────────────────────────────────────────
describe('内容可达性（pickTurnEvent）', () => {
  const content = loadRealContent();

  for (const roleId of ['cfo', 'im', 'gov']) {
    it(`${roleId}：跑 200 局后，随机池和 saga 链头都必须真的出现过`, () => {
      const kinds = { main: 0, random: 0, saga: 0, opening: 0, black_swan: 0 };
      for (let run = 0; run < 200; run++) {
        let state = createInitialState({ ...sampleOrigin, role: roleId });
        for (let q = 0; q < 12; q++) {
          const picked = pickTurnEvent(content, state, roleId);
          if (picked?.event) {
            kinds[picked.source] = (kinds[picked.source] || 0) + 1;
            state = { ...state, ...(picked.statePatch || {}) };
          }
          state = advanceTurn(state);
        }
      }
      expect(kinds.main).toBeGreaterThan(0);
      expect(kinds.random).toBeGreaterThan(0);
      expect(kinds.saga).toBeGreaterThan(0);
    });
  }

  it('saga 链一旦开始就强制接续，不被主线抢占', () => {
    const chainHead = content.sagaEvents.find(
      e => e.saga_step === 1 && e.roles?.cfo && e.next_saga_step_map,
    );
    expect(chainHead, 'sagaEvents 里应存在 CFO 可用的链头').toBeTruthy();
    const nextId = Object.values(chainHead.next_saga_step_map)[0];

    // saga 接续必然发生在开场事件之后，所以要跳过 Q1 的开场分支
    const state = {
      ...createInitialState(sampleOrigin),
      quartersPassed: 3, openingEventConsumed: true, nextSagaEventId: nextId,
    };
    const picked = pickTurnEvent(content, state, 'cfo');
    expect(picked.source).toBe('saga');
    expect(picked.event.id).toBe(nextId);
  });
});

// ─────────────────────────────────────────────
// 2. 政策轴形状
// 缺陷：政策轴是发散的（越紧越紧），实测「温水煮青蛙」12 季有 10 季钉死 -5，
// 第 1 幕「表面平稳」实际第 3 季就到了「严格」。
// ─────────────────────────────────────────────
describe('政策轴 12 季轨迹', () => {
  function trace(scriptId) {
    let state = { ...createInitialState(sampleOrigin), scriptId };
    const out = [state.policyValue];
    for (let q = 0; q < 12; q++) {
      state = advanceTurn(state);
      out.push(state.policyValue);
    }
    return out;
  }

  it('没有任何剧本会长期钉死在边界（贴边不超过 4 季）', () => {
    for (const s of SCRIPTS) {
      const t = trace(s.id).slice(1);
      const pinned = t.filter(v => v === -5 || v === 5).length;
      expect(pinned, `${s.name} 贴边 ${pinned}/12 季：${t.join(' ')}`).toBeLessThanOrEqual(4);
    }
  });

  it('「温水煮青蛙」第 1 幕（policyDrift=0）应真的平稳，不跌破偏紧', () => {
    const t = trace('slow_boil');
    expect(Math.min(...t.slice(1, 5)), `前 4 季：${t.slice(0, 5).join(' ')}`).toBeGreaterThanOrEqual(-2);
  });

  it('「盛极而衰」第 1 幕（policyDrift=+1）应走到偏松侧', () => {
    const t = trace('rise_and_fall');
    expect(Math.max(...t.slice(1, 5)), `前 4 季：${t.slice(0, 5).join(' ')}`).toBeGreaterThanOrEqual(0);
  });
});

// ─────────────────────────────────────────────
// 3. 通关后不得继续推进季度
// 缺陷：enterEndScreen 只是在主界面上盖一层昵称弹窗，主界面的「结束本季」
// 仍然挂着 handleEndTurn。多推几次后 quartersPassed 会超过 12，
// 而排行榜服务端 validate.js 限定 1-12，会把这局成绩静默拒收。
// ─────────────────────────────────────────────
describe('通关边界', () => {
  it('quartersPassed 到 12 之后再调 advanceTurn 不再推进', () => {
    let state = createInitialState(sampleOrigin);
    for (let q = 0; q < 12; q++) state = advanceTurn(state);
    expect(state.quartersPassed).toBe(12);

    const after = advanceTurn(advanceTurn(state));
    expect(after.quartersPassed).toBe(12);
    expect(after.year).toBe(state.year);
    expect(after.quarter).toBe(state.quarter);
  });

  it('已判定死亡的局也不再推进季度', () => {
    const dead = { ...createInitialState(sampleOrigin), survived: false, quartersPassed: 5 };
    expect(advanceTurn(dead).quartersPassed).toBe(5);
  });
});

// ─────────────────────────────────────────────
// 4. 复盘要能认出开场事件
// 缺陷：开场事件的 choices 在顶层，其余事件在 roles[roleId].choices 下。
// 终局页「决策对比」只按后者取，于是每一局的 Q1 都显示「未知事件 / 选项 A」。
// ─────────────────────────────────────────────
describe('resolveEventView（两套事件 schema 的统一取值）', () => {
  const content = loadRealContent();

  it('开场事件（顶层 choices）能取到标题和选项文案', () => {
    const opening = content.openingEvents.find(e => e.role === 'cfo');
    const view = resolveEventView(opening, 'cfo');
    expect(view.title).toBe(opening.title);
    expect(view.choices[0].label).toBe(opening.choices[0].label);
  });

  it('普通事件（roles 嵌套 choices）行为不变', () => {
    const main = content.main.find(e => e.roles?.cfo);
    const view = resolveEventView(main, 'cfo');
    expect(view.title).toBe(main.title);
    expect(view.choices[0].label).toBe(main.roles.cfo.choices[0].label);
  });

  it('角色不匹配时返回空选项而不是抛错', () => {
    expect(resolveEventView(null, 'cfo').choices).toEqual([]);
    expect(resolveEventView({ id: 'x', roles: {} }, 'cfo').choices).toEqual([]);
  });
});

// ─────────────────────────────────────────────
// 5. 本季事件必须表态
// 缺陷：直接结束回合就能把本季事件整个跳过（实测全程不答能走 7 季、eventLog 为 0）。
// 于是"遇到全是负面选项的事件就不表态"成了免费规避，绕开了整个决策系统。
// ─────────────────────────────────────────────
describe('事件不可跳过', () => {
  const content = loadRealContent();

  it('有待决事件时，结束本季不生效', () => {
    const state = createGame('NOSKIP-1', content);
    expect(state.pendingEvent, '开局应有事件').toBeTruthy();
    const after = applyInput(state, { t: 'endTurn' }, content);
    expect(after.quartersPassed, '事件没表态就把季度推进了').toBe(state.quartersPassed);
    expect(after.pendingEvent?.id).toBe(state.pendingEvent.id);
  });

  it('表态之后才能结束本季', () => {
    let state = createGame('NOSKIP-2', content);
    state = applyInput(state, { t: 'event', idx: 0 }, content);
    const after = applyInput(state, { t: 'endTurn' }, content);
    expect(after.quartersPassed).toBe(state.quartersPassed + 1);
  });

  it('全程只点结束本季，走不过第一季', () => {
    let state = createGame('NOSKIP-3', content);
    for (let i = 0; i < 20; i++) state = applyInput(state, { t: 'endTurn' }, content);
    expect(state.quartersPassed).toBe(0);
    expect(state.gameOver).toBe(false);
  });

  it('危机弹窗同样要先处置', () => {
    // 构造一个带待处置危机的局面
    let state = createGame('NOSKIP-4', content);
    state = { ...state, pendingEvent: null, pendingCrisis: { title: 'x', options: [{ label: 'a', effects: {} }] } };
    const after = applyInput(state, { t: 'endTurn' }, content);
    expect(after.quartersPassed).toBe(state.quartersPassed);
  });
});
