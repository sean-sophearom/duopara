import { Router } from 'express';
import multer from 'multer';
import Papa from 'papaparse';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

export const vocabularyRouter = Router();
vocabularyRouter.use(authenticate);

const upload = multer({ storage: multer.memoryStorage() });

// Schema for adding words
const addWordSchema = z.object({
  word: z.string().min(1),
  language: z.string().min(1),
  translation: z.string().optional(),
  partOfSpeech: z.string().optional(),
  baseForm: z.string().optional(),
  status: z.enum(['learning', 'learned', 'mastered']).optional()
});

const updateWordSchema = z.object({
  status: z.enum(['learning', 'learned', 'mastered']).optional(),
  translation: z.string().optional(),
  partOfSpeech: z.string().optional(),
  baseForm: z.string().optional(),
  timesEncountered: z.number().optional(),
  timesCorrect: z.number().optional()
});

// Get all vocabulary for user
vocabularyRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const { language, status, search, limit, offset } = req.query;
    
    const where: any = { userId: req.userId };
    
    if (language) where.language = language;
    if (status) where.status = status;
    if (search) {
      where.word = { contains: search as string };
    }

    const [words, total] = await Promise.all([
      prisma.vocabularyWord.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: limit ? parseInt(limit as string) : 100,
        skip: offset ? parseInt(offset as string) : 0
      }),
      prisma.vocabularyWord.count({ where })
    ]);

    res.json({ words, total });
  } catch (error) {
    console.error('Get vocabulary error:', error);
    res.status(500).json({ error: 'Failed to get vocabulary' });
  }
});

// Get vocabulary stats
vocabularyRouter.get('/stats', async (req: AuthRequest, res) => {
  try {
    const { language } = req.query;
    const where: any = { userId: req.userId };
    if (language) where.language = language;

    const [total, learning, learned, mastered] = await Promise.all([
      prisma.vocabularyWord.count({ where }),
      prisma.vocabularyWord.count({ where: { ...where, status: 'learning' } }),
      prisma.vocabularyWord.count({ where: { ...where, status: 'learned' } }),
      prisma.vocabularyWord.count({ where: { ...where, status: 'mastered' } })
    ]);

    res.json({ total, learning, learned, mastered });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Get known words (learned + mastered) for text generation
vocabularyRouter.get('/known', async (req: AuthRequest, res) => {
  try {
    const { language } = req.query;
    
    const words = await prisma.vocabularyWord.findMany({
      where: {
        userId: req.userId,
        language: language as string,
        status: { in: ['learned', 'mastered'] }
      },
      select: { word: true, baseForm: true }
    });

    res.json({ 
      words: words.map((w: { word: string }) => w.word),
      baseForms: words.filter((w: { baseForm: string | null }) => w.baseForm).map((w: { baseForm: string | null }) => w.baseForm)
    });
  } catch (error) {
    console.error('Get known words error:', error);
    res.status(500).json({ error: 'Failed to get known words' });
  }
});

// Add a single word
vocabularyRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const data = addWordSchema.parse(req.body);
    
    const word = await prisma.vocabularyWord.upsert({
      where: {
        userId_word_language: {
          userId: req.userId!,
          word: data.word.toLowerCase(),
          language: data.language
        }
      },
      create: {
        userId: req.userId!,
        word: data.word.toLowerCase(),
        language: data.language,
        translation: data.translation,
        partOfSpeech: data.partOfSpeech,
        baseForm: data.baseForm,
        status: data.status || 'learning'
      },
      update: {
        translation: data.translation,
        partOfSpeech: data.partOfSpeech,
        baseForm: data.baseForm,
        status: data.status,
        timesEncountered: { increment: 1 }
      }
    });

    res.status(201).json({ word });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Add word error:', error);
    res.status(500).json({ error: 'Failed to add word' });
  }
});

// Update a word
vocabularyRouter.patch('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const data = updateWordSchema.parse(req.body);
    
    // Verify ownership
    const existing = await prisma.vocabularyWord.findFirst({
      where: { id, userId: req.userId }
    });
    
    if (!existing) {
      return res.status(404).json({ error: 'Word not found' });
    }

    const updateData: any = { ...data };
    if (data.status === 'mastered' && existing.status !== 'mastered') {
      updateData.masteredAt = new Date();
    }

    const word = await prisma.vocabularyWord.update({
      where: { id },
      data: updateData
    });

    res.json({ word });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Update word error:', error);
    res.status(500).json({ error: 'Failed to update word' });
  }
});

// Mark word as learned (convenience endpoint)
vocabularyRouter.post('/mark-learned', async (req: AuthRequest, res) => {
  try {
    const { word, language } = req.body;
    
    const updated = await prisma.vocabularyWord.upsert({
      where: {
        userId_word_language: {
          userId: req.userId!,
          word: word.toLowerCase(),
          language
        }
      },
      create: {
        userId: req.userId!,
        word: word.toLowerCase(),
        language,
        status: 'learned'
      },
      update: {
        status: 'learned'
      }
    });

    res.json({ word: updated });
  } catch (error) {
    console.error('Mark learned error:', error);
    res.status(500).json({ error: 'Failed to mark word as learned' });
  }
});

vocabularyRouter.post('/mark-learning', async (req: AuthRequest, res) => {
  try {
    const { word, language } = req.body;

    const updated = await prisma.vocabularyWord.upsert({
      where: {
        userId_word_language: {
          userId: req.userId!,
          word: word.toLowerCase(),
          language
        }
      },
      create: {
        userId: req.userId!,
        word: word.toLowerCase(),
        language,
        status: 'learning'
      },
      update: {
        status: 'learning'
      }
    });

    res.json({ word: updated });
  } catch (error) {
    console.error('Mark learning error:', error);
    res.status(500).json({ error: 'Failed to mark word as learning' });
  }
});

// Delete a word
vocabularyRouter.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    await prisma.vocabularyWord.deleteMany({
      where: { id, userId: req.userId }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete word error:', error);
    res.status(500).json({ error: 'Failed to delete word' });
  }
});

// Import from CSV (Duolingo format or generic)
vocabularyRouter.post('/import', upload.single('file'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { language } = req.body;
    if (!language) {
      return res.status(400).json({ error: 'Language is required' });
    }

    const csvContent = req.file.buffer.toString('utf-8');
    
    const parsed = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.toLowerCase().trim()
    });

    if (parsed.errors.length > 0) {
      return res.status(400).json({ 
        error: 'CSV parsing errors', 
        details: parsed.errors.slice(0, 5) 
      });
    }

    const words: any[] = [];
    
    for (const row of parsed.data as any[]) {
      // Support multiple CSV formats
      // Duolingo format: word, translation, strength, pos
      // Generic: word, translation, part_of_speech
      const word = row.word || row.lexeme || row.term || Object.values(row)[0];
      const translation = row.translation || row.meaning || row.english;
      const partOfSpeech = row.pos || row.part_of_speech || row.partofspeech;
      const baseForm = row.base || row.baseform || row.lemma;
      
      if (word && typeof word === 'string' && word.trim()) {
        words.push({
          userId: req.userId!,
          word: word.toLowerCase().trim(),
          language,
          translation: translation?.trim() || null,
          partOfSpeech: partOfSpeech?.trim() || null,
          baseForm: baseForm?.trim() || null,
          status: 'learned' // Imported words are considered known
        });
      }
    }

    // Batch upsert
    let imported = 0;
    let skipped = 0;
    
    for (const wordData of words) {
      try {
        await prisma.vocabularyWord.upsert({
          where: {
            userId_word_language: {
              userId: wordData.userId,
              word: wordData.word,
              language: wordData.language
            }
          },
          create: wordData,
          update: {
            translation: wordData.translation || undefined,
            partOfSpeech: wordData.partOfSpeech || undefined,
            baseForm: wordData.baseForm || undefined
          }
        });
        imported++;
      } catch (e) {
        skipped++;
      }
    }

    res.json({ 
      success: true, 
      imported, 
      skipped,
      total: words.length 
    });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: 'Failed to import vocabulary' });
  }
});

// Export vocabulary
vocabularyRouter.get('/export', async (req: AuthRequest, res) => {
  try {
    const { language } = req.query;
    const where: any = { userId: req.userId };
    if (language) where.language = language;

    const words = await prisma.vocabularyWord.findMany({
      where,
      orderBy: { word: 'asc' }
    });

    const csvData = words.map((w: any) => ({
      word: w.word,
      translation: w.translation || '',
      part_of_speech: w.partOfSpeech || '',
      base_form: w.baseForm || '',
      status: w.status,
      times_encountered: w.timesEncountered,
      language: w.language
    }));

    const csv = Papa.unparse(csvData);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=vocabulary.csv');
    res.send(csv);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export vocabulary' });
  }
});
