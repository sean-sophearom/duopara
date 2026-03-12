import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { createTextGenerationAgent, getModelForTask, generatedTextSchema } from '../lib/llm/index.js';

export const generateRouter = Router();
generateRouter.use(authenticate);

const generateSchema = z.object({
  topic: z.string().min(1),
  language: z.string().min(1),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('intermediate'),
  knownWordsRatio: z.number().min(0).max(100).default(80),
  wordCount: z.number().min(50).max(1000).default(200),
  style: z.enum(['story', 'article', 'dialogue', 'description']).default('story'),
  includeLearningWords: z.boolean().default(true),
  includeLearnedWords: z.boolean().default(true)
});

const regenerateSchema = z.object({
  textId: z.string(),
  action: z.enum(['simplify', 'harder'])
});

// Generate new text
generateRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const params = generateSchema.parse(req.body);
    
    // Build status filter based on preferences
    const statusIn: string[] = [];
    if (params.includeLearnedWords) {
      statusIn.push('learned', 'mastered');
    }
    if (params.includeLearningWords) {
      statusIn.push('learning');
    }

    // Default to learned/mastered if none selected (should not happen with UI validation)
    if (statusIn.length === 0) {
      statusIn.push('learned', 'mastered');
    }

    // Get user's known words
    const knownWords = await prisma.vocabularyWord.findMany({
      where: {
        userId: req.userId,
        language: params.language,
        status: { in: statusIn }
      },
      select: { word: true, baseForm: true }
    });

    const knownWordsList = shuffle([...new Set([
      ...knownWords.map((w: any) => w.word),
      ...knownWords.filter((w: any) => w.baseForm).map((w: any) => w.baseForm!)
    ])]);

    // Build the prompt
    const prompt = buildGenerationPrompt({
      ...params,
      knownWords: knownWordsList
    });

    // Use Mastra agent for text generation
    const agent = createTextGenerationAgent(params.language, params.difficulty);
    const config = getModelForTask('text-generation');
    
    const result = await agent.generate(prompt, {
      modelSettings: {
        temperature: config.temperature ?? 0.8,
        maxOutputTokens: config.maxOutputTokens ?? 2000
      },
      structuredOutput: {
        schema: generatedTextSchema
      }
    });

    const title = result.object?.title || params.topic;
    const content = result.object?.content || '';

    // Analyze words used
    const wordsInText = extractWords(content, params.language);
    const knownWordsSet = new Set(knownWordsList.map(w => w.toLowerCase()));
    
    const knownWordsUsed = wordsInText.filter(w => knownWordsSet.has(w.toLowerCase()));
    const newWordsIntroduced = wordsInText.filter(w => !knownWordsSet.has(w.toLowerCase()));

    // Save to database
    const text = await prisma.generatedText.create({
      data: {
        userId: req.userId!,
        topic: params.topic,
        language: params.language,
        difficulty: params.difficulty,
        knownWordsRatio: params.knownWordsRatio,
        title,
        content,
        wordCount: wordsInText.length,
        knownWordsUsed: JSON.stringify([...new Set(knownWordsUsed)]),
        newWordsIntroduced: JSON.stringify([...new Set(newWordsIntroduced)])
      }
    });

    // Start a reading session
    const session = await prisma.readingSession.create({
      data: {
        userId: req.userId!,
        textId: text.id
      }
    });

    res.json({
      text: {
        ...text,
        knownWordsUsed: [...new Set(knownWordsUsed)],
        newWordsIntroduced: [...new Set(newWordsIntroduced)]
      },
      sessionId: session.id
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Generate error:', error);
    res.status(500).json({ error: 'Failed to generate text' });
  }
});

// Regenerate with modifications (simplify/harder)
generateRouter.post('/regenerate', async (req: AuthRequest, res) => {
  try {
    const { textId, action } = regenerateSchema.parse(req.body);
    
    // Get the original text
    const original = await prisma.generatedText.findFirst({
      where: { id: textId, userId: req.userId }
    });

    if (!original) {
      return res.status(404).json({ error: 'Text not found' });
    }

    // Get user's known words
    const knownWords = await prisma.vocabularyWord.findMany({
      where: {
        userId: req.userId,
        language: original.language,
        status: { in: ['learned', 'mastered'] }
      },
      select: { word: true, baseForm: true }
    });

    const knownWordsList = shuffle([...new Set([
      ...knownWords.map((w: any) => w.word),
      ...knownWords.filter((w: any) => w.baseForm).map((w: any) => w.baseForm!)
    ])]);

    // Adjust difficulty
    const difficultyMap: Record<string, string[]> = {
      beginner: ['beginner', 'intermediate', 'advanced'],
      intermediate: ['beginner', 'intermediate', 'advanced'],
      advanced: ['beginner', 'intermediate', 'advanced']
    };
    const currentIndex = difficultyMap[original.difficulty].indexOf(original.difficulty);
    let newDifficulty = original.difficulty;
    
    if (action === 'simplify' && currentIndex > 0) {
      newDifficulty = difficultyMap[original.difficulty][currentIndex - 1];
    } else if (action === 'harder' && currentIndex < 2) {
      newDifficulty = difficultyMap[original.difficulty][currentIndex + 1];
    }

    // Build regeneration prompt
    const prompt = buildRegenerationPrompt({
      originalContent: original.content,
      topic: original.topic,
      action,
      language: original.language,
      knownWords: knownWordsList,
      newDifficulty,
      wordCount: original.wordCount
    });

    // Use Mastra agent with structured output for guaranteed valid JSON
    const agent = createTextGenerationAgent(original.language, newDifficulty);
    const config = getModelForTask('text-generation');
    
    const result = await agent.generate(prompt, {
      modelSettings: {
        temperature: config.temperature ?? 0.8,
        maxOutputTokens: config.maxOutputTokens ?? 2000
      },
      structuredOutput: {
        schema: generatedTextSchema
      }
    });

    const generated = result.object;
    const title = generated?.title || original.title;
    const content = generated?.content || '';

    const wordsInText = extractWords(content, original.language);
    const knownWordsSet = new Set(knownWordsList.map(w => w.toLowerCase()));
    
    const knownWordsUsed = wordsInText.filter(w => knownWordsSet.has(w.toLowerCase()));
    const newWordsIntroduced = wordsInText.filter(w => !knownWordsSet.has(w.toLowerCase()));

    // Save new version
    const text = await prisma.generatedText.create({
      data: {
        userId: req.userId!,
        topic: original.topic,
        language: original.language,
        difficulty: newDifficulty,
        knownWordsRatio: action === 'simplify' 
          ? Math.min(95, original.knownWordsRatio + 10)
          : Math.max(50, original.knownWordsRatio - 10),
        title,
        content,
        wordCount: wordsInText.length,
        knownWordsUsed: JSON.stringify([...new Set(knownWordsUsed)]),
        newWordsIntroduced: JSON.stringify([...new Set(newWordsIntroduced)])
      }
    });

    const session = await prisma.readingSession.create({
      data: {
        userId: req.userId!,
        textId: text.id
      }
    });

    res.json({
      text: {
        ...text,
        knownWordsUsed: [...new Set(knownWordsUsed)],
        newWordsIntroduced: [...new Set(newWordsIntroduced)]
      },
      sessionId: session.id
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Regenerate error:', error);
    res.status(500).json({ error: 'Failed to regenerate text' });
  }
});

// Helper functions
function buildGenerationPrompt(params: {
  topic: string;
  language: string;
  difficulty: string;
  knownWordsRatio: number;
  wordCount: number;
  style: string;
  knownWords: string[];
}): string {
  const sliceCount = Math.max(50, params.wordCount - 20);
  const knownWordsHint = params.knownWords.length > 0
    ? `\n\nThe learner knows these words (use approximately ${params.knownWordsRatio}% of vocabulary from this list): ${params.knownWords.slice(0, sliceCount).join(', ')}${params.knownWords.length > sliceCount ? '... and more' : ''}`
    : `\n\nThe learner is a beginner with limited vocabulary. Keep words simple and common.`;

  const styleGuide: Record<string, string> = {
    story: 'Write an engaging narrative story with characters and plot development.',
    article: 'Write an informative article or blog post style content.',
    dialogue: 'Write a realistic conversation between 2-3 people.',
    description: 'Write a vivid descriptive piece about a place, person, or event.'
  };

  return `Generate ${params.style} content in ${params.language} about: "${params.topic}"

Style: ${styleGuide[params.style]}
Target length: approximately ${params.wordCount} words
Vocabulary ratio: ${params.knownWordsRatio}% familiar words, ${100 - params.knownWordsRatio}% new/challenging words
${knownWordsHint}

Remember:
- New vocabulary should be understandable from context
- Include some repetition of new words for reinforcement
- Make it interesting and motivating to read`;
}

function buildRegenerationPrompt(params: {
  originalContent: string;
  topic: string;
  action: 'simplify' | 'harder';
  language: string;
  knownWords: string[];
  newDifficulty: string;
  wordCount: number;
}): string {
  const sliceCount = Math.max(50, params.wordCount - 20);
  const actionGuide = params.action === 'simplify'
    ? `SIMPLIFY this text:
- Use simpler vocabulary
- Shorter sentences
- Simpler grammar structures
- Keep the same general topic and story
- Make it more accessible for learners`
    : `MAKE THIS TEXT MORE CHALLENGING:
- Use more sophisticated vocabulary
- More complex sentence structures
- Advanced grammar (subjunctive, conditionals)
- Add idiomatic expressions
- Maintain the story/topic but elevate the language`;

  return `${actionGuide}

Original text (${params.language}):
"""
${params.originalContent}
"""

Topic: ${params.topic}
New difficulty level: ${params.newDifficulty}

The learner knows these words: ${params.knownWords.slice(0, sliceCount).join(', ')}

Generate a ${params.action === 'simplify' ? 'simpler' : 'more challenging'} version while keeping it engaging.`;
}

function extractWords(text: string, _language: string): string[] {
  // Remove punctuation and split by whitespace
  // Handle Spanish-specific characters
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]/gu, ' ')
    .split(/\s+/)
    .filter(word => word.length > 1 && !/^\d+$/.test(word));
}

function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
