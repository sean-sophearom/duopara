import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { asyncHandler } from '../lib/routeUtils.js';
import {
  createParallelTranslationAgent,
  getModelForTask,
  parallelTextTranslationSchema
} from '../lib/llm/index.js';
import { parallelTranslationPrompt } from '../lib/llm/prompts.js';
import { MAX_QUERY_LIMIT } from '../lib/constants.js';

export const textsRouter = Router();
textsRouter.use(authenticate);

// Get all texts (History Vault)
textsRouter.get('/', asyncHandler(async (req: AuthRequest, res) => {
  const { language, limit, offset, search } = req.query;
  
  const where: any = { userId: req.userId };
  if (language) where.language = language;
  if (search) {
    where.OR = [
      { title: { contains: search as string } },
      { topic: { contains: search as string } }
    ];
  }

    const [texts, total] = await Promise.all([
      prisma.generatedText.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit ? Math.min(parseInt(limit as string) || 20, MAX_QUERY_LIMIT) : 20,
        skip: offset ? Math.max(parseInt(offset as string) || 0, 0) : 0,
        include: {
          readingSessions: {
            orderBy: { startedAt: 'desc' },
            take: 1
          }
        }
      }),
      prisma.generatedText.count({ where })
    ]);

    // Parse JSON fields and add computed properties
    const formattedTexts = texts.map((text: any) => ({
      ...text,
      knownWordsUsed: JSON.parse(text.knownWordsUsed),
      newWordsIntroduced: JSON.parse(text.newWordsIntroduced),
      lastRead: text.readingSessions[0]?.startedAt || text.createdAt,
      readCount: text.readingSessions.length
    }));

    res.json({ texts: formattedTexts, total });
}, 'Failed to get texts'));

// Get single text
textsRouter.get('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
    
    const text = await prisma.generatedText.findFirst({
      where: { id, userId: req.userId },
      include: {
        readingSessions: {
          orderBy: { startedAt: 'desc' }
        }
      }
    });

    if (!text) {
      return res.status(404).json({ error: 'Text not found' });
    }

    // Parse JSON fields in reading sessions
    const parsedSessions = text.readingSessions.map((session: any) => ({
      ...session,
      wordsLookedUp: JSON.parse(session.wordsLookedUp),
      wordsMarkedLearned: JSON.parse(session.wordsMarkedLearned)
    }));

    res.json({
      text: {
        ...text,
        knownWordsUsed: JSON.parse(text.knownWordsUsed),
        newWordsIntroduced: JSON.parse(text.newWordsIntroduced),
        readingSessions: parsedSessions
      }
    });
}, 'Failed to get text'));

// Start a new reading session for existing text
textsRouter.post('/:id/start-session', asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  
  const text = await prisma.generatedText.findFirst({ where: { id, userId: req.userId } });
  if (!text) return res.status(404).json({ error: 'Text not found' });

  const session = await prisma.readingSession.create({
    data: { userId: req.userId!, textId: id }
  });
  res.json({ session });
}, 'Failed to start session'));

// Update reading session
const sessionUpdateSchema = z.object({
  wordsLookedUp: z.array(z.string().max(100)).max(500).optional(),
  wordsMarkedLearned: z.array(z.string().max(100)).max(500).optional(),
  completed: z.boolean().optional()
});

textsRouter.patch('/session/:sessionId', asyncHandler(async (req: AuthRequest, res) => {
  const { sessionId } = req.params;
  const { wordsLookedUp, wordsMarkedLearned, completed } = sessionUpdateSchema.parse(req.body);
  
  const session = await prisma.readingSession.findFirst({ where: { id: sessionId, userId: req.userId } });
  if (!session) return res.status(404).json({ error: 'Session not found' });

    const updateData: any = {};
    
    if (wordsLookedUp) {
      const existing = JSON.parse(session.wordsLookedUp);
      updateData.wordsLookedUp = JSON.stringify([...new Set([...existing, ...wordsLookedUp])]);
    }
    
    if (wordsMarkedLearned) {
      const existing = JSON.parse(session.wordsMarkedLearned);
      updateData.wordsMarkedLearned = JSON.stringify([...new Set([...existing, ...wordsMarkedLearned])]);
    }
    
    if (completed) {
      updateData.completedAt = new Date();
    }

    const updated = await prisma.readingSession.update({
      where: { id: sessionId },
      data: updateData
    });
    res.json({ session: updated });
}, 'Failed to update session'));

// Delete a text
textsRouter.delete('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  await prisma.generatedText.deleteMany({ where: { id, userId: req.userId } });
  res.json({ success: true });
}, 'Failed to delete text'));

// Translate entire text — cached per text+language
textsRouter.post('/:id/translate', asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { targetLanguage } = z.object({ targetLanguage: z.string().min(1) }).parse(req.body);

    const text = await prisma.generatedText.findFirst({
      where: { id, userId: req.userId }
    });

    if (!text) {
      return res.status(404).json({ error: 'Text not found' });
    }

    // Return cached result if it was translated into the same language
    if (text.parallelTranslation) {
      const cached = JSON.parse(text.parallelTranslation);
      if (cached.targetLanguage === targetLanguage) {
        return res.json({ sentences: cached.sentences, cached: true });
      }
    }

    // Split into sentences the same way the frontend does
    const sentences: string[] = text.content.split(/(?<=[.!?”"»'។])\s+/).filter(s => s.trim().length > 0);

    const numberedList = sentences
      .map((s, i) => `${i + 1}. ${s}`)
      .join('\n');

    const prompt = parallelTranslationPrompt(text.language, targetLanguage, numberedList);

    const agent = createParallelTranslationAgent(text.language, targetLanguage);
    const config = getModelForTask('translation');

    const completion = await agent.generate(prompt, {
      modelSettings: {
        temperature: config.temperature ?? 0.2,
        maxOutputTokens: Math.max(1000, sentences.length * 80)
      },
      structuredOutput: { schema: parallelTextTranslationSchema }
    });

    const result = completion.object ?? { sentences: [] };

    // Persist so future requests are free
    await prisma.generatedText.update({
      where: { id },
      data: {
        parallelTranslation: JSON.stringify({ targetLanguage, sentences: result.sentences })
      }
    });

    res.json({ sentences: result.sentences, cached: false });
}, 'Translation failed'));
