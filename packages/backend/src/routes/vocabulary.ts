import { Router } from 'express';
import multer from 'multer';
import Papa from 'papaparse';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { asyncHandler } from '../lib/routeUtils.js';
import { MAX_IMPORT_FILE_SIZE, MAX_IMPORT_WORDS, MAX_QUERY_LIMIT } from '../lib/constants.js';

export const vocabularyRouter = Router();
vocabularyRouter.use(authenticate);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMPORT_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

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
  baseForm: z.string().optional()
});

// Get all vocabulary for user
vocabularyRouter.get('/', asyncHandler(async (req: AuthRequest, res) => {
  const { language, status, search, limit, offset } = req.query;
  
  const where: any = { userId: req.userId };
  if (language) where.language = language;
  if (status) where.status = status;
  if (search) where.word = { contains: search as string };

  const [words, total] = await Promise.all([
    prisma.vocabularyWord.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: limit ? Math.min(parseInt(limit as string) || 100, MAX_QUERY_LIMIT) : 100,
      skip: offset ? Math.max(parseInt(offset as string) || 0, 0) : 0
    }),
    prisma.vocabularyWord.count({ where })
  ]);

  res.json({ words, total });
}, 'Failed to get vocabulary'));

// Get vocabulary stats
vocabularyRouter.get('/stats', asyncHandler(async (req: AuthRequest, res) => {
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
}, 'Failed to get stats'));

// Get known words (learned + mastered) for text generation
vocabularyRouter.get('/known', asyncHandler(async (req: AuthRequest, res) => {
  const { language } = req.query;
  const words = await prisma.vocabularyWord.findMany({
    where: { userId: req.userId, language: language as string, status: { in: ['learned', 'mastered'] } },
    select: { word: true, baseForm: true }
  });
  res.json({ 
    words: words.map((w: { word: string }) => w.word),
    baseForms: words.filter((w: { baseForm: string | null }) => w.baseForm).map((w: { baseForm: string | null }) => w.baseForm)
  });
}, 'Failed to get known words'));

// Add a single word
vocabularyRouter.post('/', asyncHandler(async (req: AuthRequest, res) => {
  const data = addWordSchema.parse(req.body);
  const word = await prisma.vocabularyWord.upsert({
    where: { userId_word_language: { userId: req.userId!, word: data.word.toLowerCase(), language: data.language } },
    create: { userId: req.userId!, word: data.word.toLowerCase(), language: data.language, translation: data.translation, partOfSpeech: data.partOfSpeech, baseForm: data.baseForm, status: data.status || 'learning' },
    update: { translation: data.translation, partOfSpeech: data.partOfSpeech, baseForm: data.baseForm, status: data.status, timesEncountered: { increment: 1 } }
  });
  res.status(201).json({ word });
}, 'Failed to add word'));

// Update a word
vocabularyRouter.patch('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const data = updateWordSchema.parse(req.body);
  
  const existing = await prisma.vocabularyWord.findFirst({ where: { id, userId: req.userId } });
  if (!existing) return res.status(404).json({ error: 'Word not found' });

  const updateData: any = { ...data };
  if (data.status === 'mastered' && existing.status !== 'mastered') {
    updateData.masteredAt = new Date();
  }

  const word = await prisma.vocabularyWord.update({ where: { id }, data: updateData });
  res.json({ word });
}, 'Failed to update word'));

// Mark word with a specific status (DRY helper for mark-learned/mark-learning)
const markWordSchema = z.object({
  word: z.string().min(1),
  language: z.string().min(1),
});

function markWordStatus(status: string) {
  return asyncHandler(async (req: AuthRequest, res) => {
    const { word, language } = markWordSchema.parse(req.body);
    const updated = await prisma.vocabularyWord.upsert({
      where: { userId_word_language: { userId: req.userId!, word: word.toLowerCase(), language } },
      create: { userId: req.userId!, word: word.toLowerCase(), language, status },
      update: { status }
    });
    res.json({ word: updated });
  }, `Failed to mark word as ${status}`);
}

vocabularyRouter.post('/mark-learned', markWordStatus('learned'));
vocabularyRouter.post('/mark-learning', markWordStatus('learning'));

// Delete a word
vocabularyRouter.delete('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  await prisma.vocabularyWord.deleteMany({ where: { id, userId: req.userId } });
  res.json({ success: true });
}, 'Failed to delete word'));

// Import from CSV (Duolingo format or generic)
vocabularyRouter.post('/import', upload.single('file'), asyncHandler(async (req: AuthRequest, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const { language } = req.body;
  if (!language) return res.status(400).json({ error: 'Language is required' });

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

    if (words.length > MAX_IMPORT_WORDS) {
      return res.status(400).json({ error: `Too many words. Maximum is ${MAX_IMPORT_WORDS}.` });
    }

    let imported = 0;
    let skipped = 0;

    // Batch upsert in a transaction for performance
    await prisma.$transaction(
      words.map((wordData) =>
        prisma.vocabularyWord.upsert({
          where: {
            userId_word_language: {
              userId: wordData.userId,
              word: wordData.word,
              language: wordData.language,
            },
          },
          create: wordData,
          update: {
            translation: wordData.translation || undefined,
            partOfSpeech: wordData.partOfSpeech || undefined,
            baseForm: wordData.baseForm || undefined,
          },
        })
      )
    ).then(
      (results) => { imported = results.length; },
      () => { skipped = words.length; }
    );

    res.json({ success: true, imported, skipped, total: words.length });
}, 'Failed to import vocabulary'));

// Export vocabulary
vocabularyRouter.get('/export', asyncHandler(async (req: AuthRequest, res) => {
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
}, 'Failed to export vocabulary'));
