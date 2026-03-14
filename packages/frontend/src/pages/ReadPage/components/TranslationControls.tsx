import { Languages, Eye, EyeOff, Loader2 } from "lucide-react";

interface TranslationControlsProps {
  hasTranslations: boolean;
  isTranslating: boolean;
  showParallelTranslation: boolean;
  useLiteralTranslation: boolean;
  onTranslateAll: () => void;
  onToggleParallelView: () => void;
  onToggleLiteral: (literal: boolean) => void;
}

export function TranslationControls({
  hasTranslations,
  isTranslating,
  showParallelTranslation,
  useLiteralTranslation,
  onTranslateAll,
  onToggleParallelView,
  onToggleLiteral,
}: TranslationControlsProps) {
  if (hasTranslations) {
    return (
      <>
        {/* Literal / Natural pill — only when panel is open */}
        {showParallelTranslation && (
          <div className="flex items-center rounded-lg overflow-hidden border border-gray-200 text-sm font-medium">
            <button
              onClick={() => onToggleLiteral(false)}
              className={`px-3 py-1.5 transition-colors ${
                !useLiteralTranslation
                  ? "bg-primary-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              Natural
            </button>
            <button
              onClick={() => onToggleLiteral(true)}
              className={`px-3 py-1.5 transition-colors ${
                useLiteralTranslation
                  ? "bg-primary-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              Literal
            </button>
          </div>
        )}
        <button
          onClick={onToggleParallelView}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            showParallelTranslation
              ? "bg-primary-100 text-primary-700 hover:bg-primary-200"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
          title={showParallelTranslation ? "Hide translation" : "Show translation"}
        >
          {showParallelTranslation ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          Translation
        </button>
      </>
    );
  }

  return (
    <button
      onClick={onTranslateAll}
      disabled={isTranslating}
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-60 transition-colors"
      title="Translate entire text sentence by sentence"
    >
      {isTranslating ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Languages className="w-4 h-4" />
      )}
      {isTranslating ? "Translating…" : "Translate All"}
    </button>
  );
}
