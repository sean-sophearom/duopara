import { useState, useCallback } from 'react';
import type { PracticeWord, PracticeAttempt } from './types';

interface UseQuizGameProps {
  words: PracticeWord[];
  onAttempt: (attempt: PracticeAttempt) => void;
  onComplete: () => void;
}

export function useQuizGame({ words, onAttempt, onComplete }: UseQuizGameProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const currentWord = words[currentIndex];

  const handleSelect = useCallback(
    (
      answer: string,
      correctAnswer: string,
      questionData: any
    ) => {
      if (selectedAnswer) return;

      const correct = answer === correctAnswer;
      setSelectedAnswer(answer);
      setIsCorrect(correct);
      setShowFeedback(true);

      if (correct) {
        setCorrectCount((c) => c + 1);
      } else {
        setIncorrectCount((c) => c + 1);
      }

      onAttempt({
        vocabularyWordId: currentWord.vocabularyWord.id,
        isCorrect: correct,
        questionData,
        userAnswer: answer,
        correctAnswer,
      });
    },
    [selectedAnswer, currentWord, onAttempt]
  );

  const handleContinue = useCallback(() => {
    setShowFeedback(false);
    setSelectedAnswer(null);

    if (currentIndex < words.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      onComplete();
    }
  }, [currentIndex, words.length, onComplete]);

  const handleExit = useCallback(() => {
    if (confirm('Are you sure you want to exit? Your progress will be saved.')) {
      onComplete();
    }
  }, [onComplete]);

  return {
    currentIndex,
    currentWord,
    correctCount,
    incorrectCount,
    selectedAnswer,
    showFeedback,
    isCorrect,
    handleSelect,
    handleContinue,
    handleExit,
  };
}
