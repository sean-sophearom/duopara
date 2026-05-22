import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { PDFParse } from 'pdf-parse';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { asyncHandler } from '../lib/routeUtils.js';
import { createTextGenerationAgent, createTextAdaptationAgent, getModelForTask, generatedTextSchema } from '../lib/llm/index.js';
import { textGenerationPrompt, textRegenerationPrompt, textAdaptationPrompt } from '../lib/llm/prompts.js';
import { extractWords, shuffle, splitSentences } from '../lib/textUtils.js';
import { DIFFICULTIES, CONTENT_STYLES } from '../lib/constants.js';
import { ALLOWED_LANGUAGES, MAX_TOPIC_LENGTH, MAX_UPLOAD_DOC_SIZE, MAX_UPLOAD_TEXT_CHARS } from '../lib/constants.js';

function validLanguage() {
  return z.string().min(1).max(50).refine(
    (val) => ALLOWED_LANGUAGES.has(val.toLowerCase()),
    { message: 'Unsupported language' }
  );
}

export const generateRouter = Router();
generateRouter.use(authenticate);

const generateSchema = z.object({
  topic: z.string().min(1).max(MAX_TOPIC_LENGTH).optional(),
  customText: z.string().min(1).max(50000).optional(),
  title: z.string().max(200).optional(),
  language: validLanguage(),
  difficulty: z.enum(DIFFICULTIES).default('intermediate'),
  knownWordsRatio: z.number().min(0).max(100).default(80),
  wordCount: z.number().min(50).max(1000).default(200),
  style: z.enum(CONTENT_STYLES).default('story'),
  includeLearningWords: z.boolean().default(true),
  includeLearnedWords: z.boolean().default(true),
  reuseExisting: z.boolean().default(true)
}).refine(data => data.topic || data.customText, {
  message: 'Either topic or customText must be provided'
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

function parseJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatGeneratedText(text: {
  knownWordsUsed: string;
  newWordsIntroduced: string;
  [key: string]: unknown;
}) {
  return {
    ...text,
    knownWordsUsed: parseJsonArray(text.knownWordsUsed),
    newWordsIntroduced: parseJsonArray(text.newWordsIntroduced),
  };
}

const REUSE_STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'about', 'at', 'for', 'from', 'how', 'in', 'into', 'is',
  'learn', 'learning', 'of', 'on', 'or', 'practice', 'read', 'reading', 'the', 'to',
  'with', 'words',
]);

function topicTokens(value: string) {
  return [...new Set(
    value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 2 && !REUSE_STOP_WORDS.has(token))
  )];
}

function overlapRatio(queryTokens: string[], candidateTokens: string[]) {
  if (!queryTokens.length) return 0;
  const candidateSet = new Set(candidateTokens);
  const overlap = queryTokens.filter((token) => candidateSet.has(token)).length;
  return overlap / queryTokens.length;
}

function scoreReusableText(
  topic: string,
  text: { title: string; topic: string; content: string; difficulty: string },
  requestedDifficulty: string,
) {
  const query = topicTokens(topic);
  if (!query.length) return 0;

  const titleTopic = `${text.title} ${text.topic}`;
  const titleScore = overlapRatio(query, topicTokens(titleTopic));
  const contentScore = overlapRatio(query, topicTokens(text.content.slice(0, 2500)));
  const difficultyBoost = text.difficulty === requestedDifficulty ? 0.08 : 0;
  const directBoost = titleTopic.toLowerCase().includes(topic.toLowerCase().trim()) ? 0.15 : 0;

  return titleScore * 0.65 + contentScore * 0.35 + difficultyBoost + directBoost;
}

function excerptByWordCount(content: string, language: string, targetWordCount: number) {
  const sentences = splitSentences(content);
  const target = Math.max(60, targetWordCount);
  const selected: string[] = [];
  let count = 0;

  for (const sentence of sentences) {
    selected.push(sentence);
    count += extractWords(sentence, language).length;
    if (count >= target) break;
  }

  return selected.join(' ').trim();
}

async function tryReuseExistingText(
  userId: string,
  params: z.infer<typeof generateSchema>,
  knownWordsList: string[],
) {
  if (!params.reuseExisting || params.customText || !params.topic) return null;

  const existingTexts = await prisma.generatedText.findMany({
    where: { userId, language: params.language },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });

  const candidates = existingTexts
    .map((text) => ({
      text,
      score: scoreReusableText(params.topic!, text, params.difficulty),
    }))
    .filter((candidate) => candidate.score >= 0.34)
    .sort((a, b) => b.score - a.score);

  if (!candidates.length) return null;

  const targetWords = params.wordCount;
  const best = candidates[0].text;

  if (best.wordCount >= targetWords * 0.65 && best.wordCount <= targetWords * 1.55) {
    const session = await prisma.readingSession.create({
      data: { userId, textId: best.id },
    });
    return {
      text: formatGeneratedText(best),
      sessionId: session.id,
      reused: true,
      reuseStrategy: 'existing',
      reusedFromTextId: best.id,
    };
  }

  if (best.wordCount > targetWords * 1.55) {
    const content = excerptByWordCount(best.content, params.language, targetWords);
    if (extractWords(content, params.language).length >= 50) {
      const analysis = analyzeWords(content, params.language, knownWordsList);
      const title = `${best.title}: Focus Read`.slice(0, 200);
      const { text, session } = await saveTextAndSession(
        userId,
        {
          topic: params.topic,
          language: params.language,
          difficulty: params.difficulty,
          knownWordsRatio: params.knownWordsRatio,
          title,
          content,
        },
        analysis,
      );
      return {
        text: { ...text, knownWordsUsed: analysis.knownWordsUsed, newWordsIntroduced: analysis.newWordsIntroduced },
        sessionId: session.id,
        reused: true,
        reuseStrategy: 'excerpt',
        reusedFromTextId: best.id,
      };
    }
  }

  const combinedParts: string[] = [];
  let combinedWordCount = 0;
  for (const candidate of candidates.slice(0, 4)) {
    if (combinedWordCount >= targetWords * 0.85) break;
    const remaining = Math.max(60, targetWords - combinedWordCount);
    const part = candidate.text.wordCount > remaining * 1.4
      ? excerptByWordCount(candidate.text.content, params.language, remaining)
      : candidate.text.content;
    combinedParts.push(part);
    combinedWordCount += extractWords(part, params.language).length;
  }

  if (combinedParts.length > 1 && combinedWordCount >= Math.max(80, targetWords * 0.65)) {
    const content = combinedParts.join('\n\n');
    const analysis = analyzeWords(content, params.language, knownWordsList);
    const { text, session } = await saveTextAndSession(
      userId,
      {
        topic: params.topic,
        language: params.language,
        difficulty: params.difficulty,
        knownWordsRatio: params.knownWordsRatio,
        title: `Reading Mix: ${params.topic}`.slice(0, 200),
        content,
      },
      analysis,
    );
    return {
      text: { ...text, knownWordsUsed: analysis.knownWordsUsed, newWordsIntroduced: analysis.newWordsIntroduced },
      sessionId: session.id,
      reused: true,
      reuseStrategy: 'combined',
      reusedFromTextId: candidates.map((candidate) => candidate.text.id).join(','),
    };
  }

  return null;
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

// Suggest a random topic
const randomTopicSchema = z.object({
  language: validLanguage(),
  difficulty: z.enum(DIFFICULTIES).default('intermediate'),
});

generateRouter.get('/random-topic', asyncHandler(async (req: AuthRequest, res) => {
  const { language, difficulty } = randomTopicSchema.parse(req.query);
  const agent = createTextGenerationAgent(language, difficulty);
  const config = getModelForTask('text-generation');
  const result = await agent.generate(
    `Suggest a single creative, specific, and interesting topic for a language-learning reading text in ${language} at ${difficulty} level. ` +
    `Reply with ONLY the topic phrase (5-15 words), no intro, no punctuation at the end. Examples: "A detective solving a mystery in Barcelona", "Learning to cook ramen with a Japanese grandmother".`,
    { modelSettings: { temperature: 1.0, maxOutputTokens: 60 } }
  );
  const topic = result.text?.trim().replace(/[.!?"']+$/, '') || 'A day in the life of a local';
  res.json({ topic });
}, 'Failed to generate random topic'));

// Generate new text
generateRouter.post('/', asyncHandler(async (req: AuthRequest, res) => {
  const params = generateSchema.parse(req.body);
  
  // Build status filter
  const statusIn: string[] = [];
  if (params.includeLearnedWords) statusIn.push('learned', 'mastered');
  if (params.includeLearningWords) statusIn.push('learning');
  if (statusIn.length === 0) statusIn.push('learned', 'mastered');

  const knownWordsList = await fetchKnownWords(req.userId!, params.language, statusIn);

  const reused = await tryReuseExistingText(req.userId!, params, knownWordsList);
  if (reused) {
    return res.json(reused);
  }

  let title: string;
  let content: string;

  if (params.customText) {
    content = params.customText;
    const firstSentence = content.split(/[.!?\n]/)[0].trim().slice(0, 100);
    title = params.title || params.topic || firstSentence || 'Custom Text';
  } else {
    const prompt = textGenerationPrompt({ ...params, topic: params.topic!, knownWords: knownWordsList });
    const result = await generateText(params.language, params.difficulty, prompt);
    title = result.object?.title || params.topic!;
    content = result.object?.content || '';
  }

  const topic = params.topic || title;
  const analysis = analyzeWords(content, params.language, knownWordsList);

  const { text, session } = await saveTextAndSession(
    req.userId!, 
    { topic, language: params.language, difficulty: params.difficulty, knownWordsRatio: params.knownWordsRatio, title, content },
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

// ============================================
// Upload & extract document
// ============================================

const docUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_DOC_SIZE },
  fileFilter: (_req, file, cb) => {
    const isPdf = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
    const isTxt = file.mimetype === 'text/plain' || file.originalname.toLowerCase().endsWith('.txt');
    if (isPdf || isTxt) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and TXT files are supported'));
    }
  },
});

const coerceBool = (def: boolean) => z.preprocess(v => {
  if (v === undefined || v === null) return def;
  if (typeof v === 'boolean') return v;
  return v === 'true' || v === '1';
}, z.boolean());

const uploadSchema = z.object({
  language: validLanguage(),
  difficulty: z.enum(DIFFICULTIES).default('intermediate'),
  knownWordsRatio: z.preprocess(v => v !== undefined ? Number(v) : 80, z.number().min(0).max(100)).default(80),
  includeLearningWords: coerceBool(true),
  includeLearnedWords: coerceBool(true),
  aiAdapt: coerceBool(false),
  title: z.string().max(200).optional(),
});

generateRouter.post('/upload', docUpload.single('file'), asyncHandler(async (req: AuthRequest, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const params = uploadSchema.parse(req.body);

  // Extract text from file
  let rawText: string;
  const filename = req.file.originalname;
  const isPdf = req.file.mimetype === 'application/pdf' || filename.toLowerCase().endsWith('.pdf');

  if (isPdf) {
    const parser = new PDFParse({ data: req.file.buffer });
    const parsed = await parser.getText();
    rawText = parsed.text;
  } else {
    rawText = req.file.buffer.toString('utf-8');
  }

  rawText = rawText.trim();
  if (!rawText) return res.status(400).json({ error: 'Could not extract text from file' });

  // Cap length
  const truncated = rawText.slice(0, MAX_UPLOAD_TEXT_CHARS);

  // Optionally clean/adapt with AI
  let content: string;
  let title: string;

  if (params.aiAdapt) {
    const agent = createTextAdaptationAgent(params.language);
    const config = getModelForTask('text-generation');
    const result = await agent.generate(textAdaptationPrompt(truncated), {
      modelSettings: { temperature: 0.3, maxOutputTokens: 4096 },
      structuredOutput: { schema: generatedTextSchema },
    });
    title = params.title || result.object?.title || path.basename(filename, path.extname(filename));
    content = result.object?.content || truncated;
  } else {
    content = truncated;
    title = params.title || path.basename(filename, path.extname(filename));
  }

  // Build vocabulary filter
  const statusIn: string[] = [];
  if (params.includeLearnedWords) statusIn.push('learned', 'mastered');
  if (params.includeLearningWords) statusIn.push('learning');
  if (statusIn.length === 0) statusIn.push('learned', 'mastered');

  const knownWordsList = await fetchKnownWords(req.userId!, params.language, statusIn);
  const analysis = analyzeWords(content, params.language, knownWordsList);

  const { text, session } = await saveTextAndSession(
    req.userId!,
    { topic: title, language: params.language, difficulty: params.difficulty, knownWordsRatio: params.knownWordsRatio, title, content },
    analysis
  );

  res.json({
    text: { ...text, knownWordsUsed: analysis.knownWordsUsed, newWordsIntroduced: analysis.newWordsIntroduced },
    sessionId: session.id,
  });
}, 'Failed to process uploaded file'));

