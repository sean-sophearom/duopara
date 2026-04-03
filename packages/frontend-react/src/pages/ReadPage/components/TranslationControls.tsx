import { Languages, Eye, EyeOff, Loader2 } from "lucide-react";

type TranslationMode = "natural" | "literal" | "enhanced";

interface TranslationControlsProps {
  hasTranslations: boolean;
  isTranslating: boolean;
  showParallelTranslation: boolean;
  translationMode: TranslationMode;
  isLoadingEnhanced: boolean;
  onTranslateAll: () => void;
  onToggleParallelView: () => void;
  onSetMode: (mode: TranslationMode) => void;
}

export function TranslationControls({
  hasTranslations,
  isTranslating,
  showParallelTranslation,
  translationMode,
  isLoadingEnhanced,
  onTranslateAll,
  onToggleParallelView,
  onSetMode,
}: TranslationControlsProps) {
  if (hasTranslations) {
    return (
      <>
        {/* Natural / Literal / Enhanced pill — only when panel is open */}
        {showParallelTranslation && (
          <div className="flex items-center rounded-lg overflow-hidden border border-gray-200 text-sm font-medium">
            {(["natural", "literal", "enhanced"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => onSetMode(mode)}
                disabled={mode === "enhanced" && isLoadingEnhanced}
                className={`px-3 py-1.5 transition-colors capitalize ${
                  translationMode === mode
                    ? "bg-primary-600 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                } ${mode === "enhanced" && isLoadingEnhanced ? "opacity-60" : ""}`}
              >
                {mode === "enhanced" && isLoadingEnhanced ? (
                  <span className="flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Enhanced
                  </span>
                ) : (
                  mode
                )}
              </button>
            ))}
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
