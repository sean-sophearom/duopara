import { Router } from 'express';
import { createHash } from 'crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { asyncHandler } from '../lib/routeUtils.js';
import { 
  createWordTranslationAgent, 
  createSentenceTranslationAgent, 
  createGrammarAnalysisAgent,
  createFullAnalysisAgent,
  getModelForTask,
  wordTranslationSchema,
  sentenceTranslationSchema,
  grammarAnalysisSchema,
  fullAnalysisSchema
} from '../lib/llm/index.js';
import {
  wordTranslationPrompt,
  sentenceTranslationPrompt,
  grammarAnalysisPrompt,
  fullAnalysisPrompt,
} from '../lib/llm/prompts.js';
import { ALLOWED_LANGUAGES, MAX_WORD_LENGTH, MAX_SENTENCE_LENGTH, MAX_CONTEXT_LENGTH } from '../lib/constants.js';

function validLanguage() {
  return z.string().min(1).max(50).refine(
    (val) => ALLOWED_LANGUAGES.has(val.toLowerCase()),
    { message: 'Unsupported language' }
  );
}

const makeCacheKey = (fields: Record<string, unknown>): string =>
  createHash('sha256').update(JSON.stringify(fields)).digest('hex');

export const translateRouter = Router();
translateRouter.use(authenticate);

const translateWordSchema = z.object({
  word: z.string().min(1).max(MAX_WORD_LENGTH),
  sourceLanguage: validLanguage(),
  targetLanguage: validLanguage(),
  context: z.string().max(MAX_CONTEXT_LENGTH).optional()
});

const translateSentenceSchema = z.object({
  sentence: z.string().min(1).max(MAX_SENTENCE_LENGTH),
  sourceLanguage: validLanguage(),
  targetLanguage: validLanguage(),
  includeGrammarHints: z.boolean().default(true)
});

const analyzeWordSchema = z.object({
  word: z.string().min(1).max(MAX_WORD_LENGTH),
  language: validLanguage(),
  context: z.string().max(MAX_CONTEXT_LENGTH).optional()
});

// Translate a single word with context
translateRouter.post('/word', asyncHandler(async (req: AuthRequest, res) => {
  const { word, sourceLanguage, targetLanguage, context } = translateWordSchema.parse(req.body);
    
    const prompt = wordTranslationPrompt(word, sourceLanguage, targetLanguage, context);

    // Use Mastra agent with structured output for guaranteed valid JSON
    const agent = createWordTranslationAgent(sourceLanguage, targetLanguage);
    const config = getModelForTask('translation');
    
    const completion = await agent.generate(prompt, {
      modelSettings: {
        temperature: config.temperature ?? 0.3,
        maxOutputTokens: config.maxOutputTokens ?? 300
      },
      structuredOutput: {
        schema: wordTranslationSchema
      }
    });

    const result = completion.object ?? { translation: '', alternativeTranslations: [] };

    // Update the word in user's vocabulary if it exists
    await prisma.vocabularyWord.updateMany({
      where: {
        userId: req.userId,
        word: word.toLowerCase(),
        language: sourceLanguage
      },
      data: {
        translation: result.translation,
        timesEncountered: { increment: 1 }
      }
    });

    res.json(result);
}, 'Translation failed'));

// Translate a sentence with grammar hints
translateRouter.post('/sentence', asyncHandler(async (req: AuthRequest, res) => {
  const { sentence, sourceLanguage, targetLanguage, includeGrammarHints } = translateSentenceSchema.parse(req.body);

    // Cache lookup
    const cacheKey = makeCacheKey({ sentence, sourceLanguage, targetLanguage, includeGrammarHints });
    const cached = await prisma.translationCache.findUnique({
      where: { endpoint_cacheKey: { endpoint: 'sentence', cacheKey } }
    });
    if (cached) {
      const parsed = sentenceTranslationSchema.parse(JSON.parse(cached.response));
      return res.json(parsed);
    }

    const prompt = sentenceTranslationPrompt(sentence, sourceLanguage, targetLanguage, includeGrammarHints);

    // Use Mastra agent with structured output for guaranteed valid JSON
    const agent = createSentenceTranslationAgent(sourceLanguage, targetLanguage);
    const config = getModelForTask('translation');
    
    const completion = await agent.generate(prompt, {
      modelSettings: {
        temperature: config.temperature ?? 0.3,
        maxOutputTokens: 600
      },
      structuredOutput: {
        schema: sentenceTranslationSchema
      }
    });

    const result = completion.object ?? { translation: '', grammarNotes: [] };

    // Store in cache
    await prisma.translationCache.create({
      data: { endpoint: 'sentence', cacheKey, response: JSON.stringify(result) }
    });

    res.json(result);
}, 'Translation failed'));

// Analyze a word (part of speech, base form, etc.)
translateRouter.post('/analyze', asyncHandler(async (req: AuthRequest, res) => {
  const { word, language, context } = analyzeWordSchema.parse(req.body);
    
    const prompt = grammarAnalysisPrompt(word, language, context);

    // Use Mastra agent with structured output for guaranteed valid JSON
    const agent = createGrammarAnalysisAgent(language);
    const config = getModelForTask('grammar-analysis');
    
    const completion = await agent.generate(prompt, {
      modelSettings: {
        temperature: config.temperature ?? 0.2,
        maxOutputTokens: config.maxOutputTokens ?? 300
      },
      structuredOutput: {
        schema: grammarAnalysisSchema
      }
    });

    const result = completion.object ?? { partOfSpeech: 'unknown', baseForm: null, gender: null, conjugation: null, number: null };

    // Update the word in vocabulary with this information
    if (result.partOfSpeech || result.baseForm) {
      await prisma.vocabularyWord.updateMany({
        where: {
          userId: req.userId,
          word: word.toLowerCase(),
          language
        },
        data: {
          partOfSpeech: result.partOfSpeech || undefined,
          baseForm: result.baseForm || undefined
        }
      });
    }

    res.json(result);
}, 'Analysis failed'));

// Combined translate + analyze for efficiency
translateRouter.post('/full', asyncHandler(async (req: AuthRequest, res) => {
  const schema = z.object({
      word: z.string().min(1).max(MAX_WORD_LENGTH),
      sourceLanguage: validLanguage(),
      targetLanguage: validLanguage(),
      context: z.string().max(MAX_CONTEXT_LENGTH).optional()
    });
    
    const { word, sourceLanguage, targetLanguage, context } = schema.parse(req.body);

    // Cache lookup
    const cacheKey = makeCacheKey({ word, sourceLanguage, targetLanguage, context: context ?? null });
    const cached = await prisma.translationCache.findUnique({
      where: { endpoint_cacheKey: { endpoint: 'full', cacheKey } }
    });
    if (cached) {
      const parsed = fullAnalysisSchema.parse(JSON.parse(cached.response));
      return res.json(parsed);
    }
    
    const prompt = fullAnalysisPrompt(word, sourceLanguage, targetLanguage, context);

    // Use Mastra agent with structured output for guaranteed valid JSON
    const agent = createFullAnalysisAgent(sourceLanguage, targetLanguage);
    const config = getModelForTask('translation');
    
    const completion = await agent.generate(prompt, {
      modelSettings: {
        temperature: config.temperature ?? 0.3,
        maxOutputTokens: 400
      },
      structuredOutput: {
        schema: fullAnalysisSchema
      }
    });

    const result = completion.object ?? { translation: '', alternativeTranslations: [], partOfSpeech: 'unknown', baseForm: null, gender: null, conjugation: null };

    // Cache + vocabulary update in parallel
    await Promise.all([
      prisma.translationCache.create({
        data: { endpoint: 'full', cacheKey, response: JSON.stringify(result) }
      }),
      prisma.vocabularyWord.upsert({
        where: {
          userId_word_language: {
            userId: req.userId!,
            word: word.toLowerCase(),
            language: sourceLanguage
          }
        },
        create: {
          userId: req.userId!,
          word: word.toLowerCase(),
          language: sourceLanguage,
          translation: result.translation,
          partOfSpeech: result.partOfSpeech,
          baseForm: result.baseForm,
          status: 'learning'
        },
        update: {
          translation: result.translation,
          partOfSpeech: result.partOfSpeech || undefined,
          baseForm: result.baseForm || undefined,
          timesEncountered: { increment: 1 }
        }
      })
    ]);

    res.json(result);
}, 'Translation failed'));
