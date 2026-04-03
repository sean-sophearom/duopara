import { Volume2, BookOpen, Check } from "lucide-react";
import type { HoveredWord } from "../types";

interface WordPopupProps {
  hoveredWord: HoveredWord;
  popupPos: { top: number; left: number };
  markedLearningWords: Set<string>;
  markedWords: Set<string>;
  onSpeak: (word: string) => void;
  onMarkLearning: (word: string) => void;
  onMarkLearned: (word: string) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

function cleanWord(word: string): string {
  return word.replace(/[^\p{L}'-]/gu, "").toLowerCase();
}

export function WordPopup({
  hoveredWord,
  popupPos,
  markedLearningWords,
  markedWords,
  onSpeak,
  onMarkLearning,
  onMarkLearned,
  onMouseEnter,
  onMouseLeave,
}: WordPopupProps) {
  const clean = cleanWord(hoveredWord.word);
  const isLearning = markedLearningWords.has(clean);
  const isLearned = markedWords.has(clean);

  return (
    <div
      className="fixed z-50 transform -translate-x-1/2 flex items-center bg-white border border-gray-200 shadow-lg rounded-full px-1.5 py-1 gap-1 animate-in fade-in zoom-in duration-200 pointer-events-auto"
      style={{
        top: `${popupPos.top}px`,
        left: `${popupPos.left}px`,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSpeak(hoveredWord.word);
        }}
        className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500 hover:text-primary-600 transition-colors"
        title="Pronounce"
      >
        <Volume2 className="w-4 h-4" />
      </button>
      <div className="w-px h-4 bg-gray-200" />
      <button
        onClick={(e) => {
          e.stopPropagation();
          onMarkLearning(clean);
        }}
        disabled={isLearning || isLearned}
        className={`p-1.5 rounded-full transition-colors ${
          isLearning
            ? "text-yellow-500 bg-yellow-50 cursor-default"
            : "text-gray-500 hover:text-yellow-600 hover:bg-yellow-50"
        }`}
        title="Mark as Learning"
      >
        <BookOpen className="w-4 h-4" />
      </button>
      <div className="w-px h-4 bg-gray-200" />
      <button
        onClick={(e) => {
          e.stopPropagation();
          onMarkLearned(clean);
        }}
        disabled={isLearned}
        className={`p-1.5 rounded-full transition-colors ${
          isLearned
            ? "text-green-500 bg-green-50 cursor-default"
            : "text-gray-500 hover:text-green-600 hover:bg-green-50"
        }`}
        title="Mark as Learned"
      >
        <Check className="w-4 h-4" />
      </button>
    </div>
  );
}
