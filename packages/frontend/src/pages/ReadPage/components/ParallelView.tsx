import { useState } from "react";
import { Volume2, Loader2, Highlighter, Underline, Type } from "lucide-react";
import { splitSentences } from "@duopara/shared";
import type { ParallelTranslation, EnhancedTranslation } from "../types";
import { SentenceRenderer } from "./SentenceRenderer";

type TranslationMode = "natural" | "literal" | "enhanced";

const COLORS = [
  { underline: "decoration-blue-500", bg: "bg-blue-100/50", text: "text-blue-600" },
  { underline: "decoration-amber-500", bg: "bg-amber-100/50", text: "text-amber-600" },
  { underline: "decoration-emerald-500", bg: "bg-emerald-100/50", text: "text-emerald-600" },
  { underline: "decoration-rose-500", bg: "bg-rose-100/50", text: "text-rose-600" },
  { underline: "decoration-violet-500", bg: "bg-violet-100/50", text: "text-violet-600" },
  { underline: "decoration-cyan-500", bg: "bg-cyan-100/50", text: "text-cyan-600" },
  { underline: "decoration-orange-500", bg: "bg-orange-100/50", text: "text-orange-600" },
  { underline: "decoration-teal-500", bg: "bg-teal-100/50", text: "text-teal-600" },
  { underline: "decoration-pink-500", bg: "bg-pink-100/50", text: "text-pink-600" },
  { underline: "decoration-indigo-500", bg: "bg-indigo-100/50", text: "text-indigo-600" },
];

const STORAGE_KEY = "duopara.enhancedHighlightStyles";

type HighlightStyle = "underline" | "bg" | "text";

function getStoredStyles(): Set<HighlightStyle> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw) as HighlightStyle[];
      return new Set(arr.filter((s) => ["underline", "bg", "text"].includes(s)));
    }
  } catch {}
  return new Set(["underline"]);
}

function storeStyles(styles: Set<HighlightStyle>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...styles]));
}

function buildPairClass(idx: number, styles: Set<HighlightStyle>): string {
  const c = COLORS[idx % COLORS.length];
  const parts: string[] = ["inline-block rounded"];
  if (styles.has("bg")) {
    parts.push("px-1.5 py-0.5 text-sm", c.bg);
  } else {
    parts.push("py-0.5");
  }
  if (styles.has("underline")) {
    parts.push("underline decoration-[1.5px] underline-offset-2", c.underline);
  }
  if (styles.has("text")) {
    parts.push(c.text);
  }
  return parts.join(" ");
}

interface ParallelViewProps {
  content: string;
  translations: Array<ParallelTranslation | null>;
  enhancedTranslations: Array<EnhancedTranslation | null>;
  isTranslating: boolean;
  translationMode: TranslationMode;
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
  enhancedTranslations,
  isTranslating,
  translationMode,
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
  const [activeStyles, setActiveStyles] = useState<Set<HighlightStyle>>(getStoredStyles);

  const toggleStyle = (style: HighlightStyle) => {
    setActiveStyles((prev) => {
      const next = new Set(prev);
      if (next.has(style)) next.delete(style);
      else next.add(style);
      storeStyles(next);
      return next;
    });
  };

  const styleButtons: { style: HighlightStyle; icon: typeof Underline; label: string }[] = [
    { style: "underline", icon: Underline, label: "Underline" },
    { style: "bg", icon: Highlighter, label: "Background" },
    { style: "text", icon: Type, label: "Text color" },
  ];

  return (
    <div>
      {translationMode === "enhanced" && enhancedTranslations.length > 0 && (
        <div className="flex justify-end gap-1 mb-2">
          {styleButtons.map(({ style, icon: Icon, label }) => (
            <button
              key={style}
              onClick={() => toggleStyle(style)}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                activeStyles.has(style)
                  ? "bg-primary-100 text-primary-700"
                  : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              }`}
              title={label}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      )}
      <div className="divide-y divide-gray-100">
      {sentences.map((sentence: string, sIdx: number) => {
        const trans = translations[sIdx];
        const enhanced = enhancedTranslations[sIdx];
        const isEnhanced = translationMode === "enhanced" && enhanced;

        const displayTranslation =
          translationMode === "literal"
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
              {isEnhanced ? (
                <span className="flex flex-wrap gap-1 items-baseline px-1">
                  {enhanced.pairs.map((pair, pIdx) => (
                    <span
                      key={pIdx}
                      className={buildPairClass(pIdx, activeStyles)}
                      title={pair.t}
                    >
                      {pair.s}
                    </span>
                  ))}
                </span>
              ) : (
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
              )}
            </div>
            {/* Translation */}
            <span className="text-gray-500 text-sm sm:text-base pl-3 sm:pl-1 border-l-2 border-primary-100 sm:border-0">
              {isEnhanced ? (
                <span className="flex flex-wrap gap-1 items-baseline">
                  {enhanced.pairs.map((pair, pIdx) => (
                    <span
                      key={pIdx}
                      className={buildPairClass(pIdx, activeStyles)}
                    >
                      {pair.t}
                    </span>
                  ))}
                </span>
              ) : trans == null ? (
                <Loader2 className="w-4 h-4 animate-spin text-primary-400 inline" />
              ) : (
                displayTranslation
              )}
            </span>
          </div>
        );
      })}
      </div>
    </div>
  );
}
