import { Router } from 'express';
import { createHash } from 'crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
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

const makeCacheKey = (fields: Record<string, unknown>): string =>
  createHash('sha256').update(JSON.stringify(fields)).digest('hex');

export const translateRouter = Router();
translateRouter.use(authenticate);

const translateWordSchema = z.object({
  word: z.string().min(1),
  sourceLanguage: z.string().min(1),
  targetLanguage: z.string().min(1),
  context: z.string().optional() // The sentence containing the word
});

const translateSentenceSchema = z.object({
  sentence: z.string().min(1),
  sourceLanguage: z.string().min(1),
  targetLanguage: z.string().min(1),
  includeGrammarHints: z.boolean().default(true)
});

const analyzeWordSchema = z.object({
  word: z.string().min(1),
  language: z.string().min(1),
  context: z.string().optional()
});

// Translate a single word with context
translateRouter.post('/word', async (req: AuthRequest, res) => {
  try {
    const { word, sourceLanguage, targetLanguage, context } = translateWordSchema.parse(req.body);
    
    const prompt = context
      ? `Translate the word "${word}" from ${sourceLanguage} to ${targetLanguage}.
The word appears in this context: "${context}"
Provide the translation, alternative translations, and explain why this translation fits the context.`
      : `Translate the word "${word}" from ${sourceLanguage} to ${targetLanguage}.
Provide the primary translation and alternative meanings.`;

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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Translate word error:', error);
    res.status(500).json({ error: 'Translation failed' });
  }
});

// Translate a sentence with grammar hints
translateRouter.post('/sentence', async (req: AuthRequest, res) => {
  try {
    const { sentence, sourceLanguage, targetLanguage, includeGrammarHints } = translateSentenceSchema.parse(req.body);

    // Cache lookup
    const cacheKey = makeCacheKey({ sentence, sourceLanguage, targetLanguage, includeGrammarHints });
    const cached = await prisma.translationCache.findUnique({
      where: { endpoint_cacheKey: { endpoint: 'sentence', cacheKey } }
    });
    if (cached) {
      return res.json(JSON.parse(cached.response));
    }

    const prompt = includeGrammarHints
      ? `Translate this ${sourceLanguage} sentence to ${targetLanguage}:
"${sentence}"

Provide the translation, grammar notes explaining key grammar points (conjugations, tenses, structures), and a literal word-by-word translation.`
      : `Translate this ${sourceLanguage} sentence to ${targetLanguage}:
"${sentence}"`;

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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Translate sentence error:', error);
    res.status(500).json({ error: 'Translation failed' });
  }
});

// Analyze a word (part of speech, base form, etc.)
translateRouter.post('/analyze', async (req: AuthRequest, res) => {
  try {
    const { word, language, context } = analyzeWordSchema.parse(req.body);
    
    const prompt = `Analyze this ${language} word: "${word}"
${context ? `Context: "${context}"` : ''}

Provide grammatical analysis: part of speech, base form (infinitive for verbs, singular for nouns), gender if applicable, conjugation details for verbs, number (singular/plural), and any additional grammatical info.`;

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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Analyze word error:', error);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

// Combined translate + analyze for efficiency
translateRouter.post('/full', async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      word: z.string().min(1),
      sourceLanguage: z.string().min(1),
      targetLanguage: z.string().min(1),
      context: z.string().optional()
    });
    
    const { word, sourceLanguage, targetLanguage, context } = schema.parse(req.body);

    // Cache lookup
    const cacheKey = makeCacheKey({ word, sourceLanguage, targetLanguage, context: context ?? null });
    const cached = await prisma.translationCache.findUnique({
      where: { endpoint_cacheKey: { endpoint: 'full', cacheKey } }
    });
    if (cached) {
      return res.json(JSON.parse(cached.response));
    }
    
    const prompt = `For the ${sourceLanguage} word "${word}"${context ? ` in context: "${context}"` : ''}:

Provide ${targetLanguage} translation, alternative meanings, grammatical analysis (part of speech, base form, gender, conjugation for verbs), and a note on contextual usage.`;

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

    // Store in cache
    await prisma.translationCache.create({
      data: { endpoint: 'full', cacheKey, response: JSON.stringify(result) }
    });

    // Update vocabulary with all gathered information
    await prisma.vocabularyWord.upsert({
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
    });

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Full translate error:', error);
    res.status(500).json({ error: 'Translation failed' });
  }
});
