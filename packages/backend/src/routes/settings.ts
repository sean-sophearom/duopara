import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { asyncHandler } from '../lib/routeUtils.js';
import { NATIVE_LANGUAGE_OPTIONS, TARGET_LANGUAGE_OPTIONS } from '../lib/languages.js';

export const settingsRouter = Router();

// Get available language choices. Target languages are generation-ready; native
// languages are translation UI choices and can be configured independently.
settingsRouter.get('/languages', async (_req: AuthRequest, res) => {
  res.json({
    languages: TARGET_LANGUAGE_OPTIONS,
    nativeLanguages: NATIVE_LANGUAGE_OPTIONS,
  });
});

settingsRouter.use(authenticate);

const updateSettingsSchema = z.object({
  targetLanguage: z.string().optional(),
  nativeLanguage: z.string().optional(),
  knownWordsRatio: z.number().min(0).max(100).optional(),
  defaultDifficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional()
});

function sameLanguage(a: string | undefined, b: string | undefined) {
  return a?.trim().toLowerCase() === b?.trim().toLowerCase();
}

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
  const existingSettings = await prisma.userSettings.findUnique({ where: { userId: req.userId } });
  const nextTargetLanguage = data.targetLanguage ?? existingSettings?.targetLanguage ?? 'Spanish';
  const nextNativeLanguage = data.nativeLanguage ?? existingSettings?.nativeLanguage ?? 'English';

  if (sameLanguage(nextTargetLanguage, nextNativeLanguage)) {
    return res.status(400).json({ error: 'Target language and native language must be different' });
  }

  const settings = await prisma.userSettings.upsert({
    where: { userId: req.userId },
    create: { userId: req.userId!, ...data },
    update: data
  });
  res.json({ settings });
}, 'Failed to update settings'));
