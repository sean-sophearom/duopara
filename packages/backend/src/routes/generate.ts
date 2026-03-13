import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { asyncHandler } from '../lib/routeUtils.js';
import { createTextGenerationAgent, getModelForTask, generatedTextSchema } from '../lib/llm/index.js';
import { textGenerationPrompt, textRegenerationPrompt } from '../lib/llm/prompts.js';
import { extractWords, shuffle } from '../lib/textUtils.js';
import { DIFFICULTIES, CONTENT_STYLES } from '../lib/constants.js';
import { ALLOWED_LANGUAGES, MAX_TOPIC_LENGTH } from '../lib/constants.js';

function validLanguage() {
  return z.string().min(1).max(50).refine(
    (val) => ALLOWED_LANGUAGES.has(val.toLowerCase()),
    { message: 'Unsupported language' }
  );
}

export const generateRouter = Router();
generateRouter.use(authenticate);

const generateSchema = z.object({
  topic: z.string().min(1).max(MAX_TOPIC_LENGTH),
  language: validLanguage(),
  difficulty: z.enum(DIFFICULTIES).default('intermediate'),
  knownWordsRatio: z.number().min(0).max(100).default(80),
  wordCount: z.number().min(50).max(1000).default(200),
  style: z.enum(CONTENT_STYLES).default('story'),
  includeLearningWords: z.boolean().default(true),
  includeLearnedWords: z.boolean().default(true)
});

const regenerateSchema = z.object({
  textId: z.string(),
  action: z.enum(['simplify', 'harder'])
});

// ============================================
// Shared helpers for generate & regenerate
// ============================================

async function fetchKnownWords(
  userId: string, language: string, statusIn: string[]
): Promise<string[]> {
  const knownWords = await prisma.vocabularyWord.findMany({
    where: { userId, language, status: { in: statusIn } },
    select: { word: true, baseForm: true }
  });
  return shuffle([...new Set([
    ...knownWords.map((w: any) => w.word),
    ...knownWords.filter((w: any) => w.baseForm).map((w: any) => w.baseForm!)
  ])]);
}

function analyzeWords(content: string, language: string, knownWordsList: string[]) {
  const wordsInText = extractWords(content, language);
  const knownWordsSet = new Set(knownWordsList.map(w => w.toLowerCase()));
  return {
    wordsInText,
    knownWordsUsed: [...new Set(wordsInText.filter(w => knownWordsSet.has(w.toLowerCase())))],
    newWordsIntroduced: [...new Set(wordsInText.filter(w => !knownWordsSet.has(w.toLowerCase())))]
  };
}

async function saveTextAndSession(
  userId: string,
  params: { topic: string; language: string; difficulty: string; knownWordsRatio: number; title: string; content: string },
  analysis: { wordsInText: string[]; knownWordsUsed: string[]; newWordsIntroduced: string[] }
) {
  const text = await prisma.generatedText.create({
    data: {
      userId,
      topic: params.topic,
      language: params.language,
      difficulty: params.difficulty,
      knownWordsRatio: params.knownWordsRatio,
      title: params.title,
      content: params.content,
      wordCount: analysis.wordsInText.length,
      knownWordsUsed: JSON.stringify(analysis.knownWordsUsed),
      newWordsIntroduced: JSON.stringify(analysis.newWordsIntroduced)
    }
  });
  const session = await prisma.readingSession.create({
    data: { userId, textId: text.id }
  });
  return { text, session };
}

async function generateText(language: string, difficulty: string, prompt: string) {
  const agent = createTextGenerationAgent(language, difficulty);
  const config = getModelForTask('text-generation');
  return agent.generate(prompt, {
    modelSettings: {
      temperature: config.temperature ?? 0.8,
      maxOutputTokens: config.maxOutputTokens ?? 2000
    },
    structuredOutput: { schema: generatedTextSchema }
  });
}

// Generate new text
generateRouter.post('/', asyncHandler(async (req: AuthRequest, res) => {
  const params = generateSchema.parse(req.body);
  
  // Build status filter
  const statusIn: string[] = [];
  if (params.includeLearnedWords) statusIn.push('learned', 'mastered');
  if (params.includeLearningWords) statusIn.push('learning');
  if (statusIn.length === 0) statusIn.push('learned', 'mastered');

  const knownWordsList = await fetchKnownWords(req.userId!, params.language, statusIn);
  const prompt = textGenerationPrompt({ ...params, knownWords: knownWordsList });
  const result = await generateText(params.language, params.difficulty, prompt);

  const title = result.object?.title || params.topic;
  const content = result.object?.content || '';
  const analysis = analyzeWords(content, params.language, knownWordsList);

  const { text, session } = await saveTextAndSession(
    req.userId!, 
    { topic: params.topic, language: params.language, difficulty: params.difficulty, knownWordsRatio: params.knownWordsRatio, title, content },
    analysis
  );

  res.json({
    text: { ...text, knownWordsUsed: analysis.knownWordsUsed, newWordsIntroduced: analysis.newWordsIntroduced },
    sessionId: session.id
  });
}, 'Failed to generate text'));

// Regenerate with modifications (simplify/harder)
generateRouter.post('/regenerate', asyncHandler(async (req: AuthRequest, res) => {
  const { textId, action } = regenerateSchema.parse(req.body);
  
  const original = await prisma.generatedText.findFirst({
    where: { id: textId, userId: req.userId }
  });
  if (!original) return res.status(404).json({ error: 'Text not found' });

  const knownWordsList = await fetchKnownWords(req.userId!, original.language, ['learned', 'mastered']);

  // Adjust difficulty
  const difficulties = ['beginner', 'intermediate', 'advanced'];
  const currentIndex = difficulties.indexOf(original.difficulty);
  let newDifficulty = original.difficulty;
  if (action === 'simplify' && currentIndex > 0) newDifficulty = difficulties[currentIndex - 1];
  else if (action === 'harder' && currentIndex < 2) newDifficulty = difficulties[currentIndex + 1];

  const prompt = textRegenerationPrompt({
    originalContent: original.content,
    topic: original.topic,
    action,
    language: original.language,
    knownWords: knownWordsList,
    newDifficulty,
    wordCount: original.wordCount
  });

  const result = await generateText(original.language, newDifficulty, prompt);
  const title = result.object?.title || original.title;
  const content = result.object?.content || '';
  const analysis = analyzeWords(content, original.language, knownWordsList);

  const { text, session } = await saveTextAndSession(
    req.userId!,
    {
      topic: original.topic, language: original.language, difficulty: newDifficulty,
      knownWordsRatio: action === 'simplify'
        ? Math.min(95, original.knownWordsRatio + 10)
        : Math.max(50, original.knownWordsRatio - 10),
      title, content
    },
    analysis
  );

  res.json({
    text: { ...text, knownWordsUsed: analysis.knownWordsUsed, newWordsIntroduced: analysis.newWordsIntroduced },
    sessionId: session.id
  });
}, 'Failed to regenerate text'));


