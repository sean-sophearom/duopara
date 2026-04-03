export interface WordInfo {
  word: string;
  translation: string;
  alternativeTranslations?: string[];
  partOfSpeech?: string;
  baseForm?: string;
  conjugation?: { tense?: string; person?: string; mood?: string };
  contextualNote?: string;
  gender?: string;
}

export interface SentenceInfo {
  sentence: string;
  translation: string;
  grammarNotes?: { element: string; explanation: string }[];
  literalTranslation?: string;
}

export interface HoveredWord {
  word: string;
  sentence: string;
  target: HTMLElement;
}

export interface ParallelTranslation {
  translation: string;
  literalTranslation?: string;
}

export interface AlignmentPair {
  s: string;
  t: string;
}

export interface EnhancedTranslation {
  pairs: AlignmentPair[];
}

export interface ReadingText {
  id: string;
  title: string;
  topic: string;
  content: string;
  language: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  wordCount: number;
  knownWordsUsed?: string[];
  newWordsIntroduced?: string[];
  readingSessions?: ReadingSession[];
}

export interface ReadingSession {
  id: string;
  startedAt: string;
  completedAt?: string;
  wordsLookedUp?: string[];
  wordsMarkedLearned?: string[];
}
