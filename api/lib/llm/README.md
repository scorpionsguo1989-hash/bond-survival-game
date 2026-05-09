# api/lib/llm — LLM 调用统一客户端 (V1.8.2)

5 家国内主流 provider, OpenAI 兼容接口, 心智模型跟 Python 端 (`gaozhai-bond/services/dichoufuhe-backend/app/llm/`) 完全对齐.

## 支持的 provider

| Provider | 字符串值 | env key | 默认 model | 价格 (¥/M) 输入/输出 |
|---|---|---|---|---|
| DeepSeek | `'deepseek'` | `DEEPSEEK_API_KEY` | `deepseek-chat` | 1 / 2 |
| Qwen-VL (阿里) | `'qwen-vl'` | `QWEN_API_KEY` | `qwen-vl-max` | 20 / 20 |
| Doubao (火山) | `'doubao'` | `DOUBAO_API_KEY` | `doubao-pro-32k` | 0.8 / 2 |
| 智谱 GLM-4 | `'zhipu'` | `ZHIPU_API_KEY` | `glm-4-plus` | 5 / 5 |
| Kimi (Moonshot) | `'kimi'` | `KIMI_API_KEY` | `moonshot-v1-32k` | 24 / 24 |

## 用法

### 普通 chat

```js
import { defaultClient } from './lib/llm/index.js';

const result = await defaultClient.chat({
  provider: 'deepseek',  // 默认即此
  messages: [
    { role: 'system', content: '你是一个搞债人' },
    { role: 'user', content: '...' },
  ],
  temperature: 0.85,
  maxTokens: 600,
  scenario: '城投生存游戏/portrait',  // 用于 LLM 日志分类
});
console.log(result.text);                // 文本内容
console.log(result.usage.costYuan);      // 估算成本 (元)
console.log(result.usage.inputTokens);
```

### JSON Mode

```js
const result = await defaultClient.chat({
  messages: [...],
  responseFormat: 'json_object',
  scenario: '城投生存游戏/coaching',
});
const data = JSON.parse(result.text);
```

### 切 provider

```js
// DeepSeek → Doubao (省 60% cost)
const result = await defaultClient.chat({
  provider: 'doubao',  // 改这一行
  messages: [...],
});
```

### 视觉 (Qwen-VL)

```js
const result = await defaultClient.vision({
  provider: 'qwen-vl',
  messages: [{
    role: 'user',
    content: [
      { type: 'image_url', image_url: { url: 'data:image/png;base64,...' } },
      { type: 'text', text: '识别这张图' },
    ],
  }],
});
```

## 错误处理

```js
import { LLMError, LLMRateLimitError, LLMConfigError } from './lib/llm/index.js';

try {
  const result = await defaultClient.chat({...});
} catch (e) {
  if (e instanceof LLMRateLimitError) {
    // 重试用尽, 应降级
  } else if (e instanceof LLMConfigError) {
    // key 没配
  } else if (e instanceof LLMError) {
    // 通用兜底
  }
  throw e;
}
```

## 跨语言对齐 (Node ↔ Python)

| 心智模型 | Node | Python |
|---|---|---|
| 客户端 | `new LLMClient()` | `LLMClient()` |
| 主调用 | `await client.chat({...})` | `await client.chat(...)` |
| Provider | 字符串 `'deepseek'` | `Provider.DEEPSEEK` enum |
| 错误基类 | `LLMError` | `LLMError` |
| 日志格式 | JSONL, 同 Python | `{ts, provider, model, scenario, tokens_in, tokens_out, cost_yuan, ok}` |
| Cost 计算 | `estimateCostYuan()` | `estimate_cost_yuan()` |

## 加新 provider

只需 1 步:

`providers.js` 加 `PROVIDERS.<name>` 项 + 价格表

```js
export const PROVIDERS = {
  // ... 已有
  myNew: {
    envKey: 'MY_NEW_API_KEY',
    envUrl: 'MY_NEW_BASE_URL',
    envModel: 'MY_NEW_MODEL',
    fallbackUrl: 'https://api.example.com',
    fallbackModel: 'my-model',
    pricePer1k: { 'my-model': { input: 0.001, output: 0.002, cached: 0.0 } },
  },
};
```

如果新 provider 不是 OpenAI 兼容, 需要在 `client.js` 加 provider 分支处理 request body / response 格式.

## 不实现 (YAGNI)

- 流式响应 (现有场景全是非流式)
- function calling (用 prompt + JSON Mode 已够)
- 多 provider 自动 fallback (caller 显式 try/catch)
