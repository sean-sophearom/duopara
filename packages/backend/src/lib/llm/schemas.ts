/**
 * Output Schemas for LLM responses
 * 
 * These Zod schemas define the expected structure of LLM outputs.
 * Using structuredOutput with these schemas ensures the model
 * returns valid, typed JSON every time.
 */

import { z } from 'zod';

// ============================================
// Text Generation Schemas
// ============================================

export const generatedTextSchema = z.object({
  title: z.string().describe('Title of the generated text in the target language'),
  content: z.string().describe('The main content/story in the target language')
});

export type GeneratedText = z.infer<typeof generatedTextSchema>;

// ============================================
// Translation Schemas
// ============================================

export const wordTranslationSchema = z.object({
  translation: z.string().describe('Primary translation of the word'),
  alternativeTranslations: z.array(z.string()).describe('Other possible meanings'),
  contextualMeaning: z.string().optional().describe('Explanation of why this translation fits the context')
});

export type WordTranslation = z.infer<typeof wordTranslationSchema>;

export const sentenceTranslationSchema = z.object({
  translation: z.string().describe('Translation of the sentence'),
  grammarNotes: z.array(z.object({
    element: z.string().describe('The grammatical element being explained'),
    explanation: z.string().describe('Explanation of the grammar point')
  })).optional().describe('Key grammar points in the sentence'),
  literalTranslation: z.string().optional().describe('Word-by-word literal translation')
});

export type SentenceTranslation = z.infer<typeof sentenceTranslationSchema>;

// ============================================
// Grammar Analysis Schemas
// ============================================

export const grammarAnalysisSchema = z.object({
  partOfSpeech: z.string().describe('Grammatical category: noun, verb, adjective, etc.'),
  baseForm: z.string().nullable().describe('Infinitive for verbs, singular for nouns, or null if already base form'),
  gender: z.string().nullable().describe('Grammatical gender for nouns, or null'),
  conjugation: z.object({
    tense: z.string().optional(),
    person: z.string().optional(),
    mood: z.string().optional()
  }).nullable().describe('Conjugation details for verbs, or null'),
  number: z.string().nullable().describe('Singular or plural, or null'),
  additionalInfo: z.string().optional().describe('Any other relevant grammatical information')
});

export type GrammarAnalysis = z.infer<typeof grammarAnalysisSchema>;

// ============================================
// Full Analysis Schema (Translation + Grammar)
// ============================================

export const fullAnalysisSchema = z.object({
  translation: z.string().describe('Primary translation'),
  alternativeTranslations: z.array(z.string()).describe('Other possible meanings'),
  partOfSpeech: z.string().describe('Grammatical category'),
  baseForm: z.string().nullable().describe('Base/dictionary form, or null'),
  gender: z.string().nullable().describe('Grammatical gender, or null'),
  conjugation: z.object({
    tense: z.string().optional(),
    person: z.string().optional(),
    mood: z.string().optional()
  }).nullable().describe('Conjugation details, or null'),
  contextualNote: z.string().optional().describe('Explanation of usage in context')
});

export type FullAnalysis = z.infer<typeof fullAnalysisSchema>;

// ============================================
// Parallel (whole-text) Translation Schema
// ============================================

export const parallelTextTranslationSchema = z.object({
  sentences: z.array(z.object({
    translation: z.string().describe('Natural, fluent translation of the sentence'),
    literalTranslation: z.string().describe(
      'Word-by-word literal translation keeping as close to source word order as possible'
    )
  })).describe('One entry per sentence, in the same order as the input')
});

export type ParallelTextTranslation = z.infer<typeof parallelTextTranslationSchema>;

// ============================================
// Practice Game Data Schemas
// ============================================

export const gameWordDataSchema = z.object({
  definition: z.string().describe('A clear, concise definition of the word in the target language (1-2 sentences)'),
  distractorDefinitions: z.array(z.string()).length(5).describe(
    '5 plausible but incorrect definitions that could confuse learners'
  ),
  distractorTranslations: z.array(z.string()).length(5).describe(
    '5 plausible but incorrect translations of the word'
  ),
  exampleSentences: z.array(z.object({
    sentence: z.string().describe('A sentence with the target word replaced by "___"'),
    blankWord: z.string().describe('The word that fills the blank'),
    fullSentence: z.string().describe('The complete sentence with the word')
  })).min(3).max(3).describe('3 example sentences with the word, shown as fill-in-the-blank'),
  falseTranslation: z.string().describe(
    'A plausible but incorrect translation for true/false game (should be semantically close but wrong)'
  )
});

export type GameWordData = z.infer<typeof gameWordDataSchema>;
