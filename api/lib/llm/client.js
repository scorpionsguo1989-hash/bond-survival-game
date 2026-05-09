// V1.8.2 · LLM 包 · LLMClient (主调用类)
//
// 跨语言对齐 (与 Python app/llm/client.py 心智模型一致):
// - 5 家国内主流 provider, OpenAI 兼容 endpoint
//   DeepSeek (chat + reasoner) / Qwen-VL (vision) / Doubao / 智谱 GLM-4 / Kimi
// - chat({provider, messages, ...}) → ChatResult
// - vision({provider, messages, ...}) → ChatResult (多模态)
// - 自动重试: 429 + 5xx 指数退避 (默认 3 次)
// - 自动 cost 估算: 按 provider 价格表
// - 自动日志: writeLLMCall (jsonl)
//
// 不实现 (YAGNI):
// - 流式响应 (现有场景全是非流式)
// - function calling
// - 多 provider 自动 fallback (caller 显式 try/catch)

import {
  LLMConfigError,
  LLMError,
  LLMRateLimitError,
  LLMResponseError,
  LLMTimeoutError,
} from './errors.js';
import { writeLLMCall } from './log.js';
import { PROVIDERS, estimateCostYuan } from './providers.js';

const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_MAX_RETRIES = 3;
const VISION_PROVIDERS = new Set(['qwen-vl', 'doubao']);

function resolveConfig(provider, { model, apiKey, baseUrl } = {}) {
  const config = PROVIDERS[provider];
  if (!config) {
    throw new LLMConfigError(`未支持的 provider: ${provider}`);
  }
  const finalKey = apiKey || process.env[config.envKey] || '';
  const finalUrl = (baseUrl || process.env[config.envUrl] || config.fallbackUrl).replace(/\/+$/, '');
  const finalModel = model || process.env[config.envModel] || config.fallbackModel;
  if (!finalKey) {
    throw new LLMConfigError(
      `${provider} 缺少 API key. 请在 .env 设 ${config.envKey}=xxx`,
    );
  }
  return { apiKey: finalKey, baseUrl: finalUrl, model: finalModel };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class LLMClient {
  constructor({ timeoutMs = DEFAULT_TIMEOUT_MS, maxRetries = DEFAULT_MAX_RETRIES } = {}) {
    this.timeoutMs = timeoutMs;
    this.maxRetries = maxRetries;
  }

  /**
   * 普通 chat 调用 (OpenAI 兼容).
   *
   * @param {object} opts
   * @param {string} [opts.provider='deepseek']
   * @param {Array} opts.messages           [{role, content}]
   * @param {string} [opts.model]           覆盖 provider 默认 model
   * @param {string} [opts.apiKey]
   * @param {string} [opts.baseUrl]
   * @param {number} [opts.temperature=0.85]
   * @param {number} [opts.maxTokens=4096]
   * @param {string} [opts.responseFormat='text']  'text' | 'json_object'
   * @param {string} [opts.scenario='未分类']
   * @param {number} [opts.timeoutMs]
   * @param {number} [opts.maxRetries]
   * @param {AbortSignal} [opts.signal]
   * @returns {Promise<ChatResult>}
   */
  async chat({
    provider = 'deepseek',
    messages,
    model,
    apiKey,
    baseUrl,
    temperature = 0.85,
    maxTokens = 4096,
    responseFormat = 'text',
    scenario = '未分类',
    timeoutMs,
    maxRetries,
    signal,
    topP, // 兼容旧 caller (portrait.js / coaching.js)
  } = {}) {
    const timeout = timeoutMs ?? this.timeoutMs;
    const retries = maxRetries ?? this.maxRetries;
    const cfg = resolveConfig(provider, { model, apiKey, baseUrl });

    const body = {
      model: cfg.model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: false,
    };
    if (topP !== undefined) body.top_p = topP;
    if (responseFormat === 'json_object') {
      body.response_format = { type: 'json_object' };
    }

    const url = `${cfg.baseUrl}/v1/chat/completions`;
    const headers = {
      'Authorization': `Bearer ${cfg.apiKey}`,
      'Content-Type': 'application/json',
    };

    const t0 = Date.now();
    let respData;
    try {
      respData = await this._callWithRetry(url, headers, body, timeout, retries, signal);
    } catch (exc) {
      const elapsedS = (Date.now() - t0) / 1000;
      writeLLMCall({
        provider, model: cfg.model, scenario,
        tokensIn: 0, tokensOut: 0, elapsedS,
        ok: false, error: `${exc.name || 'Error'}: ${exc.message}`,
      });
      throw exc;
    }

    let text;
    try {
      text = respData?.choices?.[0]?.message?.content ?? '';
      if (typeof text !== 'string') text = String(text);
    } catch (exc) {
      const elapsedS = (Date.now() - t0) / 1000;
      writeLLMCall({
        provider, model: cfg.model, scenario,
        tokensIn: 0, tokensOut: 0, elapsedS,
        ok: false, error: `response 结构异常: ${exc.message}`,
      });
      throw new LLMResponseError(`${provider} 响应结构异常: ${exc.message}`);
    }

    const usage = respData?.usage || {};
    const tokensIn = usage.prompt_tokens || 0;
    const tokensOut = usage.completion_tokens || 0;
    const tokensCached = usage.prompt_cache_hit_tokens || 0;
    const elapsedS = (Date.now() - t0) / 1000;
    const cost = estimateCostYuan(provider, cfg.model, tokensIn, tokensOut, tokensCached);

    writeLLMCall({
      provider, model: cfg.model, scenario,
      tokensIn, tokensOut, tokensCached, elapsedS, ok: true,
    });

    return {
      text: text.trim(),
      usage: {
        inputTokens: tokensIn,
        outputTokens: tokensOut,
        cachedTokens: tokensCached,
        costYuan: cost,
      },
      provider,
      model: cfg.model,
      latencyS: Math.round(elapsedS * 1000) / 1000,
      rawResponse: respData,
    };
  }

  /**
   * 视觉 chat (多模态). 与 chat 同接口, messages.content 是 array of {type, text/image_url}
   */
  async vision(opts) {
    const provider = opts.provider || 'qwen-vl';
    if (!VISION_PROVIDERS.has(provider)) {
      throw new LLMConfigError(
        `${provider} 不支持视觉调用 (只 qwen-vl / doubao 支持)`,
      );
    }
    return this.chat({ ...opts, provider, temperature: opts.temperature ?? 0.3 });
  }

  async _callWithRetry(url, headers, body, timeoutMs, retries, externalSignal) {
    let lastExc = null;
    for (let attempt = 1; attempt <= retries; attempt += 1) {
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), timeoutMs);
      // 桥接外部 signal
      if (externalSignal) {
        if (externalSignal.aborted) ac.abort();
        else externalSignal.addEventListener('abort', () => ac.abort());
      }
      try {
        const resp = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: ac.signal,
        });
        clearTimeout(timer);

        if (resp.status === 429) {
          const txt = await resp.text().catch(() => '');
          lastExc = new LLMRateLimitError(txt.slice(0, 200));
        } else if (resp.status >= 500) {
          const txt = await resp.text().catch(() => '');
          lastExc = new LLMResponseError(`HTTP ${resp.status}: ${txt.slice(0, 200)}`);
        } else if (!resp.ok) {
          // 4xx 其他 - 不重试
          const txt = await resp.text().catch(() => '');
          throw new LLMResponseError(`HTTP ${resp.status}: ${txt.slice(0, 200)}`);
        } else {
          return await resp.json();
        }
      } catch (exc) {
        clearTimeout(timer);
        if (exc.name === 'AbortError') {
          lastExc = new LLMTimeoutError(`timeout ${timeoutMs}ms (attempt ${attempt})`);
        } else if (exc instanceof LLMError) {
          lastExc = exc;
          // 4xx 其他直接抛
          if (exc instanceof LLMResponseError && !exc.message.includes('HTTP 5')) {
            throw exc;
          }
        } else {
          // 网络错误等
          lastExc = new LLMError(`fetch failed: ${exc.message}`);
        }
      }

      if (attempt < retries) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        await sleep(backoffMs);
      }
    }
    throw lastExc || new LLMError('retry 耗尽, 未知原因');
  }
}

// 全局 default client
export const defaultClient = new LLMClient();
