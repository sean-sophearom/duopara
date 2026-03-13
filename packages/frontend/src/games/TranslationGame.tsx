import { useMemo } from 'react';
import type { GameProps } from './types';
import { GameWrapper, FeedbackOverlay, LoadingGame } from './GameWrapper';
import { shuffleArray, pickRandom, getDistractors } from './usePracticeSession';
import { GAME_INFO } from './types';
import { useQuizGame } from './useQuizGame';
import { QuizOptions } from './QuizOptions';

export function TranslationGame({ words, targetLanguage, config, onAttempt, onComplete }: GameProps) {
  const quiz = useQuizGame({ words, onAttempt, onComplete });
  const optionCount = config.optionCount || 4;
  const gameInfo = GAME_INFO.translation;
  
  const options = useMemo(() => {
    if (!quiz.currentWord?.gameData?.translation) return [];
    const correctTranslation = quiz.currentWord.gameData.translation;
    let distractors = getDistractors(words, quiz.currentWord, optionCount - 1, 'translation');
    if (distractors.length < optionCount - 1 && quiz.currentWord.gameData) {
      const needed = optionCount - 1 - distractors.length;
      const gameDistractors = pickRandom(
        quiz.currentWord.gameData.distractorTranslations.filter(d => !distractors.includes(d)),
        needed
      );
      distractors = [...distractors, ...gameDistractors];
    }
    return shuffleArray([correctTranslation, ...distractors]);
  }, [quiz.currentWord, optionCount, words]);
  
  if (quiz.currentWord?.loading) return <LoadingGame message="Preparing questions..." />;
  if (!quiz.currentWord?.gameData?.translation) {
    return (
      <div className="min-h-dvh bg-gray-50 flex items-center justify-center">
        <p className="text-red-600">This word doesn't have a translation.</p>
      </div>
    );
  }

  const correctAnswer = quiz.currentWord.gameData!.translation;
  
  return (
    <GameWrapper
      gameName={gameInfo.name}
      gameIcon={gameInfo.icon}
      currentIndex={quiz.currentIndex}
      totalWords={words.length}
      correctCount={quiz.correctCount}
      incorrectCount={quiz.incorrectCount}
      onExit={quiz.handleExit}
    >
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="mb-8 text-center">
          <p className="text-sm text-gray-500 mb-2">Translate to {targetLanguage}</p>
          <h2 className="text-4xl font-bold text-gray-900">{quiz.currentWord.vocabularyWord.word}</h2>
          {quiz.currentWord.vocabularyWord.partOfSpeech && (
            <p className="text-sm text-gray-500 mt-2 italic">({quiz.currentWord.vocabularyWord.partOfSpeech})</p>
          )}
        </div>
        
        <QuizOptions
          options={options}
          selectedAnswer={quiz.selectedAnswer}
          correctAnswer={correctAnswer}
          currentIndex={quiz.currentIndex}
          onSelect={(answer) => quiz.handleSelect(answer, correctAnswer, { word: quiz.currentWord.vocabularyWord.word, options })}
        />
        
        <p className="mt-8 text-sm text-gray-500">{quiz.currentIndex + 1} of {words.length}</p>
      </div>
      
      {quiz.showFeedback && (
        <FeedbackOverlay isCorrect={quiz.isCorrect} correctAnswer={correctAnswer} onContinue={quiz.handleContinue} />
      )}
    </GameWrapper>
  );
}
