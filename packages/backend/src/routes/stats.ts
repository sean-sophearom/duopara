import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { asyncHandler } from '../lib/routeUtils.js';

export const statsRouter = Router();
statsRouter.use(authenticate);

// Get comprehensive user stats
statsRouter.get('/', asyncHandler(async (req: AuthRequest, res) => {
  const { language } = req.query;
  
  const vocabWhere: any = { userId: req.userId };
  const textWhere: any = { userId: req.userId };
  if (language) {
    vocabWhere.language = language;
    textWhere.language = language;
  }

    // Vocabulary statistics
    const [totalWords, learnedWords, masteredWords, learningWords] = await Promise.all([
      prisma.vocabularyWord.count({ where: vocabWhere }),
      prisma.vocabularyWord.count({ where: { ...vocabWhere, status: 'learned' } }),
      prisma.vocabularyWord.count({ where: { ...vocabWhere, status: 'mastered' } }),
      prisma.vocabularyWord.count({ where: { ...vocabWhere, status: 'learning' } })
    ]);

    // Reading statistics
    const [totalTexts, totalSessions, completedSessions] = await Promise.all([
      prisma.generatedText.count({ where: textWhere }),
      prisma.readingSession.count({ where: { userId: req.userId } }),
      prisma.readingSession.count({ 
        where: { userId: req.userId, completedAt: { not: null } } 
      })
    ]);

    // Words encountered from reading sessions
    const sessions = await prisma.readingSession.findMany({
      where: { userId: req.userId },
      select: { wordsLookedUp: true, wordsMarkedLearned: true }
    });

    let totalWordsLookedUp = 0;
    let totalWordsMarkedLearned = 0;
    
    for (const session of sessions) {
      totalWordsLookedUp += JSON.parse(session.wordsLookedUp).length;
      totalWordsMarkedLearned += JSON.parse(session.wordsMarkedLearned).length;
    }

    // Calculate reading streak
    const streak = await calculateStreak(req.userId!);

    // Recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentTexts = await prisma.generatedText.count({
      where: {
        userId: req.userId,
        createdAt: { gte: thirtyDaysAgo }
      }
    });

    const recentWordsMastered = await prisma.vocabularyWord.count({
      where: {
        userId: req.userId,
        status: 'mastered',
        masteredAt: { gte: thirtyDaysAgo }
      }
    });

    res.json({
      vocabulary: {
        total: totalWords,
        learning: learningWords,
        learned: learnedWords,
        mastered: masteredWords,
        knownPercentage: totalWords > 0 
          ? Math.round(((learnedWords + masteredWords) / totalWords) * 100) 
          : 0
      },
      reading: {
        totalTexts,
        totalSessions,
        completedSessions,
        completionRate: totalSessions > 0 
          ? Math.round((completedSessions / totalSessions) * 100) 
          : 0
      },
      activity: {
        wordsLookedUp: totalWordsLookedUp,
        wordsMarkedLearned: totalWordsMarkedLearned,
        currentStreak: streak.current,
        longestStreak: streak.longest,
        recentTexts,
        recentWordsMastered
      }
    });
}, 'Failed to get stats'));

// Get activity heatmap data (last 365 days)
statsRouter.get('/heatmap', asyncHandler(async (req: AuthRequest, res) => {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    // Get all reading sessions and texts in parallel
    const [sessions, texts] = await Promise.all([
      prisma.readingSession.findMany({
        where: {
          userId: req.userId,
          startedAt: { gte: oneYearAgo }
        },
        select: { startedAt: true }
      }),
      prisma.generatedText.findMany({
        where: {
          userId: req.userId,
          createdAt: { gte: oneYearAgo }
        },
        select: { createdAt: true }
      })
    ]);

    // Aggregate by date
    const activityByDate: Record<string, number> = {};
    
    for (const session of sessions) {
      const date = session.startedAt.toISOString().split('T')[0];
      activityByDate[date] = (activityByDate[date] || 0) + 1;
    }
    
    for (const text of texts) {
      const date = text.createdAt.toISOString().split('T')[0];
      activityByDate[date] = (activityByDate[date] || 0) + 1;
    }

    res.json({ activityByDate });
}, 'Failed to get heatmap'));

// Get words learned over time
statsRouter.get('/progress', asyncHandler(async (req: AuthRequest, res) => {
  const { days = '30' } = req.query;
    const parsed = parseInt(days as string);
    const daysNum = Number.isNaN(parsed) ? 30 : Math.min(Math.max(parsed, 1), 365);
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);

    // Get vocabulary changes over time
    const words = await prisma.vocabularyWord.findMany({
      where: {
        userId: req.userId,
        createdAt: { gte: startDate }
      },
      select: {
        createdAt: true,
        status: true,
        masteredAt: true
      },
      orderBy: { createdAt: 'asc' }
    });

    // Aggregate by date
    const progressByDate: Record<string, { added: number; mastered: number }> = {};
    
    for (const word of words) {
      const date = word.createdAt.toISOString().split('T')[0];
      if (!progressByDate[date]) {
        progressByDate[date] = { added: 0, mastered: 0 };
      }
      progressByDate[date].added++;
      
      if (word.masteredAt) {
        const masteredDate = word.masteredAt.toISOString().split('T')[0];
        if (!progressByDate[masteredDate]) {
          progressByDate[masteredDate] = { added: 0, mastered: 0 };
        }
        progressByDate[masteredDate].mastered++;
      }
    }

    // Convert to array and fill gaps
    const result = [];
    const current = new Date(startDate);
    const end = new Date();
    
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      result.push({
        date: dateStr,
        added: progressByDate[dateStr]?.added || 0,
        mastered: progressByDate[dateStr]?.mastered || 0
      });
      current.setDate(current.getDate() + 1);
    }

    res.json({ progress: result });
}, 'Failed to get progress'));

// Helper function to calculate streak
async function calculateStreak(userId: string): Promise<{ current: number; longest: number }> {
  // Get all dates with activity in parallel
  const [sessions, texts] = await Promise.all([
    prisma.readingSession.findMany({
      where: { userId },
      select: { startedAt: true },
      orderBy: { startedAt: 'desc' }
    }),
    prisma.generatedText.findMany({
      where: { userId },
      select: { createdAt: true },
      orderBy: { createdAt: 'desc' }
    })
  ]);

  // Get unique dates
  const activeDates = new Set<string>();
  
  for (const s of sessions) {
    activeDates.add(s.startedAt.toISOString().split('T')[0]);
  }
  for (const t of texts) {
    activeDates.add(t.createdAt.toISOString().split('T')[0]);
  }

  const sortedDates = [...activeDates].sort().reverse();
  
  if (sortedDates.length === 0) {
    return { current: 0, longest: 0 };
  }

  // Calculate current streak
  let currentStreak = 0;
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  // Check if the streak is still active (today or yesterday)
  if (sortedDates[0] === today || sortedDates[0] === yesterday) {
    currentStreak = 1;
    
    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = new Date(sortedDates[i - 1]);
      const currDate = new Date(sortedDates[i]);
      const diffDays = (prevDate.getTime() - currDate.getTime()) / 86400000;
      
      if (diffDays === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  // Calculate longest streak
  let longestStreak = 1;
  let tempStreak = 1;
  
  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = new Date(sortedDates[i - 1]);
    const currDate = new Date(sortedDates[i]);
    const diffDays = (prevDate.getTime() - currDate.getTime()) / 86400000;
    
    if (diffDays === 1) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 1;
    }
  }

  return { current: currentStreak, longest: Math.max(longestStreak, currentStreak) };
}
