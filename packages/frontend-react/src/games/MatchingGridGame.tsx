import { useState, useMemo, useEffect, useRef } from 'react';
import type { GameProps } from './types';
import { GameWrapper, LoadingGame } from './GameWrapper';
import { shuffleArray } from './usePracticeSession';
import { GAME_INFO } from './types';

interface Tile {
  id: string;
  content: string;
  type: 'word' | 'translation';
  wordId: string;
  matched: boolean;
}

/**
 * Matching Grid Game
 * Shows a grid of words and translations, user matches pairs
 */
export function MatchingGridGame({
  words,
  sourceLanguage,
  targetLanguage,
  config,
  onAttempt,
  onComplete
}: GameProps) {
  const pairCount = config.pairCount || 5;
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [selectedTile, setSelectedTile] = useState<Tile | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set());
  const [wrongPair, setWrongPair] = useState<[string, string] | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const completionFiredRef = useRef(false);
  
  const gameInfo = GAME_INFO.matching;
  
  // Check if any word is still loading
  const isLoading = words.some(w => w.loading);
  
  // Get words for this round (limited by pairCount)
  const gameWords = useMemo(() => {
    const validWords = words.filter(w => w.gameData?.translation);
    return validWords.slice(0, pairCount);
  }, [words, pairCount]);
  
  // Generate tiles
  const tiles = useMemo(() => {
    const allTiles: Tile[] = [];
    
    gameWords.forEach(word => {
      allTiles.push({
        id: `word-${word.vocabularyWord.id}`,
        content: word.vocabularyWord.word,
        type: 'word',
        wordId: word.vocabularyWord.id,
        matched: false
      });
      allTiles.push({
        id: `trans-${word.vocabularyWord.id}`,
        content: word.gameData!.translation,
        type: 'translation',
        wordId: word.vocabularyWord.id,
        matched: false
      });
    });
    
    return shuffleArray(allTiles);
  }, [gameWords]);
  
  // Check if all pairs are matched
  useEffect(() => {
    if (completionFiredRef.current) return;
    if (matchedPairs.size === gameWords.length && gameWords.length > 0) {
      completionFiredRef.current = true;
      setIsComplete(true);
      // Submit all attempts at once
      gameWords.forEach(word => {
        onAttempt({
          vocabularyWordId: word.vocabularyWord.id,
          isCorrect: true,
          questionData: { gameType: 'matching', pairCount },
          userAnswer: word.gameData!.translation,
          correctAnswer: word.gameData!.translation
        });
      });
      
      setTimeout(() => {
        onComplete();
      }, 1000);
    }
  }, [matchedPairs, gameWords, onComplete, onAttempt, pairCount]);
  
  // Clear wrong pair highlight after animation
  useEffect(() => {
    if (wrongPair) {
      const timer = setTimeout(() => {
        setWrongPair(null);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [wrongPair]);
  
  if (isLoading) {
    return <LoadingGame message="Preparing matching game..." />;
  }
  
  if (gameWords.length < 2) {
    return (
      <div className="min-h-dvh bg-gray-50 flex items-center justify-center">
        <p className="text-red-600">Not enough words with translations for matching game.</p>
      </div>
    );
  }
  
  const handleTileClick = (tile: Tile) => {
    // Can't select matched tiles
    if (matchedPairs.has(tile.wordId)) return;
    
    // If no tile selected, select this one
    if (!selectedTile) {
      setSelectedTile(tile);
      return;
    }
    
    // If clicking the same tile, deselect
    if (selectedTile.id === tile.id) {
      setSelectedTile(null);
      return;
    }
    
    // If clicking same type (word-word or trans-trans), switch selection
    if (selectedTile.type === tile.type) {
      setSelectedTile(tile);
      return;
    }
    
    // Check for match
    if (selectedTile.wordId === tile.wordId) {
      // Correct match!
      setMatchedPairs(prev => new Set([...prev, tile.wordId]));
      setCorrectCount(c => c + 1);
      setSelectedTile(null);
    } else {
      // Wrong match
      setWrongPair([selectedTile.id, tile.id]);
      setIncorrectCount(c => c + 1);
      setSelectedTile(null);
      
      // Record the incorrect attempt
      const word = gameWords.find(w => w.vocabularyWord.id === selectedTile.wordId);
      if (word) {
        onAttempt({
          vocabularyWordId: word.vocabularyWord.id,
          isCorrect: false,
          questionData: { gameType: 'matching', selectedPair: [selectedTile.content, tile.content] },
          userAnswer: tile.content,
          correctAnswer: word.gameData!.translation
        });
      }
    }
  };
  
  const handleExit = () => {
    if (confirm('Are you sure you want to exit? Your progress will be saved.')) {
      onComplete();
    }
  };
  
  const getTileStyle = (tile: Tile) => {
    const isMatched = matchedPairs.has(tile.wordId);
    const isSelected = selectedTile?.id === tile.id;
    const isWrong = wrongPair?.includes(tile.id);
    
    let baseClass = 'p-4 rounded-xl text-center font-medium transition-all duration-200 ';
    
    if (isMatched) {
      baseClass += 'bg-green-100 text-green-800 border-2 border-green-300 opacity-60';
    } else if (isWrong) {
      baseClass += 'bg-red-100 text-red-800 border-2 border-red-500 animate-shake';
    } else if (isSelected) {
      baseClass += 'bg-blue-100 text-blue-800 border-2 border-blue-500 scale-105';
    } else {
      baseClass += 'bg-white text-gray-800 border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer';
    }
    
    return baseClass;
  };
  
  // Determine grid columns based on pair count (pair count equals half the tiles)
  // 3 pairs = 6 tiles → 3x2, 4 pairs = 8 tiles → 4x2, 5 pairs = 10 tiles → 5x2  
  const gridCols = gameWords.length === 3 ? 'grid-cols-3' : 
                   gameWords.length === 4 ? 'grid-cols-4' : 
                   'grid-cols-5';
  
  return (
    <GameWrapper
      gameName={gameInfo.name}
      gameIcon={gameInfo.icon}
      currentIndex={matchedPairs.size}
      totalWords={gameWords.length}
      correctCount={correctCount}
      incorrectCount={incorrectCount}
      onExit={handleExit}
    >
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {/* Instructions */}
        <div className="mb-6 text-center">
          <p className="text-gray-600">
            Match each {sourceLanguage} word with its {targetLanguage} translation
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {matchedPairs.size} of {gameWords.length} pairs matched
          </p>
        </div>
        
        {/* Grid */}
        <div className={`grid ${gridCols} gap-3 max-w-4xl w-full`}>
          {tiles.map(tile => (
            <button
              key={tile.id}
              onClick={() => handleTileClick(tile)}
              disabled={matchedPairs.has(tile.wordId) || isComplete}
              className={getTileStyle(tile)}
            >
              <span className="block text-xs text-gray-400 mb-1">
                {tile.type === 'word' ? sourceLanguage : targetLanguage}
              </span>
              {tile.content}
            </button>
          ))}
        </div>
        
        {/* Completion message */}
        {isComplete && (
          <div className="mt-6 p-4 bg-green-100 rounded-lg text-green-800 text-center">
            <p className="text-xl font-bold">All pairs matched!</p>
          </div>
        )}
      </div>
      
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out 2;
        }
      `}</style>
    </GameWrapper>
  );
}
