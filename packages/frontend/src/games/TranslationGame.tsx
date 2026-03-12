import { useState, useMemo } from 'react';
import type { GameProps } from './types';
import { GameWrapper, FeedbackOverlay, LoadingGame } from './GameWrapper';
import { shuffleArray, pickRandom, getDistractors } from './usePracticeSession';
import { GAME_INFO } from './types';

/**
 * Translation Match Game
 * Shows source word, user picks correct translation
 */
export function TranslationGame({
  words,
  targetLanguage,
  config,
  onAttempt,
  onComplete
}: GameProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  
  const optionCount = config.optionCount || 4;
  const currentWord = words[currentIndex];
  const gameInfo = GAME_INFO.translation;
  
  // Generate options for current word
  const options = useMemo(() => {
    if (!currentWord?.gameData?.translation) return [];
    
    const correctTranslation = currentWord.gameData.translation;
    
    // Get distractors from other words first, then from game data
    let distractors = getDistractors(words, currentWord, optionCount - 1, 'translation');
    
    // Fill with game data distractors if needed
    if (distractors.length < optionCount - 1 && currentWord.gameData) {
      const needed = optionCount - 1 - distractors.length;
      const gameDistractors = pickRandom(
        currentWord.gameData.distractorTranslations.filter(d => !distractors.includes(d)),
        needed
      );
      distractors = [...distractors, ...gameDistractors];
    }
    
    return shuffleArray([correctTranslation, ...distractors]);
  }, [currentWord, optionCount, words]);
  
  // Check if game data is still loading
  if (currentWord?.loading) {
    return <LoadingGame message="Preparing questions..." />;
  }
  
  if (!currentWord?.gameData?.translation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-red-600">This word doesn't have a translation.</p>
      </div>
    );
  }
  
  const handleSelect = (answer: string) => {
    if (selectedAnswer) return;
    
    const correct = answer === currentWord.gameData!.translation;
    setSelectedAnswer(answer);
    setIsCorrect(correct);
    setShowFeedback(true);
    
    if (correct) {
      setCorrectCount(c => c + 1);
    } else {
      setIncorrectCount(c => c + 1);
    }
    
    onAttempt({
      vocabularyWordId: currentWord.vocabularyWord.id,
      isCorrect: correct,
      questionData: { word: currentWord.vocabularyWord.word, options },
      userAnswer: answer,
      correctAnswer: currentWord.gameData!.translation
    });
  };
  
  const handleContinue = () => {
    setShowFeedback(false);
    setSelectedAnswer(null);
    
    if (currentIndex < words.length - 1) {
      setCurrentIndex(i => i + 1);
    } else {
      onComplete();
    }
  };
  
  const handleExit = () => {
    if (confirm('Are you sure you want to exit? Your progress will be saved.')) {
      onComplete();
    }
  };
  
  return (
    <GameWrapper
      gameName={gameInfo.name}
      gameIcon={gameInfo.icon}
      currentIndex={currentIndex}
      totalWords={words.length}
      correctCount={correctCount}
      incorrectCount={incorrectCount}
      onExit={handleExit}
    >
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {/* Word display */}
        <div className="mb-8 text-center">
          <p className="text-sm text-gray-500 mb-2">
            Translate to {targetLanguage}
          </p>
          <h2 className="text-4xl font-bold text-gray-900">
            {currentWord.vocabularyWord.word}
          </h2>
          {currentWord.vocabularyWord.partOfSpeech && (
            <p className="text-sm text-gray-500 mt-2 italic">
              ({currentWord.vocabularyWord.partOfSpeech})
            </p>
          )}
        </div>
        
        {/* Options */}
        <div className="w-full max-w-xl space-y-3">
          {options.map((option, index) => {
            let buttonClass = 'w-full p-4 rounded-lg border-2 text-left transition-all ';
            
            if (selectedAnswer) {
              if (option === currentWord.gameData!.translation) {
                buttonClass += 'border-green-500 bg-green-50 text-green-800';
              } else if (option === selectedAnswer) {
                buttonClass += 'border-red-500 bg-red-50 text-red-800';
              } else {
                buttonClass += 'border-gray-200 bg-gray-50 text-gray-400';
              }
            } else {
              buttonClass += 'border-gray-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer';
            }
            
            return (
              <button
                key={`${currentIndex}-${index}`}
                onClick={() => handleSelect(option)}
                disabled={!!selectedAnswer}
                className={buttonClass}
              >
                <span className="font-medium mr-2">{String.fromCharCode(65 + index)}.</span>
                {option}
              </button>
            );
          })}
        </div>
        
        <p className="mt-8 text-sm text-gray-500">
          {currentIndex + 1} of {words.length}
        </p>
      </div>
      
      {showFeedback && (
        <FeedbackOverlay
          isCorrect={isCorrect}
          correctAnswer={currentWord.gameData!.translation}
          onContinue={handleContinue}
        />
      )}
    </GameWrapper>
  );
}
