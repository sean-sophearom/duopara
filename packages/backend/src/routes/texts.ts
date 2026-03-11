import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import {
  createParallelTranslationAgent,
  getModelForTask,
  parallelTextTranslationSchema
} from '../lib/llm/index.js';

export const textsRouter = Router();
textsRouter.use(authenticate);

// Get all texts (History Vault)
textsRouter.get('/', async (req: AuthRequest, res) => {
  try {
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
        take: limit ? parseInt(limit as string) : 20,
        skip: offset ? parseInt(offset as string) : 0,
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
  } catch (error) {
    console.error('Get texts error:', error);
    res.status(500).json({ error: 'Failed to get texts' });
  }
});

// Get single text
textsRouter.get('/:id', async (req: AuthRequest, res) => {
  try {
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

    res.json({
      text: {
        ...text,
        knownWordsUsed: JSON.parse(text.knownWordsUsed),
        newWordsIntroduced: JSON.parse(text.newWordsIntroduced)
      }
    });
  } catch (error) {
    console.error('Get text error:', error);
    res.status(500).json({ error: 'Failed to get text' });
  }
});

// Start a new reading session for existing text
textsRouter.post('/:id/start-session', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    // Verify ownership
    const text = await prisma.generatedText.findFirst({
      where: { id, userId: req.userId }
    });

    if (!text) {
      return res.status(404).json({ error: 'Text not found' });
    }

    const session = await prisma.readingSession.create({
      data: {
        userId: req.userId!,
        textId: id
      }
    });

    res.json({ session });
  } catch (error) {
    console.error('Start session error:', error);
    res.status(500).json({ error: 'Failed to start session' });
  }
});

// Update reading session (track words looked up, marked learned)
textsRouter.patch('/session/:sessionId', async (req: AuthRequest, res) => {
  try {
    const { sessionId } = req.params;
    const { wordsLookedUp, wordsMarkedLearned, completed } = req.body;
    
    const session = await prisma.readingSession.findFirst({
      where: { id: sessionId, userId: req.userId }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

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
  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({ error: 'Failed to update session' });
  }
});

// Delete a text
textsRouter.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    await prisma.generatedText.deleteMany({
      where: { id, userId: req.userId }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete text error:', error);
    res.status(500).json({ error: 'Failed to delete text' });
  }
});

// Translate entire text (parallel / side-by-side) — cached per text+language
textsRouter.post('/:id/translate', async (req: AuthRequest, res) => {
  try {
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
    const sentences: string[] = text.content.split(/(?<=[.!?])\s+/);

    const numberedList = sentences
      .map((s, i) => `${i + 1}. ${s}`)
      .join('\n');

    const prompt = `Translate each of the following ${text.language} sentences into ${targetLanguage}.
Return an array of objects — one per sentence, in the same order.

Sentences:
${numberedList}`;

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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Parallel translate error:', error);
    res.status(500).json({ error: 'Translation failed' });
  }
});
