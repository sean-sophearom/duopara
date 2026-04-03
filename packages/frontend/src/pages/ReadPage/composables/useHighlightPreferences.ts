import { ref, onMounted, onUnmounted } from 'vue';
import { getStoredBoolean, setStoredValue } from '../utils';

export function useHighlightPreferences() {
  const highlightLearned = ref(getStoredBoolean('duopara.highlightLearned', true));
  const highlightLearning = ref(getStoredBoolean('duopara.highlightLearning', true));
  const highlightNew = ref(getStoredBoolean('duopara.highlightNew', true));
  const useLiteralTranslation = ref(getStoredBoolean('duopara.useLiteralTranslation', false));

  function onStorageChange(e: StorageEvent) {
    if (e.key === 'duopara.highlightLearned') {
      highlightLearned.value = e.newValue !== 'false';
    }
    if (e.key === 'duopara.highlightLearning') {
      highlightLearning.value = e.newValue !== 'false';
    }
    if (e.key === 'duopara.highlightNew') {
      highlightNew.value = e.newValue !== 'false';
    }
  }

  onMounted(() => {
    window.addEventListener('storage', onStorageChange);
  });

  onUnmounted(() => {
    window.removeEventListener('storage', onStorageChange);
  });

  function setHighlightLearned(val: boolean) {
    highlightLearned.value = val;
    setStoredValue('duopara.highlightLearned', val);
  }

  function setHighlightLearning(val: boolean) {
    highlightLearning.value = val;
    setStoredValue('duopara.highlightLearning', val);
  }

  function setHighlightNew(val: boolean) {
    highlightNew.value = val;
    setStoredValue('duopara.highlightNew', val);
  }

  function setUseLiteralTranslation(val: boolean) {
    useLiteralTranslation.value = val;
    setStoredValue('duopara.useLiteralTranslation', val);
  }

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
