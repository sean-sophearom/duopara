import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { asyncHandler } from '../lib/routeUtils.js';
import { getOrGenerateGameData } from '../lib/gameData.js';
import { calculateNextReview } from '../lib/spacedRepetition.js';
import { GAME_TYPES, VOCAB_STATUSES, STREAK_TO_LEARNED, STREAK_TO_MASTERED, ALLOWED_LANGUAGES, MAX_WORD_LENGTH } from '../lib/constants.js';

function validLanguage() {
  return z.string().min(1).max(50).refine(
    (val) => ALLOWED_LANGUAGES.has(val.toLowerCase()),
    { message: 'Unsupported language' }
  );
}

const gameDataLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many game data requests, please slow down' }
});

export const practiceRouter = Router();
practiceRouter.use(authenticate);

// ============================================
// Schemas
// ============================================

const getWordsSchema = z.object({
  language: z.string().min(1),
  statuses: z.array(z.enum(VOCAB_STATUSES)).min(1),
  limit: z.number().min(1).max(50).default(10),
  prioritizeSpacedRepetition: z.boolean().default(true)
});

const startSessionSchema = z.object({
  gameType: z.enum(GAME_TYPES),
  sourceLanguage: validLanguage(),
  targetLanguage: validLanguage(),
  wordIds: z.array(z.string()).min(1),
  config: z.object({
    optionCount: z.number().min(2).max(8).optional(),
    pairCount: z.number().min(3).max(5).optional()
  }).optional()
});

const gameDataSchema = z.object({
  word: z.string().min(1).max(MAX_WORD_LENGTH),
  sourceLanguage: validLanguage(),
  targetLanguage: validLanguage(),
  translation: z.string().max(MAX_WORD_LENGTH).optional().default(''),
});

const batchGameDataSchema = z.object({
  words: z.array(z.object({
    word: z.string().min(1).max(MAX_WORD_LENGTH),
    translation: z.string().max(MAX_WORD_LENGTH).optional().default(''),
  })).min(1).max(50),
  sourceLanguage: validLanguage(),
  targetLanguage: validLanguage(),
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
// Routes
// ============================================

/**
 * Get vocabulary words for practice
 * Prioritizes words due for spaced repetition review
 */
practiceRouter.post('/words', asyncHandler(async (req, res) => {
  const data = getWordsSchema.parse(req.body);
  
  const baseWhere = {
    userId: req.userId!,
    language: data.language,
    status: { in: data.statuses },
    translation: { not: null } // Only words with translations
  };
  
  let words;
  
  if (data.prioritizeSpacedRepetition) {
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
        { difficultyScore: 'asc' }
      ],
      take: data.limit
    });
    
    if (dueWords.length < data.limit) {
      const dueWordIds = dueWords.map(w => w.id);
      const additionalWords = await prisma.vocabularyWord.findMany({
        where: { ...baseWhere, id: { notIn: dueWordIds } },
        orderBy: { updatedAt: 'desc' },
        take: data.limit - dueWords.length
      });
      words = [...dueWords, ...additionalWords];
    } else {
      words = dueWords;
    }
  } else {
    words = await prisma.vocabularyWord.findMany({
      where: baseWhere,
      orderBy: { updatedAt: 'desc' },
      take: data.limit
    });
  }
  
  res.json({ words });
}, 'Failed to get practice words'));

/**
 * Get game data for a word (cached or generate new)
 */
practiceRouter.post('/game-data', asyncHandler(async (req, res) => {
  const data = gameDataSchema.parse(req.body);
  const result = await getOrGenerateGameData(data.word, data.sourceLanguage, data.targetLanguage, data.translation);
  res.json(result);
}, 'Failed to get game data'));

/**
 * Batch get game data for multiple words
 */
practiceRouter.post('/game-data/batch', gameDataLimiter, asyncHandler(async (req, res) => {
  const data = batchGameDataSchema.parse(req.body);

  const entries = await Promise.allSettled(
    data.words.map(item =>
      getOrGenerateGameData(item.word, data.sourceLanguage, data.targetLanguage, item.translation)
        .then(result => ({ word: item.word, result }))
    )
  );

  const results: Record<string, any> = {};
  for (const entry of entries) {
    if (entry.status === 'fulfilled') {
      results[entry.value.word] = entry.value.result;
    } else {
      console.error('Failed to generate game data:', entry.reason);
    }
  }

  res.json({ results });
}, 'Failed to get game data'));

/**
 * Start a new practice session
 */
practiceRouter.post('/session/start', asyncHandler(async (req, res) => {
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
}, 'Failed to start session'));

/**
 * Submit a practice attempt
 */
practiceRouter.post('/attempt', asyncHandler(async (req, res) => {
  const data = submitAttemptSchema.parse(req.body);
  
  // Verify session and vocabulary word belong to the authenticated user
  const [session, vocabWord] = await Promise.all([
    prisma.practiceSession.findFirst({ where: { id: data.sessionId, userId: req.userId! } }),
    prisma.vocabularyWord.findFirst({ where: { id: data.vocabularyWordId, userId: req.userId! } })
  ]);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  if (!vocabWord) return res.status(404).json({ error: 'Vocabulary word not found' });

  const [attempt] = await Promise.all([
    prisma.practiceAttempt.create({
      data: {
        sessionId: data.sessionId,
        vocabularyWordId: data.vocabularyWordId,
        isCorrect: data.isCorrect,
        responseTimeMs: data.responseTimeMs,
        questionData: JSON.stringify(data.questionData),
        userAnswer: data.userAnswer,
        correctAnswer: data.correctAnswer
      }
    }),
    prisma.practiceSession.update({
      where: { id: data.sessionId },
      data: data.isCorrect 
        ? { correctCount: { increment: 1 } }
        : { incorrectCount: { increment: 1 } }
    })
  ]);
  
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
        status: streak >= STREAK_TO_LEARNED && vocabWord.status === 'learning' 
          ? 'learned' 
          : streak >= STREAK_TO_MASTERED && vocabWord.status === 'learned'
            ? 'mastered'
            : undefined
      }
    });
  }
  
  res.json({ attempt });
}, 'Failed to submit attempt'));

/**
 * Complete a practice session
 */
practiceRouter.post('/session/complete', asyncHandler(async (req, res) => {
  const { sessionId } = completeSessionSchema.parse(req.body);
  
  // Verify session belongs to the authenticated user
  const existing = await prisma.practiceSession.findFirst({ where: { id: sessionId, userId: req.userId! } });
  if (!existing) return res.status(404).json({ error: 'Session not found' });

  const session = await prisma.practiceSession.update({
    where: { id: sessionId },
    data: { completedAt: new Date() },
    include: { attempts: true }
  });
  
  const accuracy = session.totalWords > 0 
    ? Math.round((session.correctCount / session.totalWords) * 100) 
    : 0;
  
  const totalTimeMs = session.attempts.reduce(
    (sum, a) => sum + (a.responseTimeMs || 0), 0
  );
  const avgTimeMs = session.attempts.length > 0
    ? Math.round(totalTimeMs / session.attempts.length) : 0;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  await prisma.dailyActivity.upsert({
    where: { userId_date: { userId: req.userId!, date: today } },
    create: { userId: req.userId!, date: today, wordsLearned: session.correctCount },
    update: { wordsLearned: { increment: session.correctCount } }
  });
  
  res.json({
    session,
    stats: { accuracy, totalTimeMs, avgTimeMs, correctCount: session.correctCount, incorrectCount: session.incorrectCount }
  });
}, 'Failed to complete session'));

/**
 * Get practice history/stats
 */
practiceRouter.get('/stats', asyncHandler(async (req, res) => {
  const { language, days } = req.query;
  const parsed = days ? parseInt(days as string) : 30;
  const daysNum = Number.isNaN(parsed) ? 30 : Math.min(Math.max(parsed, 1), 365);
  
  const since = new Date();
  since.setDate(since.getDate() - daysNum);
  
  const where: any = {
    userId: req.userId!,
    completedAt: { not: null, gte: since }
  };
  if (language) where.sourceLanguage = language;
  
  const sessions = await prisma.practiceSession.findMany({
    where, orderBy: { completedAt: 'desc' }, take: 50
  });
  
  const totalSessions = sessions.length;
  const totalCorrect = sessions.reduce((sum, s) => sum + s.correctCount, 0);
  const totalIncorrect = sessions.reduce((sum, s) => sum + s.incorrectCount, 0);
  const totalWords = totalCorrect + totalIncorrect;
  const overallAccuracy = totalWords > 0 
    ? Math.round((totalCorrect / totalWords) * 100) : 0;
  
  const byGameType: Record<string, { sessions: number; correct: number; total: number }> = {};
  for (const session of sessions) {
    if (!byGameType[session.gameType]) {
      byGameType[session.gameType] = { sessions: 0, correct: 0, total: 0 };
    }
    byGameType[session.gameType].sessions += 1;
    byGameType[session.gameType].correct += session.correctCount;
    byGameType[session.gameType].total += session.correctCount + session.incorrectCount;
  }
  
  res.json({ totalSessions, totalWords, overallAccuracy, byGameType, recentSessions: sessions.slice(0, 10) });
}, 'Failed to get practice stats'));

/**
 * Get words needing review (due for spaced repetition)
 */
practiceRouter.get('/due', asyncHandler(async (req, res) => {
  const { language } = req.query;
  
  const where: any = {
    userId: req.userId!,
    translation: { not: null },
    OR: [
      { nextPracticeAt: { lte: new Date() } },
      { nextPracticeAt: null, lastPracticedAt: { not: null } }
    ]
  };
  if (language) where.language = language;
  
  const dueCount = await prisma.vocabularyWord.count({ where });
  res.json({ dueCount });
}, 'Failed to get due words count'));
