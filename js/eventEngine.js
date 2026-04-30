// js/eventEngine.js

export function findMainEvent(mainEvents, year, quarter) {
  return mainEvents.find(e => e.trigger.year === year && e.trigger.quarter === quarter) || null;
}

export function getPolicyDirection(axisValue) {
  if (axisValue <= -2) return 'tight';
  if (axisValue >= 2) return 'loose';
  return 'stable';
}

export function sampleRandomEvents(pool, policyDirection, count) {
  const min = count.min;
  const max = count.max;
  const targetCount = min + Math.floor(Math.random() * (max - min + 1));
  if (targetCount === 0) return [];

  // 加权抽样，无放回
  const remaining = [...pool];
  const result = [];
  for (let i = 0; i < targetCount && remaining.length > 0; i++) {
    const totalWeight = remaining.reduce((s, e) => s + (e.weight?.[policyDirection] ?? 1), 0);
    let r = Math.random() * totalWeight;
    let pickedIdx = 0;
    for (let j = 0; j < remaining.length; j++) {
      r -= (remaining[j].weight?.[policyDirection] ?? 1);
      if (r <= 0) { pickedIdx = j; break; }
    }
    result.push(remaining[pickedIdx]);
    remaining.splice(pickedIdx, 1);
  }
  return result;
}

export async function loadEvents() {
  const [mainResp, randResp] = await Promise.all([
    fetch('content/mainEvents.json'),
    fetch('content/randomEvents.json'),
  ]);
  return {
    main: await mainResp.json(),
    random: await randResp.json(),
  };
}
