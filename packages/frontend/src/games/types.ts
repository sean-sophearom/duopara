/**
 * Practice Games Types
 */

export type GameType = 'definition' | 'translation' | 'reverse' | 'fillblank' | 'matching' | 'truefalse';

export type VocabularyStatus = 'learning' | 'learned' | 'mastered';

export interface VocabularyWord {
  id: string;
  word: string;
  language: string;
  translation: string | null;
  partOfSpeech: string | null;
  baseForm: string | null;
  status: VocabularyStatus;
  timesEncountered: number;
  timesCorrect: number;
  lastPracticedAt: string | null;
  practiceStreak: number;
  nextPracticeAt: string | null;
  difficultyScore: number;
}

export interface GameWordData {
  definition: string;
  translation: string;
  distractorDefinitions: string[];
  distractorTranslations: string[];
  exampleSentences: Array<{
    sentence: string;
    blankWord: string;
    fullSentence: string;
  }>;
  falseTranslation: string;
}

export interface PracticeWord {
  vocabularyWord: VocabularyWord;
  gameData: GameWordData | null;
  loading?: boolean;
  error?: string;
}

export interface PracticeSession {
  id: string;
  gameType: GameType;
  sourceLanguage: string;
  targetLanguage: string;
  totalWords: number;
  correctCount: number;
  incorrectCount: number;
  startedAt: string;
  completedAt: string | null;
}

export interface PracticeAttempt {
  vocabularyWordId: string;
  isCorrect: boolean;
  responseTimeMs?: number;
  questionData: any;
  userAnswer: string;
  correctAnswer: string;
}

export interface SessionStats {
  accuracy: number;
  totalTimeMs: number;
  avgTimeMs: number;
  correctCount: number;
  incorrectCount: number;
}

export interface GameConfig {
  optionCount?: number;
  pairCount?: number;
}

export interface GameInfo {
  type: GameType;
  name: string;
  description: string;
  icon: string;
  minWords: number;
  defaultConfig: GameConfig;
  configOptions?: {
    optionCount?: { min: number; max: number; default: number; label: string };
    pairCount?: { min: number; max: number; default: number; label: string };
  };
}

export const GAME_INFO: Record<GameType, GameInfo> = {
  definition: {
    type: 'definition',
    name: 'Definition Match',
    description: 'Choose the correct definition for each word',
    icon: '📖',
    minWords: 1,
    defaultConfig: { optionCount: 4 },
    configOptions: {
      optionCount: { min: 3, max: 6, default: 4, label: 'Number of choices' },
    },
  },
  translation: {
    type: 'translation',
    name: 'Translation Match',
    description: 'Choose the correct translation for each word',
    icon: '🔄',
    minWords: 1,
    defaultConfig: { optionCount: 4 },
    configOptions: {
      optionCount: { min: 3, max: 6, default: 4, label: 'Number of choices' },
    },
  },
  reverse: {
    type: 'reverse',
    name: 'Reverse Translation',
    description: 'See the translation, choose the original word',
    icon: '↩️',
    minWords: 1,
    defaultConfig: { optionCount: 4 },
    configOptions: {
      optionCount: { min: 3, max: 6, default: 4, label: 'Number of choices' },
    },
  },
  fillblank: {
    type: 'fillblank',
    name: 'Fill in the Blank',
    description: 'Choose the word that completes the sentence',
    icon: '✏️',
    minWords: 1,
    defaultConfig: { optionCount: 4 },
    configOptions: {
      optionCount: { min: 3, max: 6, default: 4, label: 'Number of choices' },
    },
  },
  matching: {
    type: 'matching',
    name: 'Matching Grid',
    description: 'Match words with their translations',
    icon: '🎯',
    minWords: 3,
    defaultConfig: { pairCount: 4 },
    configOptions: {
      pairCount: { min: 3, max: 5, default: 4, label: 'Grid size' },
    },
  },
  truefalse: {
    type: 'truefalse',
    name: 'True or False',
    description: 'Swipe right if the translation is correct, left if wrong',
    icon: '👈👉',
    minWords: 1,
    defaultConfig: {},
  },
};

export interface GameProps {
  words: PracticeWord[];
  sourceLanguage: string;
  targetLanguage: string;
  config: GameConfig;
  onAttempt: (attempt: Omit<PracticeAttempt, 'vocabularyWordId'> & { vocabularyWordId: string }) => void;
  onComplete: () => void;
}
