// V1.8.2 · LLM 包 · 5 家国内主流 provider 配置
// 跨语言对齐 (与 Python app/llm/providers.py 价格表一致)
//
// 价格调研 (2026-05):
// - DeepSeek (deepseek-chat):     输入 ¥1/M, 输出 ¥2/M, cache 命中 ¥0.1/M
// - DeepSeek (deepseek-reasoner): 输入 ¥4/M, 输出 ¥16/M
// - Qwen-VL-Max:                  输入 ¥20/M, 输出 ¥20/M
// - Doubao-pro-32k:              输入 ¥0.8/M, 输出 ¥2/M
// - 智谱 GLM-4-plus:             输入 ¥5/M, 输出 ¥5/M
// - Kimi (moonshot-v1-32k):      输入 ¥24/M, 输出 ¥24/M

export const PROVIDERS = {
  deepseek: {
    envKey: 'DEEPSEEK_API_KEY',
    envUrl: 'DEEPSEEK_BASE_URL',
    envModel: 'DEEPSEEK_MODEL',
    fallbackUrl: 'https://api.deepseek.com',
    fallbackModel: 'deepseek-chat',
    pricePer1k: {
      'deepseek-chat': { input: 0.001, output: 0.002, cached: 0.0001 },
      'deepseek-reasoner': { input: 0.004, output: 0.016, cached: 0.0001 },
    },
  },
  'qwen-vl': {
    envKey: 'QWEN_API_KEY',
    envUrl: 'QWEN_BASE_URL',
    envModel: 'QWEN_MODEL',
    fallbackUrl: 'https://dashscope.aliyuncs.com/compatible-mode',
    fallbackModel: 'qwen-vl-max',
    pricePer1k: {
      'qwen-vl': { input: 0.020, output: 0.020, cached: 0.0 },
      'qwen-vl-max': { input: 0.020, output: 0.020, cached: 0.0 },
      'qwen-vl-plus': { input: 0.008, output: 0.008, cached: 0.0 },
    },
  },
  doubao: {
    envKey: 'DOUBAO_API_KEY',
    envUrl: 'DOUBAO_BASE_URL',
    envModel: 'DOUBAO_MODEL',
    fallbackUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    fallbackModel: 'doubao-pro-32k',
    pricePer1k: {
      'doubao-pro': { input: 0.0008, output: 0.002, cached: 0.0 },
      'doubao-lite': { input: 0.0003, output: 0.0006, cached: 0.0 },
      'doubao-vision': { input: 0.003, output: 0.003, cached: 0.0 },
    },
  },
  zhipu: {
    envKey: 'ZHIPU_API_KEY',
    envUrl: 'ZHIPU_BASE_URL',
    envModel: 'ZHIPU_MODEL',
    fallbackUrl: 'https://open.bigmodel.cn/api/paas/v4',
    fallbackModel: 'glm-4-plus',
    pricePer1k: {
      'glm-4-plus': { input: 0.005, output: 0.005, cached: 0.0 },
      'glm-4': { input: 0.005, output: 0.005, cached: 0.0 },
      'glm-4-flash': { input: 0.0001, output: 0.0001, cached: 0.0 },
    },
  },
  kimi: {
    envKey: 'KIMI_API_KEY',
    envUrl: 'KIMI_BASE_URL',
    envModel: 'KIMI_MODEL',
    fallbackUrl: 'https://api.moonshot.cn/v1',
    fallbackModel: 'moonshot-v1-32k',
    pricePer1k: {
      'moonshot-v1-8k': { input: 0.012, output: 0.012, cached: 0.0 },
      'moonshot-v1-32k': { input: 0.024, output: 0.024, cached: 0.0 },
      'moonshot-v1-128k': { input: 0.060, output: 0.060, cached: 0.0 },
    },
  },
};

/**
 * 按 provider 价格表估算单次调用成本 (元)
 * 价格表按 model id 前缀匹配, 没匹配到时按该 provider 第一个 model 价 fallback
 */
export function estimateCostYuan(provider, model, tokensIn, tokensOut, tokensCached = 0) {
  const config = PROVIDERS[provider];
  if (!config) return 0.0;

  const m = (model || '').toLowerCase();
  let price = null;
  for (const [prefix, p] of Object.entries(config.pricePer1k)) {
    if (m.startsWith(prefix)) {
      price = p;
      break;
    }
  }
  if (!price) {
    price = Object.values(config.pricePer1k)[0];
  }

  const cost =
    ((tokensIn - tokensCached) * price.input) / 1000 +
    (tokensCached * price.cached) / 1000 +
    (tokensOut * price.output) / 1000;
  return Math.round(cost * 1e6) / 1e6;
}
