// js/rng.js
// 两条随机流，分得很清楚：
//
//   gameRandom()      —— 影响结局的掷骰（事件抽取、不确定选项、黑天鹅、出身生成…）。
//                        由 seed 决定，游标可存可恢复，服务端能按同一 seed 重放出同一局。
//   cosmeticRandom()  —— 只影响观感的随机（提示语抽样、UI 上的假流水号）。
//                        不进种子流，否则界面渲染多调一次就会把游标推歪、重放对不上。
//
// 排行榜之所以能验，就是因为一局 = (seed, 玩家输入序列) 的纯函数。

function hashSeed(seed) {
  const str = String(seed);
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// mulberry32：小、快、够均匀，且完全由 (seed, 调用次数) 决定
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let _seed = null;
let _cursor = 0;
let _next = mulberry32(hashSeed('unseeded'));

/** 播种并把游标归零。开一局新游戏 / 开始重放都从这里进。 */
export function seedGame(seed) {
  _seed = String(seed);
  _cursor = 0;
  _next = mulberry32(hashSeed(_seed));
  return _seed;
}

/** 恢复到某个游标位置（读存档用）。内部靠空转推进，保证与原局逐次对齐。 */
export function restoreGame(seed, cursor = 0) {
  seedGame(seed);
  for (let i = 0; i < cursor; i++) gameRandom();
  return _cursor;
}

/** 影响结局的随机数。每调一次游标 +1。 */
export function gameRandom() {
  _cursor += 1;
  return _next();
}

export function getSeed() { return _seed; }
export function getCursor() { return _cursor; }

/** 只影响观感的随机数，不进种子流。 */
export function cosmeticRandom() {
  return Math.random();
}

/** 生成一个可读、可分享、可回放的对局种子。 */
export function newSeed() {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let out = '';
  for (let i = 0; i < 10; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
    if (i === 3 || i === 6) out += '-';
  }
  return out;
}

/** 从数组里等概率取一个（走种子流） */
export function pickSeeded(arr) {
  return arr[Math.floor(gameRandom() * arr.length)];
}
