import { Volume2, Loader2 } from "lucide-react";
import { splitSentences } from "@duopara/shared";
import type { ParallelTranslation } from "../types";
import { SentenceRenderer } from "./SentenceRenderer";

interface ParallelViewProps {
  content: string;
  translations: Array<ParallelTranslation | null>;
  isTranslating: boolean;
  useLiteralTranslation: boolean;
  speakingIdx: number | null;
  selectedSentence: string | null;
  selectedWord: string | null;
  knownWordsSet: Set<string>;
  newWordsSet: Set<string>;
  markedWords: Set<string>;
  markedLearningWords: Set<string>;
  highlightLearned: boolean;
  highlightLearning: boolean;
  highlightNew: boolean;
  onSpeakSentence: (sentence: string) => void;
  onWordClick: (word: string, sentence: string) => void;
  onSentenceClick: (sentence: string) => void;
  onWordHover: (word: string | null, sentence: string, target: HTMLElement | null) => void;
}

export function ParallelView({
  content,
  translations,
  isTranslating,
  useLiteralTranslation,
  speakingIdx,
  selectedSentence,
  selectedWord,
  knownWordsSet,
  newWordsSet,
  markedWords,
  markedLearningWords,
  highlightLearned,
  highlightLearning,
  highlightNew,
  onSpeakSentence,
  onWordClick,
  onSentenceClick,
  onWordHover,
}: ParallelViewProps) {
  if (isTranslating) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        <p className="text-sm">
          Translating entire text — this will be cached for future visits…
        </p>
      </div>
    );
  }

  const sentences = splitSentences(content);

  return (
    <div className="divide-y divide-gray-100">
      {sentences.map((sentence: string, sIdx: number) => {
        const trans = translations[sIdx];
        const displayTranslation = useLiteralTranslation
          ? trans?.literalTranslation || trans?.translation
          : trans?.translation;

        return (
          <div
            key={sIdx}
            className={`grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 py-3 rounded transition-colors ${
              speakingIdx === sIdx ? "bg-primary-50" : ""
            }`}
          >
            {/* Original + play button */}
            <div className="flex items-start gap-1 pl-1.5">
              <button
                onClick={() => onSpeakSentence(sentence)}
                className="mt-2.5 shrink-0 p-0.5 text-gray-400 hover:text-primary-600 rounded"
                title="Read sentence"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
              <span
                className={`cursor-pointer hover:bg-gray-50 rounded px-1 ${
                  selectedSentence === sentence ? "bg-yellow-100" : ""
                }`}
                onDoubleClick={() => onSentenceClick(sentence)}
              >
                <SentenceRenderer
                  sentence={sentence}
                  sIdx={sIdx}
                  selectedWord={selectedWord}
                  knownWordsSet={knownWordsSet}
                  newWordsSet={newWordsSet}
                  markedWords={markedWords}
                  markedLearningWords={markedLearningWords}
                  highlightLearned={highlightLearned}
                  highlightLearning={highlightLearning}
                  highlightNew={highlightNew}
                  onWordClick={onWordClick}
                  onSentenceClick={onSentenceClick}
                  onWordHover={onWordHover}
                />
              </span>
            </div>
            {/* Translation */}
            <span className="text-gray-500 text-sm sm:text-base pl-3 sm:pl-1 border-l-2 border-primary-100 sm:border-0">
              {trans == null ? (
                <Loader2 className="w-4 h-4 animate-spin text-primary-400 inline" />
              ) : (
                displayTranslation
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
