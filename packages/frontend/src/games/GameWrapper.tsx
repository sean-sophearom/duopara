import { ReactNode } from 'react';
import { X, ChevronLeft } from 'lucide-react';
import type { SessionStats } from './types';

interface GameWrapperProps {
  gameName: string;
  gameIcon: string;
  currentIndex: number;
  totalWords: number;
  correctCount: number;
  incorrectCount: number;
  children: ReactNode;
  onExit: () => void;
}

export function GameWrapper({
  gameName,
  gameIcon,
  currentIndex,
  totalWords,
  correctCount,
  incorrectCount,
  children,
  onExit
}: GameWrapperProps) {
  const progress = totalWords > 0 ? ((currentIndex) / totalWords) * 100 : 0;
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={onExit}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Exit</span>
          </button>
          
          <div className="flex items-center gap-2">
            <span className="text-xl">{gameIcon}</span>
            <span className="font-medium">{gameName}</span>
          </div>
          
          <div className="flex items-center gap-3 text-sm">
            <span className="text-green-600 font-medium">{correctCount} ✓</span>
            <span className="text-red-600 font-medium">{incorrectCount} ✗</span>
          </div>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="bg-gray-200 h-2">
        <div 
          className="bg-blue-500 h-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {/* Game content */}
      <div className="flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
}

interface SessionResultsProps {
  stats: SessionStats;
  gameIcon: string;
  gameName: string;
  onPlayAgain: () => void;
  onExit: () => void;
}

export function SessionResults({ 
  stats, 
  gameIcon, 
  gameName, 
  onPlayAgain, 
  onExit 
}: SessionResultsProps) {
  const getGrade = (accuracy: number) => {
    if (accuracy >= 90) return { grade: 'A', color: 'text-green-600', message: 'Excellent!' };
    if (accuracy >= 80) return { grade: 'B', color: 'text-blue-600', message: 'Great job!' };
    if (accuracy >= 70) return { grade: 'C', color: 'text-yellow-600', message: 'Good effort!' };
    if (accuracy >= 60) return { grade: 'D', color: 'text-orange-600', message: 'Keep practicing!' };
    return { grade: 'F', color: 'text-red-600', message: 'Try again!' };
  };
  
  const { grade, color, message } = getGrade(stats.accuracy);
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
        <div className="text-6xl mb-4">{gameIcon}</div>
        <h2 className="text-2xl font-bold mb-2">{gameName} Complete!</h2>
        <p className="text-gray-600 mb-6">{message}</p>
        
        {/* Grade circle */}
        <div className={`w-24 h-24 rounded-full ${color} bg-gray-100 flex items-center justify-center mx-auto mb-6`}>
          <span className="text-5xl font-bold">{grade}</span>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-3xl font-bold text-blue-600">{stats.accuracy}%</div>
            <div className="text-sm text-gray-600">Accuracy</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-3xl font-bold text-purple-600">
              {stats.avgTimeMs ? `${(stats.avgTimeMs / 1000).toFixed(1)}s` : '-'}
            </div>
            <div className="text-sm text-gray-600">Avg Time</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-3xl font-bold text-green-600">{stats.correctCount}</div>
            <div className="text-sm text-gray-600">Correct</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-3xl font-bold text-red-600">{stats.incorrectCount}</div>
            <div className="text-sm text-gray-600">Incorrect</div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onExit}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Back to Practice
          </button>
          <button
            onClick={onPlayAgain}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
}

interface FeedbackOverlayProps {
  isCorrect: boolean;
  correctAnswer: string;
  onContinue: () => void;
}

export function FeedbackOverlay({ isCorrect, correctAnswer, onContinue }: FeedbackOverlayProps) {
  return (
    <div 
      className={`fixed inset-0 flex items-end justify-center z-50 ${
        isCorrect ? 'bg-green-500/20' : 'bg-red-500/20'
      }`}
      onClick={onContinue}
    >
      <div 
        className={`w-full max-w-2xl p-6 rounded-t-2xl ${
          isCorrect ? 'bg-green-500' : 'bg-red-500'
        } text-white`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{isCorrect ? '✓' : '✗'}</span>
            <span className="text-xl font-bold">
              {isCorrect ? 'Correct!' : 'Incorrect'}
            </span>
          </div>
        </div>
        {!isCorrect && (
          <p className="text-green-100">
            Correct answer: <strong>{correctAnswer}</strong>
          </p>
        )}
        <button 
          onClick={onContinue}
          className={`mt-4 w-full py-3 rounded-lg font-medium ${
            isCorrect 
              ? 'bg-green-600 hover:bg-green-700' 
              : 'bg-red-600 hover:bg-red-700'
          }`}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

interface LoadingGameProps {
  message?: string;
  progress?: number;
}

export function LoadingGame({ message = 'Loading game data...', progress }: LoadingGameProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">{message}</p>
        {progress !== undefined && (
          <div className="mt-4 w-48 bg-gray-200 rounded-full h-2 mx-auto">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
