import { useState, useEffect } from "react";
import { getStoredBoolean, setStoredValue } from "../utils";

interface UseHighlightPreferencesResult {
  highlightLearned: boolean;
  highlightLearning: boolean;
  highlightNew: boolean;
  useLiteralTranslation: boolean;
  setHighlightLearned: (val: boolean) => void;
  setHighlightLearning: (val: boolean) => void;
  setHighlightNew: (val: boolean) => void;
  setUseLiteralTranslation: (val: boolean) => void;
}

export function useHighlightPreferences(): UseHighlightPreferencesResult {
  const [highlightLearned, setHighlightLearnedState] = useState(() =>
    getStoredBoolean("duopara.highlightLearned", true)
  );
  const [highlightLearning, setHighlightLearningState] = useState(() =>
    getStoredBoolean("duopara.highlightLearning", true)
  );
  const [highlightNew, setHighlightNewState] = useState(() =>
    getStoredBoolean("duopara.highlightNew", true)
  );
  const [useLiteralTranslation, setUseLiteralTranslationState] = useState(() =>
    getStoredBoolean("duopara.useLiteralTranslation", false)
  );

  // Sync from other tabs
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === "duopara.highlightLearned") {
        setHighlightLearnedState(e.newValue !== "false");
      }
      if (e.key === "duopara.highlightLearning") {
        setHighlightLearningState(e.newValue !== "false");
      }
      if (e.key === "duopara.highlightNew") {
        setHighlightNewState(e.newValue !== "false");
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const setHighlightLearned = (val: boolean) => {
    setHighlightLearnedState(val);
    setStoredValue("duopara.highlightLearned", val);
  };

  const setHighlightLearning = (val: boolean) => {
    setHighlightLearningState(val);
    setStoredValue("duopara.highlightLearning", val);
  };

  const setHighlightNew = (val: boolean) => {
    setHighlightNewState(val);
    setStoredValue("duopara.highlightNew", val);
  };

  const setUseLiteralTranslation = (val: boolean) => {
    setUseLiteralTranslationState(val);
    setStoredValue("duopara.useLiteralTranslation", val);
  };

  return {
    highlightLearned,
    highlightLearning,
    highlightNew,
    useLiteralTranslation,
    setHighlightLearned,
    setHighlightLearning,
    setHighlightNew,
    setUseLiteralTranslation,
  };
}
