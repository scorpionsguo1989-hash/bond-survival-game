// V1.8.2 · LLM 包 · 错误类
// 跨语言对齐 (与 Python app/llm/errors.py 一致)

export class LLMError extends Error {
  constructor(message) {
    super(message);
    this.name = 'LLMError';
  }
}

export class LLMConfigError extends LLMError {
  constructor(message) {
    super(message);
    this.name = 'LLMConfigError';
  }
}

export class LLMRateLimitError extends LLMError {
  constructor(message) {
    super(message);
    this.name = 'LLMRateLimitError';
  }
}

export class LLMResponseError extends LLMError {
  constructor(message) {
    super(message);
    this.name = 'LLMResponseError';
  }
}

export class LLMTimeoutError extends LLMError {
  constructor(message) {
    super(message);
    this.name = 'LLMTimeoutError';
  }
}
