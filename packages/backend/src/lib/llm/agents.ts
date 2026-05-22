/**
 * Pre-configured LLM Agents for Duopara
 * 
 * Each agent is optimized for a specific task with appropriate
 * system prompts, model settings, and output handling.
 */

import { Agent } from '@mastra/core/agent';
import { getModelForTask, type TaskType } from './config.js';
import {
  textGenerationInstructions,
  textAdaptationInstructions,
  wordTranslationInstructions,
  sentenceTranslationInstructions,
  grammarAnalysisInstructions,
  fullAnalysisInstructions,
  parallelTranslationInstructions,
  enhancedTranslationInstructions,
  gameDataInstructions,
  goalSuggestionInstructions,
} from './prompts.js';

export function createTextGenerationAgent(language: string, difficulty: string): Agent {
  const config = getModelForTask('text-generation');
  return new Agent({
    id: 'text-generator',
    name: 'Text Generation Agent',
    model: config.model,
    instructions: textGenerationInstructions(language, difficulty),
  });
}

export function createTextAdaptationAgent(language: string): Agent {
  const config = getModelForTask('text-generation');
  return new Agent({
    id: 'text-adapter',
    name: 'Text Adaptation Agent',
    model: config.model,
    instructions: textAdaptationInstructions(language),
  });
}

export function createWordTranslationAgent(sourceLanguage: string, targetLanguage: string): Agent {
  const config = getModelForTask('translation');
  return new Agent({
    id: 'word-translator',
    name: 'Word Translation Agent',
    model: config.model,
    instructions: wordTranslationInstructions(sourceLanguage, targetLanguage),
  });
}

export function createSentenceTranslationAgent(sourceLanguage: string, targetLanguage: string): Agent {
  const config = getModelForTask('translation');
  return new Agent({
    id: 'sentence-translator',
    name: 'Sentence Translation Agent',
    model: config.model,
    instructions: sentenceTranslationInstructions(sourceLanguage, targetLanguage),
  });
}

export function createGrammarAnalysisAgent(language: string): Agent {
  const config = getModelForTask('grammar-analysis');
  return new Agent({
    id: 'grammar-analyzer',
    name: 'Grammar Analysis Agent',
    model: config.model,
    instructions: grammarAnalysisInstructions(language),
  });
}

export function createFullAnalysisAgent(sourceLanguage: string, targetLanguage: string): Agent {
  const config = getModelForTask('translation');
  return new Agent({
    id: 'full-analyzer',
    name: 'Full Analysis Agent',
    model: config.model,
    instructions: fullAnalysisInstructions(sourceLanguage, targetLanguage),
  });
}

export function createParallelTranslationAgent(sourceLanguage: string, targetLanguage: string): Agent {
  const config = getModelForTask('translation');
  return new Agent({
    id: 'parallel-translator',
    name: 'Parallel Text Translation Agent',
    model: config.model,
    instructions: parallelTranslationInstructions(sourceLanguage, targetLanguage),
  });
}

export function createEnhancedTranslationAgent(sourceLanguage: string, targetLanguage: string): Agent {
  const config = getModelForTask('translation');
  return new Agent({
    id: 'enhanced-translator',
    name: 'Enhanced Translation Agent',
    model: config.model,
    instructions: enhancedTranslationInstructions(sourceLanguage, targetLanguage),
  });
}

export function createGameDataAgent(sourceLanguage: string, targetLanguage: string): Agent {
  const config = getModelForTask('translation');
  return new Agent({
    id: 'game-data-generator',
    name: 'Game Data Generation Agent',
    model: config.model,
    instructions: gameDataInstructions(sourceLanguage, targetLanguage),
  });
}

export function createGoalSuggestionAgent(): Agent {
  const config = getModelForTask('text-generation');
  return new Agent({
    id: 'goal-suggester',
    name: 'Goal Suggestion Agent',
    model: config.model,
    instructions: goalSuggestionInstructions(),
  });
}

/**
 * Agent registry for easy lookup
 */
type AgentFactory = (...args: string[]) => Agent;

const agentFactories: Record<string, AgentFactory> = {
  'text-generation': createTextGenerationAgent,
  'word-translation': createWordTranslationAgent,
  'sentence-translation': createSentenceTranslationAgent,
  'grammar-analysis': createGrammarAnalysisAgent,
  'full-analysis': createFullAnalysisAgent,
  'game-data': createGameDataAgent
};

/**
 * Get an agent by type with configuration
 */
export function getAgent(type: keyof typeof agentFactories, ...args: string[]): Agent {
  const factory = agentFactories[type];
  if (!factory) {
    throw new Error(`Unknown agent type: ${type}`);
  }
  return factory(...args);
}
