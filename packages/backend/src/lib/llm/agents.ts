/**
 * Pre-configured LLM Agents for Duopara
 * 
 * Each agent is optimized for a specific task with appropriate
 * system prompts, model settings, and output handling.
 */

import { Agent } from '@mastra/core/agent';
import { getModelForTask, type TaskType } from './config.js';

/**
 * Create a generation agent for producing learning content
 */
export function createTextGenerationAgent(language: string, difficulty: string): Agent {
  const config = getModelForTask('text-generation');
  
  const difficultyGuides: Record<string, string> = {
    beginner: 'Use simple present tense, basic vocabulary, short sentences (5-10 words). Avoid idioms, complex conjugations, or subjunctive mood.',
    intermediate: 'Use varied tenses including past and future. Include some idiomatic expressions. Sentences can be 10-20 words. Use common conjugations.',
    advanced: 'Use all tenses including subjunctive. Include idioms, complex sentence structures, and sophisticated vocabulary. Natural, native-like text.'
  };

  return new Agent({
    id: 'text-generator',
    name: 'Text Generation Agent',
    model: config.model,
    instructions: `You are a language learning content generator specializing in ${language}. 
Your task is to generate engaging, contextually appropriate reading material.

Difficulty level: ${difficulty}
${difficultyGuides[difficulty] || difficultyGuides.intermediate}

IMPORTANT RULES:
1. Generate content ONLY in ${language}
2. Make the content engaging and contextually rich
3. The content should feel natural, not like a textbook
4. Return your response as JSON with "title" and "content" fields

Example response format:
{
  "title": "Title in ${language}",
  "content": "The story/article content in ${language}..."
}`
  });
}

/**
 * Create a translation agent for word translation
 */
export function createWordTranslationAgent(sourceLanguage: string, targetLanguage: string): Agent {
  const config = getModelForTask('translation');
  
  return new Agent({
    id: 'word-translator',
    name: 'Word Translation Agent',
    model: config.model,
    instructions: `You are a language translation assistant. 
Always respond with valid JSON. Be concise but accurate.
You translate words from ${sourceLanguage} to ${targetLanguage}.`
  });
}

/**
 * Create a sentence translation agent with grammar hints
 */
export function createSentenceTranslationAgent(sourceLanguage: string, targetLanguage: string): Agent {
  const config = getModelForTask('translation');
  
  return new Agent({
    id: 'sentence-translator',
    name: 'Sentence Translation Agent',
    model: config.model,
    instructions: `You are a language learning assistant specializing in explaining ${sourceLanguage} grammar to ${targetLanguage} speakers. 
Always respond with valid JSON. Be educational and clear.
Provide translations with grammatical explanations when helpful.`
  });
}

/**
 * Create a grammar analysis agent
 */
export function createGrammarAnalysisAgent(language: string): Agent {
  const config = getModelForTask('grammar-analysis');
  
  return new Agent({
    id: 'grammar-analyzer',
    name: 'Grammar Analysis Agent',
    model: config.model,
    instructions: `You are a linguistics expert specializing in ${language}. 
Provide accurate grammatical analysis. Always respond with valid JSON.
Analyze words for: part of speech, base form, gender (if applicable), 
conjugation details, number, and other relevant grammatical information.`
  });
}

/**
 * Create a combined translation and analysis agent
 */
export function createFullAnalysisAgent(sourceLanguage: string, targetLanguage: string): Agent {
  const config = getModelForTask('translation');
  
  return new Agent({
    id: 'full-analyzer',
    name: 'Full Analysis Agent',
    model: config.model,
    instructions: `You are a language learning assistant. 
Provide translation and grammatical analysis for ${sourceLanguage} learners who speak ${targetLanguage}. 
Always respond with valid JSON.

For each word, provide:
- translation: ${targetLanguage} translation
- alternativeTranslations: other possible meanings
- partOfSpeech: grammatical category
- baseForm: infinitive/singular form
- gender: if applicable
- conjugation: tense, person, mood for verbs
- contextualNote: usage explanation`
  });
}

/**
 * Create a parallel (whole-text) translation agent
 */
export function createParallelTranslationAgent(sourceLanguage: string, targetLanguage: string): Agent {
  const config = getModelForTask('translation');

  return new Agent({
    id: 'parallel-translator',
    name: 'Parallel Text Translation Agent',
    model: config.model,
    instructions: `You are a language learning assistant specializing in ${sourceLanguage} to ${targetLanguage} translation.
You will receive a numbered list of sentences. For each sentence return:
- translation: a natural, fluent ${targetLanguage} translation
- literalTranslation: an almost word-for-word translation keeping the source word order as closely as possible, helping learners see exactly how each word maps

Always respond with valid JSON. Return one entry per sentence in the same order.`
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
  'full-analysis': createFullAnalysisAgent
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
