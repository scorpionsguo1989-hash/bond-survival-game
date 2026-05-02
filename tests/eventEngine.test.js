import { describe, it, expect, vi } from 'vitest';
import { findMainEvent, sampleRandomEvents, getPolicyDirection, loadEvents, findSagaEvent, getNextSagaEventId, getEligibleSagaStartEvents } from '../js/eventEngine.js';

// Plan 3 T3: 事件 schema 升级为 roles 嵌套
const mainEvents = [
  {
    id: 'main_2022_q1', trigger: { year: 2022, quarter: 1 }, title: 'A', policyShift: 0,
    roles: {
      cfo: { body: 'CFO Q1 body', choices: [{ label: 'A1', effects: {} }] },
      im:  { body: 'IM Q1 body',  choices: [{ label: 'A2', effects: {} }] },
    },
  },
  {
    id: 'main_2022_q3', trigger: { year: 2022, quarter: 3 }, title: 'B', policyShift: 0,
    roles: {
      cfo: { body: 'CFO Q3 body', choices: [{ label: 'B1', effects: {} }] },
    },
  },
];

const randomEvents = [
  { id: 'r1', type: '市场', weight: { tight: 2, stable: 1, loose: 0.5 }, roles: { cfo: { body: '', choices: [] }, im: { body: '', choices: [] } } },
  { id: 'r2', type: '机遇', weight: { tight: 0.5, stable: 1, loose: 2 }, roles: { cfo: { body: '', choices: [] } } },
  { id: 'r3', type: '经营', weight: { tight: 1, stable: 1, loose: 1 }, roles: { cfo: { body: '', choices: [] }, im: { body: '', choices: [] } } },
];

describe('findMainEvent', () => {
  it('finds main event for current quarter (cfo default)', () => {
    expect(findMainEvent(mainEvents, 2022, 1).id).toBe('main_2022_q1');
    expect(findMainEvent(mainEvents, 2022, 3).id).toBe('main_2022_q3');
  });

  it('returns null when no main event', () => {
    expect(findMainEvent(mainEvents, 2022, 2)).toBeNull();
  });

  it('flattens body/choices for the requested role', () => {
    const cfo = findMainEvent(mainEvents, 2022, 1, 'cfo');
    expect(cfo.body).toBe('CFO Q1 body');
    const im = findMainEvent(mainEvents, 2022, 1, 'im');
    expect(im.body).toBe('IM Q1 body');
  });

  it('skips events without role data', () => {
    // 2022 Q3 event 只有 cfo，im 视角应找不到
    expect(findMainEvent(mainEvents, 2022, 3, 'im')).toBeNull();
  });
});

describe('sampleRandomEvents', () => {
  it('returns array within max bound', () => {
    const result = sampleRandomEvents(randomEvents, 'tight', { min: 0, max: 2 });
    expect(result.length).toBeLessThanOrEqual(2);
  });

  it('does not duplicate events in same sample', () => {
    const result = sampleRandomEvents(randomEvents, 'tight', { min: 2, max: 2 });
    const ids = result.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('filters by role (im pool excludes cfo-only events)', () => {
    const result = sampleRandomEvents(randomEvents, 'stable', { min: 3, max: 3 }, 'im');
    // 只有 r1 和 r3 有 im 视角，最多抽 2 个
    expect(result.length).toBeLessThanOrEqual(2);
    expect(result.every(e => e.id !== 'r2')).toBe(true);
  });

  it('filters expanded events by triggerCondition when state is provided', () => {
    const pool = [
      { id: 'match', weight: { stable: 1 }, triggerCondition: { minQuarter: 2, maxQuarter: 8, regionTier: 'east_core', healthLevel: 'good', policyMin: -1, policyMax: 1 }, roles: { cfo: { body: 'ok', choices: [] } } },
      { id: 'wrong-region', weight: { stable: 1 }, triggerCondition: { regionTier: 'west_prefecture' }, roles: { cfo: { body: 'bad', choices: [] } } },
      { id: 'wrong-role', weight: { stable: 1 }, triggerCondition: { requireRole: 'im' }, roles: { cfo: { body: 'bad', choices: [] } } },
      { id: 'too-early', weight: { stable: 1 }, triggerCondition: { minQuarter: 9 }, roles: { cfo: { body: 'bad', choices: [] } } },
      { id: 'no-condition', weight: { stable: 1 }, roles: { cfo: { body: 'ok', choices: [] } } },
    ];
    const state = {
      quartersPassed: 5,
      policyValue: 0,
      origin: { role: 'cfo', regionTier: 'east_core', healthLevel: 'good' },
      metrics: { cash: 3, nav: 1, debtRatio: 220 },
    };

    const result = sampleRandomEvents(pool, 'stable', { min: 10, max: 10 }, 'cfo', state);
    expect(new Set(result.map(e => e.id))).toEqual(new Set(['match', 'no-condition']));
  });
});

describe('getPolicyDirection', () => {
  it('returns tight/stable/loose based on axis value', () => {
    expect(getPolicyDirection(-3)).toBe('tight');
    expect(getPolicyDirection(0)).toBe('stable');
    expect(getPolicyDirection(2)).toBe('loose');
  });
});

describe('loadEvents', () => {
  it('merges common, IM-specific, and GOV-specific random pools', async () => {
    const responses = {
      'content/mainEvents.json': [{ id: 'main' }],
      'content/randomEvents.json': [{ id: 'common' }],
      'content/randomEventsIM.json': [{ id: 'im-only' }],
      'content/randomEventsGOV.json': [{ id: 'gov-only' }],
    };
    const fetchMock = vi.fn(async url => ({
      json: async () => responses[url],
    }));
    vi.stubGlobal('fetch', fetchMock);

    const events = await loadEvents();

    expect(fetchMock).toHaveBeenCalledWith('content/randomEventsGOV.json');
    expect(events.main).toEqual([{ id: 'main' }]);
    expect(events.random.map(e => e.id)).toEqual(['common', 'im-only', 'gov-only']);

    vi.unstubAllGlobals();
  });

  it('loads expanded scene files and merges playable pools', async () => {
    const responses = {
      'content/mainEvents.json': [{ id: 'main' }],
      'content/randomEvents.json': [{ id: 'common' }],
      'content/randomEventsIM.json': [{ id: 'im-only' }],
      'content/randomEventsGOV.json': [{ id: 'gov-only' }],
      'content/blackSwans.json': [{ id: 'old-swan' }],
      'content/blackSwansV2.json': [{ id: 'new-swan' }],
      'content/seasonalEvents.json': [{ id: 'season' }],
      'content/targetedEvents.json': [{ id: 'targeted' }],
      'content/sagaEvents.json': [{ id: 'saga-step' }],
      'content/npcLibrary.json': { platforms: [{ id: 'npc' }], issuers: [], banks: [], wealth_mgmt: [] },
    };
    const fetchMock = vi.fn(async url => ({
      ok: Object.prototype.hasOwnProperty.call(responses, url),
      json: async () => responses[url],
    }));
    vi.stubGlobal('fetch', fetchMock);

    const events = await loadEvents();

    expect(events.random.map(e => e.id)).toEqual(['common', 'im-only', 'gov-only', 'season', 'targeted']);
    expect(events.blackSwans.map(e => e.id)).toEqual(['old-swan', 'new-swan']);
    expect(events.sagaEvents.map(e => e.id)).toEqual(['saga-step']);
    expect(events.npcLibrary.platforms[0].id).toBe('npc');

    vi.unstubAllGlobals();
  });
});

describe('saga helpers', () => {
  const sagaEvents = [
    {
      id: 'saga_x_step2', saga_id: 'saga_x', saga_step: 2, saga_total_steps: 5, saga_title: '测试长线',
      title: '第二步', policyShift: 0, next_saga_step_map: { '0': 'saga_x_step3', '1': null, '2': 'saga_x_step4' },
      roles: { cfo: { body: 'CFO body', choices: [{ label: 'A', effects: {} }] } },
    },
    {
      id: 'saga_x_step3', saga_id: 'saga_x', saga_step: 3, saga_total_steps: 5, saga_title: '测试长线',
      title: '第三步', policyShift: 0, next_saga_step_map: { '0': null },
      roles: { cfo: { body: 'CFO step3', choices: [{ label: 'A', effects: {} }] } },
    },
  ];

  it('finds and flattens a saga event for the requested role', () => {
    const event = findSagaEvent(sagaEvents, 'saga_x_step2', 'cfo');
    expect(event.body).toBe('CFO body');
    expect(event.saga_id).toBe('saga_x');
    expect(event.next_saga_step_map['0']).toBe('saga_x_step3');
  });

  it('maps choice index to next saga event id or null', () => {
    const event = findSagaEvent(sagaEvents, 'saga_x_step2', 'cfo');
    expect(getNextSagaEventId(event, 0)).toBe('saga_x_step3');
    expect(getNextSagaEventId(event, 1)).toBeNull();
    expect(getNextSagaEventId(event, 9)).toBeNull();
  });

  it('returns eligible step1 saga events but excludes seen and completed saga chains', () => {
    const pool = [
      { ...sagaEvents[0], id: 'saga_x_step1', saga_step: 1, triggerCondition: { minQuarter: 2, maxQuarter: 9 } },
      { ...sagaEvents[0], id: 'saga_seen_step1', saga_id: 'saga_seen', saga_step: 1, triggerCondition: { minQuarter: 2, maxQuarter: 9 } },
      { ...sagaEvents[0], id: 'saga_done_step1', saga_id: 'saga_done', saga_step: 1, triggerCondition: { minQuarter: 2, maxQuarter: 9 } },
      { ...sagaEvents[1], id: 'saga_x_step2', saga_id: 'saga_x', saga_step: 2 },
    ];
    const state = {
      quartersPassed: 4,
      policyValue: 0,
      origin: { role: 'cfo', regionTier: 'east_core', healthLevel: 'medium' },
      metrics: {},
      sagaSeenIds: ['saga_seen_step1'],
      completedSagaIds: ['saga_done'],
    };

    expect(getEligibleSagaStartEvents(pool, state, 'cfo').map(e => e.id)).toEqual(['saga_x_step1']);
  });
});
