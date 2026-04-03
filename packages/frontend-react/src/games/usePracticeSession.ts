import { useState, useCallback, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { practiceApi } from '../lib/api';
import { shuffleArray } from '@duopara/shared';
import type { 
  GameType, 
  VocabularyWord, 
  PracticeWord, 
  PracticeSession, 
  PracticeAttempt,
  SessionStats,
  GameConfig
} from './types';
export { shuffleArray } from '@duopara/shared';

interface UsePracticeSessionProps {
  gameType: GameType;
  words: VocabularyWord[];
  sourceLanguage: string;
  targetLanguage: string;
  config: GameConfig;
}

interface UsePracticeSessionReturn {
  // State
  session: PracticeSession | null;
  practiceWords: PracticeWord[];
  currentIndex: number;
  correctCount: number;
  incorrectCount: number;
  isLoading: boolean;
  isComplete: boolean;
  sessionStats: SessionStats | null;
  
  // Actions
  startSession: () => Promise<void>;
  submitAttempt: (attempt: Omit<PracticeAttempt, 'vocabularyWordId'> & { vocabularyWordId: string }) => Promise<void>;
  completeSession: () => Promise<void>;
  nextWord: () => void;
  loadGameData: () => Promise<void>;
}

export function usePracticeSession({
  gameType,
  words,
  sourceLanguage,
  targetLanguage,
  config
}: UsePracticeSessionProps): UsePracticeSessionReturn {
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [practiceWords, setPracticeWords] = useState<PracticeWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  
  const startTimestampRef = useRef<number>(0);
  
  // Start session mutation
  const startSessionMutation = useMutation({
    mutationFn: (data: Parameters<typeof practiceApi.startSession>[0]) => 
      practiceApi.startSession(data)
  });
  
  // Submit attempt mutation
  const submitAttemptMutation = useMutation({
    mutationFn: (data: Parameters<typeof practiceApi.submitAttempt>[0]) =>
      practiceApi.submitAttempt(data)
  });
  
  // Complete session mutation
  const completeSessionMutation = useMutation({
    mutationFn: (sessionId: string) => practiceApi.completeSession(sessionId)
  });
  
  // Batch load game data
  const loadGameData = useCallback(async () => {
    setIsLoading(true);
    
    // Initialize practice words with loading state
    const initialWords: PracticeWord[] = words.map(w => ({
      vocabularyWord: w,
      gameData: null,
      loading: true
    }));
    setPracticeWords(initialWords);
    
    try {
      // Batch fetch game data
      const response = await practiceApi.getGameDataBatch({
        words: words.map(w => ({ 
          word: w.word, 
          translation: w.translation || '' 
        })),
        sourceLanguage,
        targetLanguage
      });
      
      const results = response.data.results;
      
      // Update practice words with game data
      setPracticeWords(words.map(w => {
        const result = results[w.word];
        return {
          vocabularyWord: w,
          gameData: result?.data || null,
          loading: false,
          error: result?.error
        };
      }));
    } catch (error) {
      console.error('Failed to load game data:', error);
      setPracticeWords(words.map(w => ({
        vocabularyWord: w,
        gameData: null,
        loading: false,
        error: 'Failed to load'
      })));
    } finally {
      setIsLoading(false);
    }
  }, [words, sourceLanguage, targetLanguage]);
  
  // Start a new session
  const startSession = useCallback(async () => {
    try {
      const response = await startSessionMutation.mutateAsync({
        gameType,
        sourceLanguage,
        targetLanguage,
        wordIds: words.map(w => w.id),
        config
      });
      
      setSession(response.data.session);
      setCurrentIndex(0);
      setCorrectCount(0);
      setIncorrectCount(0);
      setIsComplete(false);
      setSessionStats(null);
      startTimestampRef.current = Date.now();
      
      // Load game data after starting session
      await loadGameData();
    } catch (error) {
      console.error('Failed to start session:', error);
      throw error;
    }
  }, [gameType, sourceLanguage, targetLanguage, words, config, startSessionMutation, loadGameData]);
  
  // Submit an attempt
  const submitAttempt = useCallback(async (
    attempt: Omit<PracticeAttempt, 'vocabularyWordId'> & { vocabularyWordId: string }
  ) => {
    if (!session) return;
    
    const responseTimeMs = Date.now() - startTimestampRef.current;
    
    try {
      await submitAttemptMutation.mutateAsync({
        sessionId: session.id,
        vocabularyWordId: attempt.vocabularyWordId,
        isCorrect: attempt.isCorrect,
        responseTimeMs,
        questionData: attempt.questionData,
        userAnswer: attempt.userAnswer,
        correctAnswer: attempt.correctAnswer
      });
      
      if (attempt.isCorrect) {
        setCorrectCount(c => c + 1);
      } else {
        setIncorrectCount(c => c + 1);
      }
      
      // Reset timer for next word
      startTimestampRef.current = Date.now();
    } catch (error) {
      console.error('Failed to submit attempt:', error);
    }
  }, [session, submitAttemptMutation]);
  
  // Move to next word
  const nextWord = useCallback(() => {
    if (currentIndex < practiceWords.length - 1) {
      setCurrentIndex(i => i + 1);
      startTimestampRef.current = Date.now();
    }
  }, [currentIndex, practiceWords.length]);
  
  // Complete the session
  const completeSession = useCallback(async () => {
    if (!session) return;
    
    try {
      const response = await completeSessionMutation.mutateAsync(session.id);
      setSessionStats(response.data.stats);
      setIsComplete(true);
    } catch (error) {
      console.error('Failed to complete session:', error);
    }
  }, [session, completeSessionMutation]);
  
  return {
    session,
    practiceWords,
    currentIndex,
    correctCount,
    incorrectCount,
    isLoading,
    isComplete,
    sessionStats,
    startSession,
    submitAttempt,
    completeSession,
    nextWord,
    loadGameData
  };
}

// Utility to pick random items from array
export function pickRandom<T>(array: T[], count: number, exclude?: T[]): T[] {
  const filtered = exclude 
    ? array.filter(item => !exclude.includes(item))
    : array;
  const shuffled = shuffleArray(filtered);
  return shuffled.slice(0, count);
}

// Utility to get distractors for a word from other words in the session
export function getDistractors(
  allWords: PracticeWord[],
  currentWord: PracticeWord,
  count: number,
  type: 'translation' | 'word'
): string[] {
  const others = allWords.filter(w => w.vocabularyWord.id !== currentWord.vocabularyWord.id);
  const shuffled = shuffleArray(others);
  
  const distractors: string[] = [];
  
  for (const word of shuffled) {
    if (distractors.length >= count) break;
    
    const value = type === 'translation' 
      ? word.gameData?.translation 
      : word.vocabularyWord.word;
    
    if (value && !distractors.includes(value)) {
      distractors.push(value);
    }
  }
  
  // If we don't have enough from session words, use game data distractors
  if (distractors.length < count && currentWord.gameData) {
    const gameDistractors = type === 'translation'
      ? currentWord.gameData.distractorTranslations
      : []; // For words, we'd need source language distractors
    
    for (const d of gameDistractors) {
      if (distractors.length >= count) break;
      if (!distractors.includes(d)) {
        distractors.push(d);
      }
    }
  }
  
  return distractors.slice(0, count);
}
