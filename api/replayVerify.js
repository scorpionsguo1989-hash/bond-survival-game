// api/replayVerify.js
// 排行榜成绩的服务端复算。
//
// 原来的把关只有 validate.js：score 落在 0-200、grade 与 score 自洽、quartersPassed 1-12。
// 这些都是客户端能随手编出来的，所以榜单实际上是装饰性的。
// 现在一局游戏是 (seed, 输入序列) 的纯函数，服务端可以用同一套引擎重放一遍，
// 拿自己算出来的分入库——客户端报什么分不再重要。
import { replayGame } from '../js/gameLoop.js';
import { computeFinalScore } from '../js/score.js';
import { loadAllContent } from './contentVault.js';

// 一局最多 12 季，每季 1 事件 + 最多 2 主动操作 + 1 危机 + 1 结束回合 ≈ 60 步，
// 放宽到 200 给容错，同时挡住用超长序列拖垮服务端的提交。
export const MAX_INPUTS = 200;

const VALID_INPUT_TYPES = new Set(['event', 'action', 'crisis', 'endTurn']);

function fail(error) { return { ok: false, error }; }

function shapeOk(inputs) {
  return inputs.every(i =>
    i && typeof i === 'object' && VALID_INPUT_TYPES.has(i.t)
    && (i.idx === undefined || Number.isInteger(i.idx))
    && (i.id === undefined || typeof i.id === 'string')
    && (i.params === undefined || (i.params && typeof i.params === 'object')),
  );
}

/**
 * 重放并复算一份成绩提交。
 * @returns {{ok: true, verified: object} | {ok: false, error: string}}
 */
export function verifySubmission(data, content = null) {
  if (!data || typeof data !== 'object') return fail('提交内容格式错误');

  const { seed, inputs } = data;
  if (typeof seed !== 'string' || seed.length === 0 || seed.length > 40) {
    return fail('缺少有效的对局种子 seed，无法复算');
  }
  if (!Array.isArray(inputs)) {
    return fail('缺少有效的 inputs 输入序列，无法复算');
  }
  if (inputs.length > MAX_INPUTS) {
    return fail(`输入序列过长（${inputs.length} > 上限 ${MAX_INPUTS}）`);
  }
  if (!shapeOk(inputs)) return fail('输入序列里有无法识别的步骤');

  let state;
  try {
    state = replayGame({ seed, inputs }, content || loadAllContent());
  } catch (e) {
    return fail(`复算失败：${e.message}`);
  }

  // 重放必须把这局走完；走不完说明输入序列被截断或伪造
  if (!state.gameOver) return fail('复算未能走到终局，输入序列不完整');

  const finalScore = computeFinalScore(state);
  const verified = {
    role: state.origin?.role || 'cfo',
    platformName: state.origin?.platformName || '',
    directorName: state.origin?.directorName || '',
    regionTier: state.origin?.regionTier || 'central_capital',
    healthLevel: state.origin?.healthLevel || 'medium',
    score: finalScore.total,
    grade: finalScore.grade.grade,
    survived: !!state.survived,
    quartersPassed: state.quartersPassed,
  };

  // 客户端报的值必须与复算一致。分数、存活、季数任一对不上就驳回，
  // 而不是"以服务端为准"静默改写——静默改写会让作弊者拿不到反馈但仍然上榜。
  const mismatches = [];
  if (Number.isInteger(data.score) && data.score !== verified.score) {
    mismatches.push(`分数（报 ${data.score}，复算 ${verified.score}）`);
  }
  if (typeof data.survived === 'boolean' && data.survived !== verified.survived) {
    mismatches.push(`存活状态（报 ${data.survived}，复算 ${verified.survived}）`);
  }
  if (Number.isInteger(data.quartersPassed) && data.quartersPassed !== verified.quartersPassed) {
    mismatches.push(`存活季度（报 ${data.quartersPassed}，复算 ${verified.quartersPassed}）`);
  }
  if (typeof data.role === 'string' && data.role !== verified.role) {
    mismatches.push(`角色（报 ${data.role}，复算 ${verified.role}）`);
  }
  if (mismatches.length) {
    return fail(`与服务端复算不一致：${mismatches.join('，')}`);
  }

  return { ok: true, verified };
}
