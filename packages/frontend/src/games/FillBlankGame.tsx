import { useState, useMemo } from 'react';
import type { GameProps } from './types';
import { GameWrapper, FeedbackOverlay, LoadingGame } from './GameWrapper';
import { shuffleArray, getDistractors } from './usePracticeSession';
import { GAME_INFO } from './types';

/**
 * Fill in the Blank Game
 * Shows a sentence with a blank, user picks the correct word
 */
export function FillBlankGame({
  words,
  sourceLanguage,
  targetLanguage,
  config,
  onAttempt,
  onComplete
}: GameProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  
  const optionCount = config.optionCount || 4;
  const currentWord = words[currentIndex];
  const gameInfo = GAME_INFO.fillblank;
  
  // Get current sentence
  const currentSentence = useMemo(() => {
    if (!currentWord?.gameData?.exampleSentences?.length) return null;
    const sentences = currentWord.gameData.exampleSentences;
    return sentences[sentenceIndex % sentences.length];
  }, [currentWord, sentenceIndex]);
  
  // Generate options for current word
  const options = useMemo(() => {
    if (!currentSentence) return [];
    
    const correctWord = currentSentence.blankWord;
    
    // Get distractors from other words
    const distractors = getDistractors(words, currentWord, optionCount - 1, 'word');
    
    return shuffleArray([correctWord, ...distractors]);
  }, [currentWord, currentSentence, optionCount, words]);
  
  // Check if game data is still loading
  if (currentWord?.loading) {
    return <LoadingGame message="Preparing sentences..." />;
  }
  
  if (!currentWord?.gameData?.exampleSentences?.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-600 mb-4">No example sentences available for this word.</p>
          <button 
            onClick={() => {
              if (currentIndex < words.length - 1) {
                setCurrentIndex(i => i + 1);
                setSentenceIndex(0);
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
  
  const handleSelect = (answer: string) => {
    if (selectedAnswer || !currentSentence) return;
    
    const correct = answer === currentSentence.blankWord;
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
      questionData: { 
        sentence: currentSentence.sentence, 
        fullSentence: currentSentence.fullSentence,
        options 
      },
      userAnswer: answer,
      correctAnswer: currentSentence.blankWord
    });
  };
  
  const handleContinue = () => {
    setShowFeedback(false);
    setSelectedAnswer(null);
    
    if (currentIndex < words.length - 1) {
      setCurrentIndex(i => i + 1);
      setSentenceIndex(0);
    } else {
      onComplete();
    }
  };
  
  const handleExit = () => {
    if (confirm('Are you sure you want to exit? Your progress will be saved.')) {
      onComplete();
    }
  };
  
  // Render sentence with highlighted blank
  const renderSentence = (sentence: string) => {
    const parts = sentence.split('___');
    return (
      <span>
        {parts[0]}
        <span className="inline-block min-w-[80px] border-b-2 border-blue-500 mx-1 text-center">
          {selectedAnswer || '____'}
        </span>
        {parts[1]}
      </span>
    );
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
        {/* Sentence display */}
        <div className="mb-8 text-center max-w-2xl">
          <p className="text-sm text-gray-500 mb-4">Fill in the blank:</p>
          <p className="text-2xl text-gray-900 leading-relaxed">
            {renderSentence(currentSentence!.sentence)}
          </p>
          
          {/* Show translation hint */}
          {currentWord.vocabularyWord.translation && (
            <p className="mt-4 text-sm text-gray-500">
              Hint: The word means "{currentWord.vocabularyWord.translation}"
            </p>
          )}
        </div>
        
        {/* Options */}
        <div className="w-full max-w-xl grid grid-cols-2 gap-3">
          {options.map((option, index) => {
            let buttonClass = 'p-4 rounded-lg border-2 text-center transition-all ';
            
            if (selectedAnswer) {
              if (option === currentSentence!.blankWord) {
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
                key={index}
                onClick={() => handleSelect(option)}
                disabled={!!selectedAnswer}
                className={buttonClass}
              >
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
          correctAnswer={`${currentSentence!.blankWord} — "${currentSentence!.fullSentence}"`}
          onContinue={handleContinue}
        />
      )}
    </GameWrapper>
  );
}
