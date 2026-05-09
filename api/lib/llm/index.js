// V1.8.2 · LLM 包 · public exports
//
// 用法:
//   import { LLMClient, defaultClient } from './lib/llm/index.js';
//   import { LLMError, LLMRateLimitError } from './lib/llm/index.js';
//
//   const result = await defaultClient.chat({
//     provider: 'deepseek',
//     messages: [{ role: 'user', content: '你好' }],
//     scenario: '城投生存游戏/portrait',
//     responseFormat: 'json_object',
//   });
//   console.log(result.text, result.usage.costYuan);

export { LLMClient, defaultClient } from './client.js';
export {
  LLMError,
  LLMConfigError,
  LLMRateLimitError,
  LLMResponseError,
  LLMTimeoutError,
} from './errors.js';
export { PROVIDERS, estimateCostYuan } from './providers.js';
export {
  writeLLMCall,
  readRecentCalls,
  aggregateCalls,
} from './log.js';
