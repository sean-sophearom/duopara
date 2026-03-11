/**
 * LLM Module for Duopara
 * 
 * Provides a clean, reusable abstraction layer for LLM interactions
 * using the Mastra framework. Supports multiple providers and
 * task-specific model configuration.
 * 
 * Usage:
 * ```typescript
 * import { createTextGenerationAgent, getModelForTask, generatedTextSchema } from '../lib/llm';
 * 
 * const agent = createTextGenerationAgent('Spanish', 'intermediate');
 * const result = await agent.generate('Write a story about...', {
 *   structuredOutput: { schema: generatedTextSchema }
 * });
 * const data = result.object; // Typed & validated output
 * ```
 * 
 * Configuration:
 * - Set LLM_MODEL_GENERATION for text generation model
 * - Set LLM_MODEL_TRANSLATION for translation model
 * - Set LLM_MODEL_ANALYSIS for grammar analysis model
 * - Or use updateLLMConfig() for runtime configuration
 */

export * from './config.js';
export * from './agents.js';
export * from './schemas.js';
