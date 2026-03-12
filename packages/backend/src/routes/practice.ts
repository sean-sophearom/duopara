import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { createGameDataAgent, gameWordDataSchema } from '../lib/llm/index.js';

export const practiceRouter = Router();
practiceRouter.use(authenticate);

// ============================================
// Types
// ============================================

const GameTypes = ['definition', 'translation', 'reverse', 'fillblank', 'matching', 'truefalse'] as const;
type GameType = typeof GameTypes[number];

// ============================================
// Schemas
// ============================================

const getWordsSchema = z.object({
  language: z.string().min(1),
  statuses: z.array(z.enum(['learning', 'learned', 'mastered'])).min(1),
  limit: z.number().min(1).max(50).default(10),
  prioritizeSpacedRepetition: z.boolean().default(true)
});

const startSessionSchema = z.object({
  gameType: z.enum(GameTypes),
  sourceLanguage: z.string().min(1),
  targetLanguage: z.string().min(1),
  wordIds: z.array(z.string()).min(1),
  config: z.object({
    optionCount: z.number().min(2).max(8).optional(),
    pairCount: z.number().min(3).max(5).optional()
  }).optional()
});

const submitAttemptSchema = z.object({
  sessionId: z.string(),
  vocabularyWordId: z.string(),
  isCorrect: z.boolean(),
  responseTimeMs: z.number().optional(),
  questionData: z.any(),
  userAnswer: z.string(),
  correctAnswer: z.string()
});

const completeSessionSchema = z.object({
  sessionId: z.string()
});

// ============================================
// Spaced Repetition (SM-2 Algorithm)
// ============================================

function calculateNextReview(
  currentDifficulty: number,
  streak: number,
  isCorrect: boolean
): { nextPracticeAt: Date; difficultyScore: number; streak: number } {
  let newDifficulty = currentDifficulty;
  let newStreak = streak;
  
  if (isCorrect) {
    newStreak += 1;
    // Increase easiness for correct answers
    newDifficulty = Math.min(5.0, currentDifficulty + 0.1);
  } else {
    newStreak = 0;
    // Decrease easiness for wrong answers
    newDifficulty = Math.max(1.3, currentDifficulty - 0.3);
  }
  
  // Calculate interval based on streak and difficulty
  let intervalDays: number;
  if (newStreak === 0) {
    intervalDays = 0; // Review immediately/today
  } else if (newStreak === 1) {
    intervalDays = 1;
  } else if (newStreak === 2) {
    intervalDays = 3;
  } else {
    // For streak >= 3, use SM-2 formula with cap
    const previousInterval = Math.pow(newDifficulty, newStreak - 2) * 3;
    intervalDays = Math.min(365, Math.round(previousInterval * newDifficulty)); // Cap at 1 year
  }
  
  const nextPracticeAt = new Date();
  nextPracticeAt.setDate(nextPracticeAt.getDate() + intervalDays);
  
  return {
    nextPracticeAt,
    difficultyScore: newDifficulty,
    streak: newStreak
  };
}

// ============================================
// Routes
// ============================================

/**
 * Get vocabulary words for practice
 * Prioritizes words due for spaced repetition review
 */
practiceRouter.post('/words', async (req: AuthRequest, res) => {
  try {
    const data = getWordsSchema.parse(req.body);
    
    const baseWhere = {
      userId: req.userId!,
      language: data.language,
      status: { in: data.statuses },
      translation: { not: null } // Only words with translations
    };
    
    let words;
    
    if (data.prioritizeSpacedRepetition) {
      // First get words due for review (nextPracticeAt <= now or null)
      const dueWords = await prisma.vocabularyWord.findMany({
        where: {
          ...baseWhere,
          OR: [
            { nextPracticeAt: { lte: new Date() } },
            { nextPracticeAt: null }
          ]
        },
        orderBy: [
          { nextPracticeAt: 'asc' },
          { difficultyScore: 'asc' } // Harder words first
        ],
        take: data.limit
      });
      
      // If not enough due words, fill with random words
      if (dueWords.length < data.limit) {
        const remainingCount = data.limit - dueWords.length;
        const dueWordIds = dueWords.map(w => w.id);
        
        const additionalWords = await prisma.vocabularyWord.findMany({
          where: {
            ...baseWhere,
            id: { notIn: dueWordIds }
          },
          orderBy: { updatedAt: 'desc' },
          take: remainingCount
        });
        
        words = [...dueWords, ...additionalWords];
      } else {
        words = dueWords;
      }
    } else {
      // Random selection
      words = await prisma.vocabularyWord.findMany({
        where: baseWhere,
        orderBy: { updatedAt: 'desc' },
        take: data.limit
      });
    }
    
    res.json({ words });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Get practice words error:', error);
    res.status(500).json({ error: 'Failed to get practice words' });
  }
});

/**
 * Get game data for a word (cached or generate new)
 */
practiceRouter.post('/game-data', async (req: AuthRequest, res) => {
  try {
    const { word, sourceLanguage, targetLanguage, translation } = req.body;
    
    if (!word || !sourceLanguage || !targetLanguage) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check cache first
    let gameData = await prisma.gameWordData.findUnique({
      where: {
        word_sourceLanguage_targetLanguage: {
          word: word.toLowerCase(),
          sourceLanguage,
          targetLanguage
        }
      }
    });
    
    if (gameData) {
      // Return cached data
      return res.json({
        cached: true,
        data: {
          definition: gameData.definition,
          translation: gameData.translation,
          distractorDefinitions: JSON.parse(gameData.distractorDefinitions),
          distractorTranslations: JSON.parse(gameData.distractorTranslations),
          exampleSentences: JSON.parse(gameData.exampleSentences),
          falseTranslation: gameData.falseTranslation
        }
      });
    }
    
    // Generate new game data using LLM
    const agent = createGameDataAgent(sourceLanguage, targetLanguage);
    
    const prompt = `Generate practice game data for the following word:

Word: "${word}" (${sourceLanguage})
Hint translation: "${translation || 'unknown'}" (${targetLanguage})

Generate:
1. The correct translation in ${targetLanguage}
2. 5 plausible but incorrect definitions (distractors)
3. A very very short definition in ${targetLanguage} (should be similar in length to the distractors)
4. 5 plausible but incorrect translations (distractors)
5. 3 example sentences with the word blanked out (in ${sourceLanguage})
6. One false translation for true/false game

Return as JSON.`;

    const result = await agent.generate(prompt, {
      structuredOutput: {
        schema: gameWordDataSchema,
      }
    });
    
    const generatedData = result.object;
    
    // Cache the result
    gameData = await prisma.gameWordData.create({
      data: {
        word: word.toLowerCase(),
        sourceLanguage,
        targetLanguage,
        definition: generatedData.definition,
        translation: generatedData.translation,
        distractorDefinitions: JSON.stringify(generatedData.distractorDefinitions),
        distractorTranslations: JSON.stringify(generatedData.distractorTranslations),
        exampleSentences: JSON.stringify(generatedData.exampleSentences),
        falseTranslation: generatedData.falseTranslation
      }
    });
    
    res.json({
      cached: false,
      data: generatedData
    });
  } catch (error) {
    console.error('Get game data error:', error);
    res.status(500).json({ error: 'Failed to get game data' });
  }
});

/**
 * Batch get game data for multiple words
 */
practiceRouter.post('/game-data/batch', async (req: AuthRequest, res) => {
  try {
    const { words, sourceLanguage, targetLanguage } = req.body;
    
    if (!words || !Array.isArray(words) || !sourceLanguage || !targetLanguage) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const results: Record<string, any> = {};
    const toGenerate: Array<{ word: string; translation: string }> = [];
    
    // Check cache for all words
    for (const item of words) {
      const cached = await prisma.gameWordData.findUnique({
        where: {
          word_sourceLanguage_targetLanguage: {
            word: item.word.toLowerCase(),
            sourceLanguage,
            targetLanguage
          }
        }
      });
      
      if (cached) {
        results[item.word] = {
          cached: true,
          data: {
            definition: cached.definition,
            translation: cached.translation,
            distractorDefinitions: JSON.parse(cached.distractorDefinitions),
            distractorTranslations: JSON.parse(cached.distractorTranslations),
            exampleSentences: JSON.parse(cached.exampleSentences),
            falseTranslation: cached.falseTranslation
          }
        };
      } else {
        toGenerate.push(item);
      }
    }
    
    // Generate missing data (one at a time to avoid rate limits)
    for (const item of toGenerate) {
      try {
        const agent = createGameDataAgent(sourceLanguage, targetLanguage);
        
        const prompt = `Generate practice game data for the following word:

Word: "${item.word}" (${sourceLanguage})
Hint translation: "${item.translation || 'unknown'}" (${targetLanguage})

Generate:
1. The correct translation in ${targetLanguage}
2. 5 plausible but incorrect definitions (distractors)
3. A very very short definition in ${targetLanguage} (should be similar in length to the distractors)
4. 5 plausible but incorrect translations (distractors)
5. 3 example sentences with the word blanked out (in ${sourceLanguage})
6. One false translation for true/false game

Return as JSON.`;

        const result = await agent.generate(prompt, {
          structuredOutput: {
            schema: gameWordDataSchema,
          }
        });
        
        const generatedData = result.object;
        
        // Cache it
        await prisma.gameWordData.create({
          data: {
            word: item.word.toLowerCase(),
            sourceLanguage,
            targetLanguage,
            definition: generatedData.definition,
            translation: generatedData.translation,
            distractorDefinitions: JSON.stringify(generatedData.distractorDefinitions),
            distractorTranslations: JSON.stringify(generatedData.distractorTranslations),
            exampleSentences: JSON.stringify(generatedData.exampleSentences),
            falseTranslation: generatedData.falseTranslation
          }
        });
        
        results[item.word] = {
          cached: false,
          data: generatedData
        };
      } catch (genError) {
        console.error(`Failed to generate game data for ${item.word}:`, genError);
        results[item.word] = {
          error: 'Failed to generate'
        };
      }
    }
    
    res.json({ results });
  } catch (error) {
    console.error('Batch get game data error:', error);
    res.status(500).json({ error: 'Failed to get game data' });
  }
});

/**
 * Start a new practice session
 */
practiceRouter.post('/session/start', async (req: AuthRequest, res) => {
  try {
    const data = startSessionSchema.parse(req.body);
    
    const session = await prisma.practiceSession.create({
      data: {
        userId: req.userId!,
        gameType: data.gameType,
        sourceLanguage: data.sourceLanguage,
        targetLanguage: data.targetLanguage,
        totalWords: data.wordIds.length,
        config: JSON.stringify(data.config || {})
      }
    });
    
    res.json({ session });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Start session error:', error);
    res.status(500).json({ error: 'Failed to start session' });
  }
});

/**
 * Submit a practice attempt
 */
practiceRouter.post('/attempt', async (req: AuthRequest, res) => {
  try {
    const data = submitAttemptSchema.parse(req.body);
    
    // Create the attempt
    const attempt = await prisma.practiceAttempt.create({
      data: {
        sessionId: data.sessionId,
        vocabularyWordId: data.vocabularyWordId,
        isCorrect: data.isCorrect,
        responseTimeMs: data.responseTimeMs,
        questionData: JSON.stringify(data.questionData),
        userAnswer: data.userAnswer,
        correctAnswer: data.correctAnswer
      }
    });
    
    // Update session counts
    await prisma.practiceSession.update({
      where: { id: data.sessionId },
      data: data.isCorrect 
        ? { correctCount: { increment: 1 } }
        : { incorrectCount: { increment: 1 } }
    });
    
    // Update vocabulary word stats and spaced repetition
    const vocabWord = await prisma.vocabularyWord.findUnique({
      where: { id: data.vocabularyWordId }
    });
    
    if (vocabWord) {
      const { nextPracticeAt, difficultyScore, streak } = calculateNextReview(
        vocabWord.difficultyScore,
        vocabWord.practiceStreak,
        data.isCorrect
      );
      
      await prisma.vocabularyWord.update({
        where: { id: data.vocabularyWordId },
        data: {
          timesEncountered: { increment: 1 },
          timesCorrect: data.isCorrect ? { increment: 1 } : undefined,
          lastPracticedAt: new Date(),
          practiceStreak: streak,
          nextPracticeAt,
          difficultyScore,
          // Auto-promote if doing well
          status: streak >= 5 && vocabWord.status === 'learning' 
            ? 'learned' 
            : streak >= 10 && vocabWord.status === 'learned'
              ? 'mastered'
              : undefined
        }
      });
    }
    
    res.json({ attempt });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Submit attempt error:', error);
    res.status(500).json({ error: 'Failed to submit attempt' });
  }
});

/**
 * Complete a practice session
 */
practiceRouter.post('/session/complete', async (req: AuthRequest, res) => {
  try {
    const { sessionId } = completeSessionSchema.parse(req.body);
    
    const session = await prisma.practiceSession.update({
      where: { id: sessionId },
      data: { completedAt: new Date() },
      include: {
        attempts: true
      }
    });
    
    // Calculate stats
    const accuracy = session.totalWords > 0 
      ? Math.round((session.correctCount / session.totalWords) * 100) 
      : 0;
    
    const totalTimeMs = session.attempts.reduce(
      (sum, a) => sum + (a.responseTimeMs || 0), 
      0
    );
    
    const avgTimeMs = session.attempts.length > 0
      ? Math.round(totalTimeMs / session.attempts.length)
      : 0;
    
    // Update daily activity
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    await prisma.dailyActivity.upsert({
      where: {
        userId_date: {
          userId: req.userId!,
          date: today
        }
      },
      create: {
        userId: req.userId!,
        date: today,
        wordsLearned: session.correctCount
      },
      update: {
        wordsLearned: { increment: session.correctCount }
      }
    });
    
    res.json({
      session,
      stats: {
        accuracy,
        totalTimeMs,
        avgTimeMs,
        correctCount: session.correctCount,
        incorrectCount: session.incorrectCount
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Complete session error:', error);
    res.status(500).json({ error: 'Failed to complete session' });
  }
});

/**
 * Get practice history/stats
 */
practiceRouter.get('/stats', async (req: AuthRequest, res) => {
  try {
    const { language, days } = req.query;
    const daysNum = days ? parseInt(days as string) : 30;
    
    const since = new Date();
    since.setDate(since.getDate() - daysNum);
    
    const where: any = {
      userId: req.userId!,
      completedAt: { not: null, gte: since }
    };
    
    if (language) {
      where.sourceLanguage = language;
    }
    
    const sessions = await prisma.practiceSession.findMany({
      where,
      orderBy: { completedAt: 'desc' },
      take: 50
    });
    
    // Aggregate stats
    const totalSessions = sessions.length;
    const totalCorrect = sessions.reduce((sum, s) => sum + s.correctCount, 0);
    const totalIncorrect = sessions.reduce((sum, s) => sum + s.incorrectCount, 0);
    const totalWords = totalCorrect + totalIncorrect;
    const overallAccuracy = totalWords > 0 
      ? Math.round((totalCorrect / totalWords) * 100) 
      : 0;
    
    // Stats by game type
    const byGameType: Record<string, { sessions: number; correct: number; total: number }> = {};
    for (const session of sessions) {
      if (!byGameType[session.gameType]) {
        byGameType[session.gameType] = { sessions: 0, correct: 0, total: 0 };
      }
      byGameType[session.gameType].sessions += 1;
      byGameType[session.gameType].correct += session.correctCount;
      byGameType[session.gameType].total += session.correctCount + session.incorrectCount;
    }
    
    res.json({
      totalSessions,
      totalWords,
      overallAccuracy,
      byGameType,
      recentSessions: sessions.slice(0, 10)
    });
  } catch (error) {
    console.error('Get practice stats error:', error);
    res.status(500).json({ error: 'Failed to get practice stats' });
  }
});

/**
 * Get words needing review (due for spaced repetition)
 */
practiceRouter.get('/due', async (req: AuthRequest, res) => {
  try {
    const { language } = req.query;
    
    const where: any = {
      userId: req.userId!,
      translation: { not: null },
      OR: [
        { nextPracticeAt: { lte: new Date() } },
        { nextPracticeAt: null, lastPracticedAt: { not: null } }
      ]
    };
    
    if (language) {
      where.language = language;
    }
    
    const dueCount = await prisma.vocabularyWord.count({ where });
    
    res.json({ dueCount });
  } catch (error) {
    console.error('Get due words error:', error);
    res.status(500).json({ error: 'Failed to get due words count' });
  }
});
