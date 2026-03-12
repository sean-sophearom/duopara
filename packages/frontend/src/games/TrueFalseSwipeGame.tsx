import { useState, useMemo, useRef } from 'react';
import type { GameProps } from './types';
import { GameWrapper, FeedbackOverlay, LoadingGame } from './GameWrapper';
import { GAME_INFO } from './types';

/**
 * True/False Swipe Game
 * Shows a word and a proposed translation (may be correct or false)
 * User swipes right for true, left for false
 */
export function TrueFalseSwipeGame({
  words,
  sourceLanguage,
  targetLanguage,
  onAttempt,
  onComplete
}: GameProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  
  // Touch handling
  const cardRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  const currentWord = words[currentIndex];
  const gameInfo = GAME_INFO.truefalse;
  
  // Determine if we show true or false translation (50/50 chance)
  const showCorrect = useMemo(() => Math.random() > 0.5, [currentIndex]);
  
  // Get the translation to display
  const displayedTranslation = useMemo(() => {
    if (!currentWord) return '';
    
    if (showCorrect) {
      return currentWord.gameData?.translation || '';
    } else {
      // Show false translation from game data or another word
      return currentWord.gameData?.falseTranslation || 
             words[(currentIndex + 1) % words.length]?.gameData?.translation ||
             'Unknown';
    }
  }, [currentWord, showCorrect, currentIndex, words]);
  
  // Check if game data is still loading
  if (currentWord?.loading) {
    return <LoadingGame message="Preparing questions..." />;
  }
  
  if (!currentWord?.gameData?.translation) {
    return (
      <div className="min-h-dvh bg-gray-50 flex items-center justify-center">
        <p className="text-red-600">This word doesn't have a translation.</p>
      </div>
    );
  }
  
  const handleAnswer = (userSaysTrue: boolean) => {
    const correct = userSaysTrue === showCorrect;
    setSwipeDirection(userSaysTrue ? 'right' : 'left');
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
        word: currentWord.vocabularyWord.word, 
        displayedTranslation,
        wasCorrectPair: showCorrect 
      },
      userAnswer: userSaysTrue ? 'true' : 'false',
      correctAnswer: showCorrect ? 'true' : 'false'
    });
  };
  
  const handleContinue = () => {
    setShowFeedback(false);
    setSwipeDirection(null);
    setDragOffset(0);
    
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
  
  // Touch/Mouse handlers for swipe
  const handleDragStart = (clientX: number) => {
    if (showFeedback) return;
    startXRef.current = clientX;
    currentXRef.current = clientX;
    setIsDragging(true);
  };
  
  const handleDragMove = (clientX: number) => {
    if (!isDragging || showFeedback) return;
    currentXRef.current = clientX;
    const offset = clientX - startXRef.current;
    setDragOffset(offset);
  };
  
  const handleDragEnd = () => {
    if (!isDragging || showFeedback) return;
    setIsDragging(false);
    
    const threshold = 100;
    if (dragOffset > threshold) {
      handleAnswer(true); // Swipe right = true
    } else if (dragOffset < -threshold) {
      handleAnswer(false); // Swipe left = false
    } else {
      setDragOffset(0);
    }
  };
  
  // Get card style based on drag
  const getCardStyle = () => {
    if (swipeDirection === 'right') {
      return { transform: 'translateX(500px) rotate(20deg)', opacity: 0 };
    }
    if (swipeDirection === 'left') {
      return { transform: 'translateX(-500px) rotate(-20deg)', opacity: 0 };
    }
    if (isDragging) {
      const rotation = dragOffset / 20;
      return { 
        transform: `translateX(${dragOffset}px) rotate(${rotation}deg)`,
        transition: 'none'
      };
    }
    return { transform: 'translateX(0) rotate(0deg)' };
  };
  
  // Get overlay color based on drag direction
  const getOverlayOpacity = () => {
    const opacity = Math.min(Math.abs(dragOffset) / 150, 0.5);
    return opacity;
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
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Instructions */}
        <div className="mb-4 text-center">
          <p className="text-gray-600">
            Is this translation correct?
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Swipe right for <span className="text-green-600 font-medium">TRUE</span>, 
            left for <span className="text-red-600 font-medium">FALSE</span>
          </p>
        </div>
        
        {/* Swipeable card */}
        <div 
          ref={cardRef}
          className="relative w-full max-w-md cursor-grab active:cursor-grabbing"
          onMouseDown={(e) => handleDragStart(e.clientX)}
          onMouseMove={(e) => handleDragMove(e.clientX)}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
          onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
          onTouchMove={(e) => handleDragMove(e.touches[0].clientX)}
          onTouchEnd={handleDragEnd}
        >
          <div 
            className="bg-white rounded-2xl shadow-lg p-8 text-center transition-all duration-300 select-none"
            style={getCardStyle()}
          >
            {/* True overlay */}
            <div 
              className="absolute inset-0 bg-green-500 rounded-2xl flex items-center justify-center transition-opacity"
              style={{ opacity: dragOffset > 0 ? getOverlayOpacity() : 0 }}
            >
              <span className="text-white text-4xl font-bold">TRUE ✓</span>
            </div>
            
            {/* False overlay */}
            <div 
              className="absolute inset-0 bg-red-500 rounded-2xl flex items-center justify-center transition-opacity"
              style={{ opacity: dragOffset < 0 ? getOverlayOpacity() : 0 }}
            >
              <span className="text-white text-4xl font-bold">FALSE ✗</span>
            </div>
            
            {/* Card content */}
            <div className="relative z-10">
              <p className="text-sm text-gray-500 mb-2">{sourceLanguage}</p>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                {currentWord.vocabularyWord.word}
              </h2>
              
              <div className="border-t pt-6">
                <p className="text-sm text-gray-500 mb-2">{targetLanguage}</p>
                <p className="text-2xl text-gray-700">
                  {displayedTranslation}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Button alternatives */}
        <div className="flex gap-4 mt-8">
          <button
            onClick={() => handleAnswer(false)}
            disabled={showFeedback}
            className="px-8 py-4 bg-red-100 text-red-700 rounded-full font-medium hover:bg-red-200 transition-colors flex items-center gap-2"
          >
            <span className="text-2xl">👎</span>
            False
          </button>
          <button
            onClick={() => handleAnswer(true)}
            disabled={showFeedback}
            className="px-8 py-4 bg-green-100 text-green-700 rounded-full font-medium hover:bg-green-200 transition-colors flex items-center gap-2"
          >
            True
            <span className="text-2xl">👍</span>
          </button>
        </div>
        
        <p className="mt-8 text-sm text-gray-500">
          {currentIndex + 1} of {words.length}
        </p>
      </div>
      
      {showFeedback && (
        <FeedbackOverlay
          isCorrect={isCorrect}
          correctAnswer={`${currentWord.vocabularyWord.word} = ${currentWord.gameData!.translation}`}
          onContinue={handleContinue}
        />
      )}
    </GameWrapper>
  );
}
