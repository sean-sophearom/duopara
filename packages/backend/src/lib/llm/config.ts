/**
 * LLM Configuration for Duopara
 * 
 * This module provides a flexible configuration system for different LLM providers
 * and models. Models can be configured per-task to optimize for cost, speed, or quality.
 * 
 * Supported providers: openai, anthropic, google, openrouter, and any OpenAI-compatible API
 */

export type TaskType = 
  | 'text-generation'    // Long-form content generation (stories, articles)
  | 'translation'        // Word/sentence translation
  | 'grammar-analysis'   // Grammatical analysis of words
  | 'summarization'      // Text summarization
  | 'conversation';      // General conversation/chat

export interface ModelConfig {
  /** Model identifier in format "provider/model-name" */
  model: string;
  /** Temperature for generation (0-2) */
  temperature?: number;
  /** Maximum output tokens */
  maxOutputTokens?: number;
  /** Custom base URL for self-hosted or alternative endpoints */
  baseUrl?: string;
  /** Custom API key environment variable name */
  apiKeyEnvVar?: string;
}

export interface LLMConfig {
  /** Default model for tasks without specific configuration */
  default: ModelConfig;
  /** Task-specific model configurations */
  tasks: Partial<Record<TaskType, ModelConfig>>;
  /** Fallback models in order of preference */
  fallbacks?: ModelConfig[];
}

/**
 * Default configuration - uses OpenAI models
 * Override via environment variables or by modifying this config
 */
const defaultConfig: LLMConfig = {
  default: {
    model: 'openai/gpt-4o-mini',
    temperature: 0.7,
    maxOutputTokens: 2048
  },
  tasks: {
    'text-generation': {
      model: process.env.LLM_MODEL_GENERATION || 'openai/gpt-4o',
      temperature: 0.8,
      maxOutputTokens: 4096
    },
    'translation': {
      model: process.env.LLM_MODEL_TRANSLATION || 'openai/gpt-4o-mini',
      temperature: 0.3,
      maxOutputTokens: 512
    },
    'grammar-analysis': {
      model: process.env.LLM_MODEL_ANALYSIS || 'openai/gpt-4o-mini',
      temperature: 0.2,
      maxOutputTokens: 512
    }
  },
  fallbacks: [
    { model: 'anthropic/claude-sonnet-4-20250514' },
    { model: 'google/gemini-2.0-flash' }
  ]
};

let currentConfig: LLMConfig = { ...defaultConfig };

/**
 * Get the current LLM configuration
 */
export function getLLMConfig(): LLMConfig {
  return currentConfig;
}

/**
 * Get model configuration for a specific task
 */
export function getModelForTask(task: TaskType): ModelConfig {
  const taskConfig = currentConfig.tasks[task];
  if (taskConfig) {
    return { ...currentConfig.default, ...taskConfig };
  }
  return currentConfig.default;
}

/**
 * Update LLM configuration
 * Useful for runtime configuration changes
 */
export function updateLLMConfig(config: Partial<LLMConfig>): void {
  currentConfig = {
    ...currentConfig,
    ...config,
    tasks: {
      ...currentConfig.tasks,
      ...config.tasks
    }
  };
}

/**
 * Build model string with fallbacks for resilient generation
 */
export function getModelWithFallbacks(task: TaskType): string | Array<{ model: string; maxRetries?: number }> {
  const primary = getModelForTask(task);
  const fallbacks = currentConfig.fallbacks;
  
  if (!fallbacks || fallbacks.length === 0) {
    return primary.model;
  }
  
  return [
    { model: primary.model, maxRetries: 3 },
    ...fallbacks.map(f => ({ model: f.model, maxRetries: 2 }))
  ];
}
