import { X, Volume2, Check, Sparkles, Loader2 } from "lucide-react";
import type { WordInfo, SentenceInfo } from "../types";

interface SidebarProps {
  selectedWord: string | null;
  selectedSentence: string | null;
  wordInfo: WordInfo | null;
  sentenceInfo: SentenceInfo | null;
  isLoadingWord: boolean;
  isLoadingSentence: boolean;
  markedWords: Set<string>;
  onSpeak: (text: string) => void;
  onMarkLearned: (word: string) => void;
  onClose: () => void;
  isMarkingLearned: boolean;
}

export function Sidebar({
  selectedWord,
  selectedSentence,
  wordInfo,
  sentenceInfo,
  isLoadingWord,
  isLoadingSentence,
  markedWords,
  onSpeak,
  onMarkLearned,
  onClose,
  isMarkingLearned,
}: SidebarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 max-h-[60vh] sm:bottom-auto sm:left-auto sm:right-4 sm:top-20 lg:top-8 sm:w-80 sm:max-h-[calc(100vh-6rem)] overflow-y-auto z-30">
      <div className="card p-6 animate-fade-in rounded-t-2xl sm:rounded-2xl">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 hover:bg-gray-100 rounded"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Word info */}
        {selectedWord && (
          <WordInfoContent
            selectedWord={selectedWord}
            wordInfo={wordInfo}
            isLoading={isLoadingWord}
            markedWords={markedWords}
            onSpeak={onSpeak}
            onMarkLearned={onMarkLearned}
            isMarkingLearned={isMarkingLearned}
          />
        )}

        {/* Sentence info */}
        {selectedSentence && (
          <SentenceInfoContent
            selectedSentence={selectedSentence}
            sentenceInfo={sentenceInfo}
            isLoading={isLoadingSentence}
            onSpeak={onSpeak}
          />
        )}
      </div>
    </div>
  );
}

interface WordInfoContentProps {
  selectedWord: string;
  wordInfo: WordInfo | null;
  isLoading: boolean;
  markedWords: Set<string>;
  onSpeak: (text: string) => void;
  onMarkLearned: (word: string) => void;
  isMarkingLearned: boolean;
}

function WordInfoContent({
  selectedWord,
  wordInfo,
  isLoading,
  markedWords,
  onSpeak,
  onMarkLearned,
  isMarkingLearned,
}: WordInfoContentProps) {
  const isMarked = markedWords.has(selectedWord);

  return (
    <div>
      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">{selectedWord}</h3>
          {wordInfo?.baseForm && wordInfo.baseForm !== selectedWord && (
            <p className="text-sm text-gray-500">
              Base form: <span className="font-medium">{wordInfo.baseForm}</span>
            </p>
          )}
        </div>
        <button
          onClick={() => onSpeak(selectedWord)}
          className="p-2 hover:bg-gray-100 rounded-lg"
          title="Listen"
        >
          <Volume2 className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
        </div>
      ) : wordInfo ? (
        <div className="space-y-4">
          {/* Part of speech */}
          {wordInfo.partOfSpeech && (
            <div className="inline-block px-2 py-1 bg-gray-100 rounded text-sm text-gray-600">
              {wordInfo.partOfSpeech}
              {wordInfo.gender && ` (${wordInfo.gender})`}
            </div>
          )}

          {/* Translation */}
          <div>
            <p className="text-xl font-medium text-gray-900">{wordInfo.translation}</p>
            {wordInfo.alternativeTranslations && wordInfo.alternativeTranslations.length > 0 && (
              <p className="text-sm text-gray-500 mt-1">
                Also: {wordInfo.alternativeTranslations.join(", ")}
              </p>
            )}
          </div>

          {/* Conjugation info */}
          {wordInfo.conjugation && Object.keys(wordInfo.conjugation).length > 0 && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-800 mb-1">Conjugation</p>
              <p className="text-sm text-blue-700">
                {wordInfo.conjugation.tense && `${wordInfo.conjugation.tense}`}
                {wordInfo.conjugation.person && `, ${wordInfo.conjugation.person}`}
                {wordInfo.conjugation.mood && ` (${wordInfo.conjugation.mood})`}
              </p>
            </div>
          )}

          {/* Contextual note */}
          {wordInfo.contextualNote && (
            <div className="p-3 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-800">
                <Sparkles className="w-4 h-4 inline mr-1" />
                {wordInfo.contextualNote}
              </p>
            </div>
          )}

          {/* Mark as learned button */}
          <button
            onClick={() => onMarkLearned(selectedWord)}
            disabled={isMarked || isMarkingLearned}
            className={`w-full btn ${
              isMarked ? "bg-green-100 text-green-700 cursor-default" : "btn-primary"
            }`}
          >
            {isMarked ? (
              <>
                <Check className="w-5 h-5 mr-2" />
                Marked as Learned
              </>
            ) : isMarkingLearned ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Check className="w-5 h-5 mr-2" />
                Mark as Learned
              </>
            )}
          </button>
        </div>
      ) : null}
    </div>
  );
}

interface SentenceInfoContentProps {
  selectedSentence: string;
  sentenceInfo: SentenceInfo | null;
  isLoading: boolean;
  onSpeak: (text: string) => void;
}

function SentenceInfoContent({
  selectedSentence,
  sentenceInfo,
  isLoading,
  onSpeak,
}: SentenceInfoContentProps) {
  return (
    <div>
      <div className="flex items-start justify-between gap-2 mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Sentence Translation</h3>
        <button
          onClick={() => onSpeak(selectedSentence)}
          className="p-2 hover:bg-gray-100 rounded-lg"
          title="Listen"
        >
          <Volume2 className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
        </div>
      ) : sentenceInfo ? (
        <div className="space-y-4">
          {/* Original sentence */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 italic">{selectedSentence}</p>
          </div>

          {/* Translation */}
          <div>
            <p className="font-medium text-gray-900">{sentenceInfo.translation}</p>
          </div>

          {/* Literal translation */}
          {sentenceInfo.literalTranslation && (
            <div className="p-3 bg-purple-50 rounded-lg">
              <p className="text-sm font-medium text-purple-800 mb-1">Word-for-word</p>
              <p className="text-sm text-purple-700">{sentenceInfo.literalTranslation}</p>
            </div>
          )}

          {/* Grammar notes */}
          {sentenceInfo.grammarNotes && sentenceInfo.grammarNotes.length > 0 && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-800 mb-2">Grammar Notes</p>
              <ul className="space-y-2">
                {sentenceInfo.grammarNotes.map((note, idx) => (
                  <li key={idx} className="text-sm text-blue-700">
                    <span className="font-medium">{note.element}:</span> {note.explanation}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
