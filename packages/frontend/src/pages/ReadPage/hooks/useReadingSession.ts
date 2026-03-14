import { useState, useRef, useEffect, useCallback } from "react";
import { textsApi } from "../../../lib/api";
import type { ReadingText } from "../types";

interface UseReadingSessionResult {
  sessionId: string | null;
  markedWords: Set<string>;
  setMarkedWords: React.Dispatch<React.SetStateAction<Set<string>>>;
  trackWordLookup: (word: string) => void;
  updateSessionWithLearnedWord: (word: string) => void;
}

export function useReadingSession(
  text: ReadingText | undefined,
  textId: string | undefined
): UseReadingSessionResult {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [markedWords, setMarkedWords] = useState<Set<string>>(new Set());
  const wordsLookedUpRef = useRef<Set<string>>(new Set());
  const sessionUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize or resume session when text loads
  useEffect(() => {
    if (!text || !textId) return;

    const existingSessions = text.readingSessions || [];
    const recentSession = existingSessions[0];

    if (recentSession && !recentSession.completedAt) {
      setSessionId(recentSession.id);
      const learnedInSession = recentSession.wordsMarkedLearned || [];
      setMarkedWords(new Set(learnedInSession.map((w: string) => w.toLowerCase())));
      wordsLookedUpRef.current = new Set(recentSession.wordsLookedUp || []);
    } else {
      textsApi
        .startSession(textId)
        .then((response) => {
          setSessionId(response.data.session.id);
          setMarkedWords(new Set());
          wordsLookedUpRef.current = new Set();
        })
        .catch(console.error);
    }
  }, [text, textId]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (sessionUpdateTimeoutRef.current) {
        clearTimeout(sessionUpdateTimeoutRef.current);
      }
    };
  }, []);

  const updateSession = useCallback(
    (updates: { wordsLookedUp?: string[]; wordsMarkedLearned?: string[] }) => {
      if (!sessionId) return;

      if (sessionUpdateTimeoutRef.current) {
        clearTimeout(sessionUpdateTimeoutRef.current);
      }

      sessionUpdateTimeoutRef.current = setTimeout(() => {
        textsApi.updateSession(sessionId, updates).catch(console.error);
      }, 500);
    },
    [sessionId]
  );

  const trackWordLookup = useCallback(
    (word: string) => {
      const normalized = word.toLowerCase();
      if (!wordsLookedUpRef.current.has(normalized)) {
        wordsLookedUpRef.current.add(normalized);
        updateSession({ wordsLookedUp: [normalized] });
      }
    },
    [updateSession]
  );

  const updateSessionWithLearnedWord = useCallback(
    (word: string) => {
      updateSession({ wordsMarkedLearned: [word.toLowerCase()] });
    },
    [updateSession]
  );

  return {
    sessionId,
    markedWords,
    setMarkedWords,
    trackWordLookup,
    updateSessionWithLearnedWord,
  };
}
