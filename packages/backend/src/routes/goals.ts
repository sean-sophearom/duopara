import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { asyncHandler } from '../lib/routeUtils.js';
import { createGoalSuggestionAgent } from '../lib/llm/index.js';
import { goalSuggestionsSchema, type GoalSuggestionItem } from '../lib/llm/index.js';

export const goalsRouter = Router();
goalsRouter.use(authenticate);

const suggestSchema = z.object({
  intent: z.string().min(1).max(500),
});

const saveGoalSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
  why: z.string().min(1).max(500),
  targetWords: z.number().int().min(1).max(200),
  estimatedMinutes: z.number().int().min(1).max(120),
  actionType: z.enum(['generate', 'existing', 'article']),
  actionData: z.record(z.unknown()),
});

const updateGoalSchema = z.object({
  status: z.enum(['active', 'completed', 'dismissed']),
});

const listGoalsSchema = z.object({
  status: z.enum(['active', 'completed', 'dismissed', 'all']).optional().default('active'),
});

const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const;
type Difficulty = typeof DIFFICULTIES[number];
type GoalActionType = 'generate' | 'existing' | 'article';
type GoalContentOption = {
  id: string;
  title: string;
  description: string;
  actionType: GoalActionType;
  estimatedMinutes: number;
  targetWords: number;
  topic?: string;
  difficulty?: string;
  textId?: string;
  textTitle?: string;
  source?: string;
  searchQuery?: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function inferDifficulty(knownCount: number, preferredDifficulty?: string): Difficulty {
  if (DIFFICULTIES.includes(preferredDifficulty as Difficulty)) {
    return preferredDifficulty as Difficulty;
  }
  if (knownCount < 200) return 'beginner';
  if (knownCount < 600) return 'intermediate';
  return 'advanced';
}

function targetWordRange(difficulty: Difficulty) {
  if (difficulty === 'beginner') return { min: 8, max: 15, fallback: 10 };
  if (difficulty === 'advanced') return { min: 15, max: 28, fallback: 20 };
  return { min: 12, max: 20, fallback: 15 };
}

function cleanText(value: unknown, fallback: string, maxLength = 240) {
  const text = typeof value === 'string' ? value.trim() : '';
  return (text || fallback).slice(0, maxLength);
}

function normalizeDifficulty(value: unknown, fallback: Difficulty): Difficulty {
  return DIFFICULTIES.includes(value as Difficulty) ? value as Difficulty : fallback;
}

function fallbackTopic(intent: string, language: string, weakWords: string[]) {
  const trimmedIntent = intent.trim();
  const weakWordHint = weakWords.length ? ` using ${weakWords.slice(0, 4).join(', ')}` : '';
  return trimmedIntent
    ? `${trimmedIntent} in everyday ${language}${weakWordHint}`
    : `A useful everyday ${language} reading session${weakWordHint}`;
}

function buildGeneratedGoal(
  intent: string,
  language: string,
  difficulty: Difficulty,
  weakWords: string[],
  angle = 'focused practice',
): GoalSuggestionItem {
  const range = targetWordRange(difficulty);
  const topic = fallbackTopic(intent, language, weakWords);
  return {
    title: angle === 'habit'
      ? 'Build a Reading Habit'
      : `Read About ${topic.split(' ').slice(0, 5).join(' ')}`,
    description: `Create a short ${difficulty} ${language} read about ${topic}.`,
    why: weakWords.length
      ? `This gives you a focused session while reusing words you are still learning.`
      : `This turns your goal into one clear reading session you can start now.`,
    targetWords: range.fallback,
    estimatedMinutes: difficulty === 'beginner' ? 8 : difficulty === 'advanced' ? 18 : 12,
    actionType: 'generate',
    topic,
    difficulty,
  };
}

function buildArticleGoal(intent: string, language: string, difficulty: Difficulty): GoalSuggestionItem {
  const range = targetWordRange(difficulty);
  const topic = intent.trim() || `${language} beginner reading`;
  return {
    title: 'Find a Real Article',
    description: `Find a short ${language} article connected to "${topic}" and read for the main idea first.`,
    why: `Real-world text helps you connect app practice with natural language usage.`,
    targetWords: range.fallback,
    estimatedMinutes: difficulty === 'beginner' ? 10 : 15,
    actionType: 'article',
    source: 'News or learning article',
    searchQuery: `${language} ${difficulty} article ${topic}`.trim(),
  };
}

function buildExistingGoal(
  text: { id: string; title: string; topic: string; difficulty: string },
  difficulty: Difficulty,
): GoalSuggestionItem {
  const range = targetWordRange(difficulty);
  return {
    title: `Revisit ${text.title}`.slice(0, 80),
    description: `Read "${text.title}" and focus on understanding the topic before translating details.`,
    why: `This uses a text already in your library, so you can make progress without creating anything new.`,
    targetWords: range.fallback,
    estimatedMinutes: text.difficulty === 'advanced' ? 18 : 12,
    actionType: 'existing',
    textId: text.id,
    textTitle: text.title,
  };
}

function suggestionToContentOption(suggestion: GoalSuggestionItem, index: number): GoalContentOption {
  const idBase = suggestion.textId || suggestion.topic || suggestion.searchQuery || suggestion.title;
  return {
    id: `${suggestion.actionType}-${index}-${idBase}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 80),
    title: suggestion.actionType === 'existing'
      ? cleanText(suggestion.textTitle, suggestion.title, 90)
      : suggestion.actionType === 'article'
        ? cleanText(suggestion.source, suggestion.title, 90)
        : cleanText(suggestion.topic, suggestion.title, 90),
    description: suggestion.description,
    actionType: suggestion.actionType,
    estimatedMinutes: suggestion.estimatedMinutes,
    targetWords: suggestion.targetWords,
    topic: suggestion.topic,
    difficulty: suggestion.difficulty,
    textId: suggestion.textId,
    textTitle: suggestion.textTitle,
    source: suggestion.source,
    searchQuery: suggestion.searchQuery,
  };
}

function buildContentOptions(params: {
  suggestion: GoalSuggestionItem;
  intent: string;
  language: string;
  difficulty: Difficulty;
  weakWords: string[];
  libraryTexts: { id: string; title: string; topic: string; difficulty: string }[];
}) {
  const { suggestion, intent, language, difficulty, weakWords, libraryTexts } = params;
  const options: GoalContentOption[] = [suggestionToContentOption(suggestion, 0)];
  const seen = new Set(options.map((option) => `${option.actionType}:${option.textId || option.topic || option.searchQuery}`));

  for (const text of libraryTexts) {
    if (options.length >= 3) break;
    const key = `existing:${text.id}`;
    if (seen.has(key)) continue;
    const existing = buildExistingGoal(text, difficulty);
    options.push(suggestionToContentOption(existing, options.length));
    seen.add(key);
  }

  const generatedAngles = [
    { label: 'Short story', topic: `${intent.trim() || fallbackTopic(intent, language, weakWords)} as a short story` },
    { label: 'Dialogue practice', topic: `${intent.trim() || fallbackTopic(intent, language, weakWords)} as a practical dialogue` },
    { label: 'Everyday article', topic: `${intent.trim() || fallbackTopic(intent, language, weakWords)} in daily life` },
  ];

  for (const angle of generatedAngles) {
    if (options.length >= 3) break;
    const key = `generate:${angle.topic.toLowerCase()}`;
    if (seen.has(key)) continue;
    const generated = buildGeneratedGoal(angle.topic, language, difficulty, weakWords);
    generated.title = angle.label;
    generated.topic = angle.topic;
    generated.description = `Find or create a ${difficulty} ${language} read about ${angle.topic}.`;
    options.push(suggestionToContentOption(generated, options.length));
    seen.add(key);
  }

  if (options.length < 3) {
    const article = buildArticleGoal(intent, language, difficulty);
    const key = `article:${article.searchQuery}`;
    if (!seen.has(key)) options.push(suggestionToContentOption(article, options.length));
  }

  while (options.length < 3) {
    const generated = buildGeneratedGoal(`${intent} reading option ${options.length + 1}`, language, difficulty, weakWords, 'habit');
    options.push(suggestionToContentOption(generated, options.length));
  }

  return options.slice(0, 3);
}

function normalizeSuggestions(params: {
  rawSuggestions: GoalSuggestionItem[];
  intent: string;
  language: string;
  difficulty: Difficulty;
  weakWords: string[];
  libraryTexts: { id: string; title: string; topic: string; difficulty: string }[];
}) {
  const { rawSuggestions, intent, language, difficulty, weakWords, libraryTexts } = params;
  const textById = new Map(libraryTexts.map((text) => [text.id, text]));
  const seenKeys = new Set<string>();

  const normalized = rawSuggestions.flatMap((suggestion) => {
    const item = { ...suggestion };
    const itemDifficulty = normalizeDifficulty(item.difficulty, difficulty);
    const range = targetWordRange(itemDifficulty);
    item.title = cleanText(item.title, 'Start a Reading Goal', 90);
    item.description = cleanText(item.description, 'Read one focused text and collect useful new words.', 500);
    item.why = cleanText(item.why, 'This gives you one clear next step for today.', 320);
    item.targetWords = clamp(Math.round(Number(item.targetWords) || range.fallback), range.min, range.max);
    item.estimatedMinutes = clamp(Math.round(Number(item.estimatedMinutes) || 12), 6, 35);

    if (item.actionType === 'existing') {
      const text = item.textId ? textById.get(item.textId) : undefined;
      if (!text) {
        const generated = buildGeneratedGoal(intent, language, itemDifficulty, weakWords);
        generated.title = item.title;
        generated.description = item.description;
        generated.why = item.why;
        return [generated];
      }
      item.textTitle = text.title;
    }

    if (item.actionType === 'generate') {
      item.topic = cleanText(item.topic, fallbackTopic(intent, language, weakWords), 180);
      item.difficulty = itemDifficulty;
    }

    if (item.actionType === 'article') {
      const topic = intent.trim() || item.title;
      item.source = cleanText(item.source, 'News or learning article', 80);
      item.searchQuery = cleanText(
        item.searchQuery,
        `${language} ${itemDifficulty} article ${topic}`,
        180,
      );
    }

    const key = `${item.actionType}:${item.textId || item.topic || item.searchQuery || item.title}`.toLowerCase();
    if (seenKeys.has(key)) return [];
    seenKeys.add(key);
    return [item];
  });

  if (!normalized.some((item) => item.actionType === 'generate')) {
    normalized.unshift(buildGeneratedGoal(intent, language, difficulty, weakWords));
  }

  if (libraryTexts.length && !normalized.some((item) => item.actionType === 'existing')) {
    normalized.splice(1, 0, buildExistingGoal(libraryTexts[0], difficulty));
  }

  if (!normalized.some((item) => item.actionType === 'article')) {
    normalized.push(buildArticleGoal(intent, language, difficulty));
  }

  while (normalized.length < 3) {
    normalized.push(buildGeneratedGoal(intent, language, difficulty, weakWords, 'habit'));
  }

  return normalized.slice(0, 3);
}

// POST /goals/suggest — AI generates goal suggestions from user intent
goalsRouter.post('/suggest', asyncHandler(async (req: AuthRequest, res) => {
  const { intent } = suggestSchema.parse(req.body);
  const settings = await prisma.userSettings.findUnique({ where: { userId: req.userId } });
  const language = settings?.targetLanguage || 'Spanish';

  const [vocabGroups, weakWords, recentTexts, recentSessions, recentGoals] = await Promise.all([
    prisma.vocabularyWord.groupBy({
      by: ['status'],
      where: { userId: req.userId, language },
      _count: true,
    }),
    prisma.vocabularyWord.findMany({
      where: {
        userId: req.userId,
        language,
        status: { in: ['learning', 'learned'] },
      },
      orderBy: [
        { status: 'asc' },
        { timesEncountered: 'desc' },
        { timesCorrect: 'asc' },
      ],
      take: 20,
      select: { word: true, translation: true, status: true, timesEncountered: true, timesCorrect: true },
    }),
    prisma.generatedText.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { id: true, title: true, topic: true, difficulty: true, language: true, wordCount: true },
    }),
    prisma.readingSession.findMany({
      where: { userId: req.userId, completedAt: { not: null } },
      orderBy: { completedAt: 'desc' },
      take: 5,
      select: {
        textId: true,
        text: { select: { title: true, topic: true } },
      },
    }),
    prisma.readingGoal.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { title: true, status: true, actionType: true, createdAt: true },
    }),
  ]);

  const knownCount = vocabGroups
    .filter((g) => g.status !== 'learning')
    .reduce((sum, g) => sum + g._count, 0);
  const level = inferDifficulty(knownCount, settings?.defaultDifficulty);

  const langTexts = recentTexts.filter(
    (t) => t.language.toLowerCase() === language.toLowerCase(),
  );
  const recentlyReadIds = new Set(recentSessions.map((session) => session.textId));
  const candidateTexts = langTexts.filter((text) => !recentlyReadIds.has(text.id));
  const existingGoalTexts = candidateTexts.length > 0 ? candidateTexts : langTexts;

  const textsContext =
    existingGoalTexts.length > 0
      ? existingGoalTexts
          .map((t) => `ID: ${t.id}, Title: "${t.title}", Topic: ${t.topic}, Difficulty: ${t.difficulty}`)
          .join('\n')
      : 'No texts in library yet';
  const weakWordsContext = weakWords.length
    ? weakWords
        .map((w) => `${w.word}${w.translation ? ` (${w.translation})` : ''} — ${w.status}, ${w.timesCorrect}/${w.timesEncountered} correct`)
        .join('\n')
    : 'No learning words yet';
  const recentGoalContext = recentGoals.length
    ? recentGoals
        .map((goal) => `${goal.title} — ${goal.status}, ${goal.actionType}`)
        .join('\n')
    : 'No recent goals yet';
  const recentReadContext = recentSessions.length
    ? recentSessions
        .map((session) => `${session.text.title} — ${session.text.topic}`)
        .join('\n')
    : 'No completed reading sessions yet';

  const userMessage = [
    `Learner intent: ${intent}`,
    `Target language: ${language}`,
    `Proficiency level: ${level}`,
    `Words known (learned + mastered): ${knownCount}`,
    `Default reading difficulty: ${settings?.defaultDifficulty || 'intermediate'}`,
    `Weak or learning words to reuse when natural:\n${weakWordsContext}`,
    `Recently completed readings to avoid repeating:\n${recentReadContext}`,
    `Recent goals to avoid repeating:\n${recentGoalContext}`,
    `Candidate library texts for "existing" goals:\n${textsContext}`,
  ].join('\n');

  const agent = createGoalSuggestionAgent();
  const result = await agent.generate(userMessage, {
    structuredOutput: { schema: goalSuggestionsSchema },
  });

  const suggestions = normalizeSuggestions({
    rawSuggestions: result.object.suggestions,
    intent,
    language,
    difficulty: level,
    weakWords: weakWords.map((word) => word.word),
    libraryTexts: existingGoalTexts,
  }).map((suggestion) => ({
    ...suggestion,
    contentOptions: buildContentOptions({
      suggestion,
      intent,
      language,
      difficulty: level,
      weakWords: weakWords.map((word) => word.word),
      libraryTexts: existingGoalTexts,
    }),
  }));

  res.json({ suggestions });
}, 'Failed to suggest goals'));

// GET /goals — list goals for the current user
goalsRouter.get('/', asyncHandler(async (req: AuthRequest, res) => {
  const { status } = listGoalsSchema.parse(req.query);

  const goals = await prisma.readingGoal.findMany({
    where: {
      userId: req.userId,
      ...(status === 'all' ? {} : { status }),
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ goals });
}, 'Failed to get goals'));

// POST /goals — save an accepted goal (dismisses any existing active goal first)
goalsRouter.post('/', asyncHandler(async (req: AuthRequest, res) => {
  const data = saveGoalSchema.parse(req.body);

  // One active goal at a time — dismiss previous
  await prisma.readingGoal.updateMany({
    where: { userId: req.userId!, status: 'active' },
    data: { status: 'dismissed' },
  });

  const goal = await prisma.readingGoal.create({
    data: {
      userId: req.userId!,
      title: data.title,
      description: data.description,
      why: data.why,
      targetWords: data.targetWords,
      estimatedMinutes: data.estimatedMinutes,
      actionType: data.actionType,
      actionData: JSON.stringify(data.actionData),
    },
  });

  res.json({ goal });
}, 'Failed to save goal'));

// PATCH /goals/:id — mark active, completed, or dismissed
goalsRouter.patch('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const { status } = updateGoalSchema.parse(req.body);
  const { id } = req.params;

  const goal = await prisma.readingGoal.findFirst({
    where: { id, userId: req.userId },
  });

  if (!goal) {
    res.status(404).json({ error: 'Goal not found' });
    return;
  }

  if (status === 'active') {
    await prisma.readingGoal.updateMany({
      where: { userId: req.userId!, status: 'active', id: { not: id } },
      data: { status: 'dismissed' },
    });
  }

  const updated = await prisma.readingGoal.update({
    where: { id },
    data: {
      status,
      completedAt: status === 'completed' ? new Date() : null,
    },
  });

  res.json({ goal: updated });
}, 'Failed to update goal'));

// DELETE /goals/:id
goalsRouter.delete('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;

  const goal = await prisma.readingGoal.findFirst({
    where: { id, userId: req.userId },
  });

  if (!goal) {
    res.status(404).json({ error: 'Goal not found' });
    return;
  }

  await prisma.readingGoal.delete({ where: { id } });
  res.json({});
}, 'Failed to delete goal'));
