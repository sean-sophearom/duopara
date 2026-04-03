import { useState, useMemo } from 'react';
import type { GameProps } from './types';
import { GameWrapper, FeedbackOverlay, LoadingGame } from './GameWrapper';
import { shuffleArray, getDistractors } from './usePracticeSession';
import { GAME_INFO } from './types';
import { useQuizGame } from './useQuizGame';
import { QuizOptions } from './QuizOptions';

export function FillBlankGame({ words, config, onAttempt, onComplete }: GameProps) {
  const quiz = useQuizGame({ words, onAttempt, onComplete });
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const optionCount = config.optionCount || 4;
  const gameInfo = GAME_INFO.fillblank;
  
  const currentSentence = useMemo(() => {
    if (!quiz.currentWord?.gameData?.exampleSentences?.length) return null;
    const sentences = quiz.currentWord.gameData.exampleSentences;
    return sentences[sentenceIndex % sentences.length];
  }, [quiz.currentWord, sentenceIndex]);
  
  const options = useMemo(() => {
    if (!currentSentence) return [];
    const correctWord = currentSentence.blankWord;
    const distractors = getDistractors(words, quiz.currentWord, optionCount - 1, 'word');
    return shuffleArray([correctWord, ...distractors]);
  }, [quiz.currentWord, currentSentence, optionCount, words]);
  
  if (quiz.currentWord?.loading) return <LoadingGame message="Preparing sentences..." />;
  if (!quiz.currentWord?.gameData?.exampleSentences?.length) {
    return (
      <div className="min-h-dvh bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-600 mb-4">No example sentences available for this word.</p>
          <button
            onClick={() => {
              if (quiz.currentIndex < words.length - 1) {
                setSentenceIndex(0);
                quiz.handleContinue();
              } else {
                onComplete();
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Skip to next
          </button>
        </div>
      </div>
    );
  }

  const correctAnswer = currentSentence!.blankWord;

  // Override handleContinue to reset sentenceIndex
  const handleContinue = () => {
    setSentenceIndex(0);
    quiz.handleContinue();
  };

  const renderSentence = (sentence: string) => {
    const parts = sentence.split('___');
    return (
      <span>
        {parts[0]}
        <span className="inline-block min-w-[80px] border-b-2 border-blue-500 mx-1 text-center text-transparent">
          {quiz.selectedAnswer || '____'}
        </span>
        {parts[1]}
      </span>
    );
  };
  
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
        <div className="mb-8 text-center max-w-2xl">
          <p className="text-sm text-gray-500 mb-4">Fill in the blank:</p>
          <p className="text-2xl text-gray-900 leading-relaxed">
            {renderSentence(currentSentence!.sentence)}
          </p>
          {quiz.currentWord.gameData?.translation && (
            <p className="mt-4 text-sm text-gray-500 invisible">
              Hint: The word means "{quiz.currentWord.gameData.translation}"
            </p>
          )}
        </div>
        
        <QuizOptions
          options={options}
          selectedAnswer={quiz.selectedAnswer}
          correctAnswer={correctAnswer}
          currentIndex={quiz.currentIndex}
          onSelect={(answer) => quiz.handleSelect(answer, correctAnswer, {
            sentence: currentSentence!.sentence,
            fullSentence: currentSentence!.fullSentence,
            options,
          })}
          layout="grid"
          showLetters={false}
        />
        
        <p className="mt-8 text-sm text-gray-500">{quiz.currentIndex + 1} of {words.length}</p>
      </div>
      
      {quiz.showFeedback && (
        <FeedbackOverlay
          isCorrect={quiz.isCorrect}
          correctAnswer={`${currentSentence!.blankWord} — "${currentSentence!.fullSentence}"`}
          onContinue={handleContinue}
        />
      )}
    </GameWrapper>
  );
}
