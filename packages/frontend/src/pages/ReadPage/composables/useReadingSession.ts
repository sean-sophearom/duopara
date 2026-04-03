import { ref, watch, onUnmounted } from 'vue';
import { textsApi } from '../../../lib/api';
import type { ReadingText } from '../types';

export function useReadingSession(
  text: () => ReadingText | undefined,
  textId: () => string | undefined
) {
  const sessionId = ref<string | null>(null);
  const markedWords = ref<Set<string>>(new Set());
  const wordsLookedUp = new Set<string>();
  let sessionUpdateTimeout: ReturnType<typeof setTimeout> | null = null;

  watch(
    [text, textId],
    ([t, id]) => {
      if (!t || !id) return;

      const existingSessions = t.readingSessions || [];
      const recentSession = existingSessions[0];

      if (recentSession && !recentSession.completedAt) {
        sessionId.value = recentSession.id;
        const learnedInSession = recentSession.wordsMarkedLearned || [];
        markedWords.value = new Set(learnedInSession.map((w: string) => w.toLowerCase()));
        wordsLookedUp.clear();
        for (const w of recentSession.wordsLookedUp || []) {
          wordsLookedUp.add(w);
        }
      } else {
        textsApi
          .startSession(id)
          .then((response) => {
            sessionId.value = response.data.session.id;
            markedWords.value = new Set();
            wordsLookedUp.clear();
          })
          .catch(console.error);
      }
    },
    { immediate: true }
  );

  onUnmounted(() => {
    if (sessionUpdateTimeout) clearTimeout(sessionUpdateTimeout);
  });

  function updateSession(updates: { wordsLookedUp?: string[]; wordsMarkedLearned?: string[] }) {
    if (!sessionId.value) return;

    if (sessionUpdateTimeout) clearTimeout(sessionUpdateTimeout);

    const sid = sessionId.value;
    sessionUpdateTimeout = setTimeout(() => {
      textsApi.updateSession(sid, updates).catch(console.error);
    }, 500);
  }

  function trackWordLookup(word: string) {
    const normalized = word.toLowerCase();
    if (!wordsLookedUp.has(normalized)) {
      wordsLookedUp.add(normalized);
      updateSession({ wordsLookedUp: [normalized] });
    }
  }

  function updateSessionWithLearnedWord(word: string) {
    updateSession({ wordsMarkedLearned: [word.toLowerCase()] });
  }

  return {
    sessionId,
    markedWords,
    trackWordLookup,
    updateSessionWithLearnedWord,
  };
}
