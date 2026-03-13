import { prisma } from './prisma.js';
import { createGameDataAgent, gameWordDataSchema } from './llm/index.js';
import { gameDataPrompt } from './llm/prompts.js';
import type { GameWordData } from './llm/schemas.js';

/** Parse cached game data row from DB to plain object */
export function parseGameDataRow(row: {
  definition: string;
  translation: string;
  distractorDefinitions: string;
  distractorTranslations: string;
  exampleSentences: string;
  falseTranslation: string;
}): GameWordData {
  return {
    definition: row.definition,
    translation: row.translation,
    distractorDefinitions: JSON.parse(row.distractorDefinitions),
    distractorTranslations: JSON.parse(row.distractorTranslations),
    exampleSentences: JSON.parse(row.exampleSentences),
    falseTranslation: row.falseTranslation,
  };
}

/** Fetch cached game data or generate + cache via LLM */
export async function getOrGenerateGameData(
  word: string,
  sourceLanguage: string,
  targetLanguage: string,
  translationHint: string
): Promise<{ cached: boolean; data: GameWordData }> {
  const normalizedWord = word.toLowerCase();
  const normalizedHint = (translationHint || '').toLowerCase().trim();

  const cached = await prisma.gameWordData.findUnique({
    where: {
      word_sourceLanguage_targetLanguage: {
        word: normalizedWord,
        sourceLanguage,
        targetLanguage,
      },
    },
  });

  if (cached) {
    return { cached: true, data: parseGameDataRow(cached) };
  }

  const agent = createGameDataAgent(sourceLanguage, targetLanguage);

  const prompt = gameDataPrompt(normalizedWord, sourceLanguage, targetLanguage, normalizedHint);

  const result = await agent.generate(prompt, {
    structuredOutput: { schema: gameWordDataSchema },
  });

  const generatedData = result.object;

  await prisma.gameWordData.create({
    data: {
      word: normalizedWord,
      sourceLanguage,
      targetLanguage,
      definition: generatedData.definition,
      translation: generatedData.translation,
      distractorDefinitions: JSON.stringify(generatedData.distractorDefinitions),
      distractorTranslations: JSON.stringify(generatedData.distractorTranslations),
      exampleSentences: JSON.stringify(generatedData.exampleSentences),
      falseTranslation: generatedData.falseTranslation,
    },
  });

  return { cached: false, data: generatedData };
}
