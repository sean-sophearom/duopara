/**
 * Practice Games Types (shared with web)
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
      optionCount: { min: 2, max: 6, default: 4, label: 'Number of options' }
    }
  },
  translation: {
    type: 'translation',
    name: 'Translation',
    description: 'Select the correct translation for each word',
    icon: '🌍',
    minWords: 1,
    defaultConfig: { optionCount: 4 },
    configOptions: {
      optionCount: { min: 2, max: 6, default: 4, label: 'Number of options' }
    }
  },
  reverse: {
    type: 'reverse',
    name: 'Reverse Translation',
    description: 'Find the word from its translation',
    icon: '🔄',
    minWords: 1,
    defaultConfig: { optionCount: 4 },
    configOptions: {
      optionCount: { min: 2, max: 6, default: 4, label: 'Number of options' }
    }
  },
  fillblank: {
    type: 'fillblank',
    name: 'Fill in the Blank',
    description: 'Complete sentences with the missing word',
    icon: '✍️',
    minWords: 1,
    defaultConfig: { optionCount: 4 },
    configOptions: {
      optionCount: { min: 2, max: 6, default: 4, label: 'Number of options' }
    }
  },
  matching: {
    type: 'matching',
    name: 'Matching Grid',
    description: 'Match words with their translations',
    icon: '🎯',
    minWords: 3,
    defaultConfig: { pairCount: 4 },
    configOptions: {
      pairCount: { min: 3, max: 6, default: 4, label: 'Number of pairs' }
    }
  },
  truefalse: {
    type: 'truefalse',
    name: 'True or False',
    description: 'Swipe to judge if translations are correct',
    icon: '👆',
    minWords: 1,
    defaultConfig: {}
  }
};
