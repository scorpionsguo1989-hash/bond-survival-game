// V1.8.2 · LLM 包 · 调用日志 (JSONL)
//
// 跨语言对齐 (与 Python app/llm/log.py 格式一致):
// 每行 = {ts, provider, model, scenario, tokens_in, tokens_out, tokens_cached,
//         cost_yuan, elapsed_s, ok, error?}
//
// 默认日志路径: <api_root>/data/llm-calls.jsonl
//   (跟 Python 端 services/dichoufuhe-backend/data/llm-calls.jsonl 各自独立)
// 可用 env LLM_LOG_PATH 覆盖.

import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { estimateCostYuan } from './providers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_LOG_PATH = process.env.LLM_LOG_PATH || join(__dirname, '../../data/llm-calls.jsonl');

function ensureLogDir(path) {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * 写一行 jsonl. 失败静默 (不阻断主调用).
 *
 * @param {object} opts
 * @param {string} opts.provider     'deepseek' / 'qwen-vl' / 'doubao' / 'zhipu' / 'kimi'
 * @param {string} opts.model        e.g. 'deepseek-chat'
 * @param {string} opts.scenario     用于按工具/场景聚合统计
 * @param {number} opts.tokensIn
 * @param {number} opts.tokensOut
 * @param {number} [opts.tokensCached=0]
 * @param {number} [opts.elapsedS=0]
 * @param {boolean} [opts.ok=true]
 * @param {string} [opts.error='']
 * @param {string} [opts.logPath]    覆盖默认路径
 */
export function writeLLMCall({
  provider,
  model,
  scenario,
  tokensIn,
  tokensOut,
  tokensCached = 0,
  elapsedS = 0,
  ok = true,
  error = '',
  logPath = DEFAULT_LOG_PATH,
}) {
  try {
    const cost = estimateCostYuan(provider, model, tokensIn, tokensOut, tokensCached);
    const entry = {
      ts: Date.now() / 1000,
      provider,
      model,
      scenario: scenario || '未分类',
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      tokens_cached: tokensCached,
      cost_yuan: cost,
      elapsed_s: Math.round(elapsedS * 1000) / 1000,
      ok,
    };
    if (error) entry.error = String(error).slice(0, 200);
    ensureLogDir(logPath);
    appendFileSync(logPath, JSON.stringify(entry) + '\n', 'utf8');
  } catch (e) {
    // 静默失败, 不阻断主调用
    console.warn('[llm.log] write failed:', e.message);
  }
}

/**
 * 读最近 N 天的 LLM 调用记录
 */
export function readRecentCalls(days, logPath = DEFAULT_LOG_PATH) {
  if (!existsSync(logPath)) return [];
  const cutoff = Date.now() / 1000 - days * 86400;
  const out = [];
  try {
    const lines = readFileSync(logPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const e = JSON.parse(trimmed);
        if (typeof e.ts === 'number' && e.ts >= cutoff) {
          out.push(e);
        }
      } catch {
        continue;
      }
    }
  } catch (e) {
    console.warn('[llm.log] read failed:', e.message);
  }
  return out;
}

/**
 * 聚合 LLM 调用 (admin /llm/usage 用)
 */
export function aggregateCalls(entries) {
  const callsTotal = entries.length;
  const tokensInTotal = entries.reduce((s, e) => s + (e.tokens_in || 0), 0);
  const tokensOutTotal = entries.reduce((s, e) => s + (e.tokens_out || 0), 0);
  const costYuanTotal = Math.round(
    entries.reduce((s, e) => s + (e.cost_yuan || 0), 0) * 10000,
  ) / 10000;

  const byTool = {};
  const byProvider = {};
  for (const e of entries) {
    const s = e.scenario || '未分类';
    byTool[s] = (byTool[s] || 0) + 1;
    const prov = e.provider || 'deepseek';
    if (!byProvider[prov]) byProvider[prov] = { calls: 0, cost_yuan: 0 };
    byProvider[prov].calls += 1;
    byProvider[prov].cost_yuan = Math.round(
      (byProvider[prov].cost_yuan + (e.cost_yuan || 0)) * 10000,
    ) / 10000;
  }

  const errorCount = entries.filter((e) => e.ok === false).length;
  const errorRate = callsTotal > 0
    ? Math.round((errorCount / callsTotal) * 10000) / 10000
    : 0;

  return {
    calls_total: callsTotal,
    tokens_in_total: tokensInTotal,
    tokens_out_total: tokensOutTotal,
    cost_yuan_total: costYuanTotal,
    by_tool: byTool,
    by_provider: byProvider,
    error_rate: errorRate,
  };
}
