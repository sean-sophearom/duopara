import { ReactNode, useEffect, useRef } from "react";
import { ChevronLeft } from "lucide-react";
import type { SessionStats } from "./types";

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
  onExit,
}: GameWrapperProps) {
  const progress = totalWords > 0 ? (currentIndex / totalWords) * 100 : 0;

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
      <div className="flex-1 flex flex-col">{children}</div>
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
  onExit,
}: SessionResultsProps) {
  const getGrade = (accuracy: number) => {
    if (accuracy >= 90)
      return { grade: "A", color: "text-green-600", message: "Excellent!" };
    if (accuracy >= 80)
      return { grade: "B", color: "text-blue-600", message: "Great job!" };
    if (accuracy >= 70)
      return { grade: "C", color: "text-yellow-600", message: "Good effort!" };
    if (accuracy >= 60)
      return {
        grade: "D",
        color: "text-orange-600",
        message: "Keep practicing!",
      };
    return { grade: "F", color: "text-red-600", message: "Try again!" };
  };

  const { grade, color, message } = getGrade(stats.accuracy);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
        <div className="text-6xl mb-4">{gameIcon}</div>
        <h2 className="text-2xl font-bold mb-2">{gameName} Complete!</h2>
        <p className="text-gray-600 mb-6">{message}</p>

        {/* Grade circle */}
        <div
          className={`w-24 h-24 rounded-full ${color} bg-gray-100 flex items-center justify-center mx-auto mb-6`}
        >
          <span className="text-5xl font-bold">{grade}</span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-3xl font-bold text-blue-600">
              {stats.accuracy}%
            </div>
            <div className="text-sm text-gray-600">Accuracy</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-3xl font-bold text-purple-600">
              {stats.avgTimeMs
                ? `${(stats.avgTimeMs / 1000).toFixed(1)}s`
                : "-"}
            </div>
            <div className="text-sm text-gray-600">Avg Time</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-3xl font-bold text-green-600">
              {stats.correctCount}
            </div>
            <div className="text-sm text-gray-600">Correct</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-3xl font-bold text-red-600">
              {stats.incorrectCount}
            </div>
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

export function FeedbackOverlay({
  isCorrect,
  correctAnswer,
  onContinue,
}: FeedbackOverlayProps) {
  const hasTriggeredRef = useRef(false);
  const onContinueRef = useRef(onContinue);
  onContinueRef.current = onContinue;

  useEffect(() => {
    // For correct answers, auto-advance after a brief delay
    if (isCorrect && !hasTriggeredRef.current) {
      const timer = setTimeout(() => {
        hasTriggeredRef.current = true;
        onContinueRef.current();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isCorrect]);

  // No overlay for correct - just auto-advance
  if (isCorrect) {
    return null;
  }

  // For incorrect, show a minimal bottom bar
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t shadow-lg">
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500">Correct answer:</p>
          <p className="font-medium text-gray-900">{correctAnswer}</p>
        </div>
        <button
          onClick={onContinue}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

interface LoadingGameProps {
  message?: string;
  progress?: number;
}

export function LoadingGame({
  message = "Loading game data...",
  progress,
}: LoadingGameProps) {
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
