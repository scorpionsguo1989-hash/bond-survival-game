// js/eventEngine.js
// 角色感知事件加载/筛选（Plan 3 T3）

/**
 * 找到指定季度的主线事件，按角色拍平后返回。
 * 旧签名 findMainEvent(events, year, quarter) 仍兼容（roleId 默认 'cfo'）。
 */
export function findMainEvent(mainEvents, year, quarter, roleId = 'cfo') {
  const matching = mainEvents.filter(e =>
    e.trigger.year === year &&
    e.trigger.quarter === quarter &&
    e.roles && e.roles[roleId]
  );
  if (matching.length === 0) return null;
  const event = matching[Math.floor(Math.random() * matching.length)];
  return flattenForRole(event, roleId);
}

export function getPolicyDirection(axisValue) {
  if (axisValue <= -2) return 'tight';
  if (axisValue >= 2) return 'loose';
  return 'stable';
}

/**
 * 加权抽随机事件，按角色拍平。
 * 旧签名 sampleRandomEvents(pool, dir, count) 仍兼容（roleId 默认 'cfo'）。
 */
export function sampleRandomEvents(pool, policyDirection, count, roleId = 'cfo') {
  const min = count.min;
  const max = count.max;
  const targetCount = min + Math.floor(Math.random() * (max - min + 1));
  if (targetCount === 0) return [];

  // 先按角色过滤
  const filtered = pool.filter(e => e.roles && e.roles[roleId]);
  const remaining = [...filtered];
  const result = [];
  for (let i = 0; i < targetCount && remaining.length > 0; i++) {
    const totalWeight = remaining.reduce((s, e) => s + (e.weight?.[policyDirection] ?? 1), 0);
    let r = Math.random() * totalWeight;
    let pickedIdx = 0;
    for (let j = 0; j < remaining.length; j++) {
      r -= (remaining[j].weight?.[policyDirection] ?? 1);
      if (r <= 0) { pickedIdx = j; break; }
    }
    result.push(flattenForRole(remaining[pickedIdx], roleId));
    remaining.splice(pickedIdx, 1);
  }
  return result;
}

/** 把多角色嵌套事件拍平为单角色视角 */
function flattenForRole(event, roleId) {
  const r = event.roles[roleId];
  return {
    id: event.id,
    title: event.title,
    body: r.body,
    choices: r.choices,
    policyShift: event.policyShift || 0,
    type: event.type,
  };
}

export async function loadEvents() {
  const [mainResp, randResp, randImResp, randGovResp] = await Promise.all([
    fetch('content/mainEvents.json'),
    fetch('content/randomEvents.json'),
    fetch('content/randomEventsIM.json'),
    fetch('content/randomEventsGOV.json'),
  ]);
  const random = await randResp.json();
  const randomIm = await randImResp.json();
  const randomGov = await randGovResp.json();
  return {
    main: await mainResp.json(),
    random: [...random, ...randomIm, ...randomGov],
  };
}
