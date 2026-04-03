import { cleanWord } from "../utils";

interface SentenceRendererProps {
  sentence: string;
  sIdx: number;
  selectedWord: string | null;
  knownWordsSet: Set<string>;
  newWordsSet: Set<string>;
  markedWords: Set<string>;
  markedLearningWords: Set<string>;
  highlightLearned: boolean;
  highlightLearning: boolean;
  highlightNew: boolean;
  onWordClick: (word: string, sentence: string) => void;
  onSentenceClick: (sentence: string) => void;
  onWordHover: (word: string | null, sentence: string, target: HTMLElement | null) => void;
}

export function SentenceRenderer({
  sentence,
  sIdx,
  selectedWord,
  knownWordsSet,
  newWordsSet,
  markedWords,
  markedLearningWords,
  highlightLearned,
  highlightLearning,
  highlightNew,
  onWordClick,
  onSentenceClick,
  onWordHover,
}: SentenceRendererProps) {
  const words = sentence.split(/(\s+)/);

  return (
    <>
      {words.map((part, wIdx) => {
        if (/^\s+$/.test(part)) {
          return (
            <span key={`${sIdx}-${wIdx}`} onClick={() => onSentenceClick(sentence)}>
              {part}
            </span>
          );
        }

        const clean = cleanWord(part);
        const isKnown = knownWordsSet.has(clean);
        const isNew = newWordsSet.has(clean);
        const isMarked = markedWords.has(clean);
        const isLearning = markedLearningWords.has(clean);
        const isSelected = selectedWord === clean;

        return (
          <span
            key={`${sIdx}-${wIdx}`}
            onClick={() => onWordClick(part, sentence)}
            onMouseEnter={(e) => onWordHover(part, sentence, e.currentTarget)}
            onMouseLeave={() => onWordHover(null, sentence, null)}
            className={`
              word cursor-pointer rounded px-0.5 transition-all duration-150
              ${isSelected ? "bg-primary-200 ring-2 ring-primary-400" : ""}
              ${isMarked && highlightLearned ? "bg-green-100 text-green-800" : ""}
              ${isLearning && !isMarked && highlightLearning ? "bg-yellow-100 text-yellow-800" : ""}
              ${isNew && !isMarked && !isLearning && highlightNew ? "text-primary-700 font-medium" : ""}
              ${!isNew && !isMarked && !isLearning && isKnown ? "text-gray-800" : ""}
              hover:bg-primary-100
            `}
          >
            {part}
          </span>
        );
      })}
    </>
  );
}
