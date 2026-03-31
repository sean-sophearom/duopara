import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { asyncHandler } from '../lib/routeUtils.js';

export const settingsRouter = Router();
settingsRouter.use(authenticate);

const updateSettingsSchema = z.object({
  targetLanguage: z.string().optional(),
  nativeLanguage: z.string().optional(),
  knownWordsRatio: z.number().min(0).max(100).optional(),
  defaultDifficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional()
});

// Get settings
settingsRouter.get('/', asyncHandler(async (req: AuthRequest, res) => {
  let settings = await prisma.userSettings.findUnique({ where: { userId: req.userId } });
  if (!settings) {
    settings = await prisma.userSettings.create({ data: { userId: req.userId! } });
  }
  res.json({ settings });
}, 'Failed to get settings'));

// Update settings
settingsRouter.patch('/', asyncHandler(async (req: AuthRequest, res) => {
  const data = updateSettingsSchema.parse(req.body);
  const settings = await prisma.userSettings.upsert({
    where: { userId: req.userId },
    create: { userId: req.userId!, ...data },
    update: data
  });
  res.json({ settings });
}, 'Failed to update settings'));

// Get available languages
settingsRouter.get('/languages', async (_req: AuthRequest, res) => {
  // Supported languages for generation
  const languages = [
    { code: 'Spanish', name: 'Spanish', nativeName: 'Español' },
    { code: 'Vietnamese', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
    // { code: 'Khmer', name: 'Khmer', nativeName: 'ខ្មែរ' },
    // { code: 'French', name: 'French', nativeName: 'Français' },
    // { code: 'German', name: 'German', nativeName: 'Deutsch' },
    // { code: 'Italian', name: 'Italian', nativeName: 'Italiano' },
    // { code: 'Portuguese', name: 'Portuguese', nativeName: 'Português' },
    // { code: 'Dutch', name: 'Dutch', nativeName: 'Nederlands' },
    // { code: 'Russian', name: 'Russian', nativeName: 'Русский' },
    // { code: 'Japanese', name: 'Japanese', nativeName: '日本語' },
    // { code: 'Korean', name: 'Korean', nativeName: '한국어' },
    // { code: 'Chinese', name: 'Chinese (Simplified)', nativeName: '中文' },
    // { code: 'Arabic', name: 'Arabic', nativeName: 'العربية' },
    // { code: 'Hindi', name: 'Hindi', nativeName: 'हिन्दी' },
    // { code: 'Turkish', name: 'Turkish', nativeName: 'Türkçe' },
    // { code: 'Polish', name: 'Polish', nativeName: 'Polski' },
    // { code: 'Swedish', name: 'Swedish', nativeName: 'Svenska' },
    // { code: 'Norwegian', name: 'Norwegian', nativeName: 'Norsk' },
    // { code: 'Danish', name: 'Danish', nativeName: 'Dansk' },
    // { code: 'Finnish', name: 'Finnish', nativeName: 'Suomi' },
    // { code: 'Greek', name: 'Greek', nativeName: 'Ελληνικά' },
    // { code: 'Hebrew', name: 'Hebrew', nativeName: 'עברית' }
  ];

  res.json({ languages });
});
