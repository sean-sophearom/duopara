<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import { ChevronLeft, Loader2 } from 'lucide-vue-next';
import { splitSentences } from '@duopara/shared';

import { textsApi, translateApi, vocabularyApi, generateApi } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

import { useReadingSession, useSpeech, useHighlightPreferences } from './composables';
import WordPopup from './components/WordPopup.vue';
import PlaybackControls from './components/PlaybackControls.vue';
import Sidebar from './components/Sidebar.vue';
import ParallelView from './components/ParallelView.vue';
import SentenceRenderer from './components/SentenceRenderer.vue';
import DifficultyControls from './components/DifficultyControls.vue';
import ReadingStats from './components/ReadingStats.vue';
import TranslationControls from './components/TranslationControls.vue';
import { cleanWord, getLanguageCode } from './utils';
import type { WordInfo, SentenceInfo, HoveredWord, ParallelTranslation, EnhancedTranslation, ReadingText } from './types';

const route = useRoute();
const router = useRouter();
const queryClient = useQueryClient();
const authStore = useAuthStore();

const textId = computed(() => route.params.textId as string | undefined);

// State for word/sentence selection
const selectedWord = ref<string | null>(null);
const selectedSentence = ref<string | null>(null);
const wordInfo = ref<WordInfo | null>(null);
const sentenceInfo = ref<SentenceInfo | null>(null);
const isLoadingWord = ref(false);
const isLoadingSentence = ref(false);
const showSidebar = ref(true);

// Parallel translation state
const showParallelTranslation = ref(false);
const parallelTranslations = ref<Array<ParallelTranslation | null>>([]);
const isTranslatingAll = ref(false);

// Enhanced translation state
const enhancedTranslations = ref<Array<EnhancedTranslation | null>>([]);
const isLoadingEnhanced = ref(false);

// Translation mode
type TranslationMode = 'natural' | 'literal' | 'enhanced';
const translationMode = ref<TranslationMode>('natural');

// Hover state
const hoveredWord = ref<HoveredWord | null>(null);
const popupPos = ref({ top: 0, left: 0 });
let hoverTimeout: ReturnType<typeof setTimeout> | null = null;

const nativeLanguage = computed(
  () => authStore.user?.settings?.nativeLanguage || 'English'
);

// Fetch text data
const { data, isLoading, error } = useQuery({
  queryKey: computed(() => ['text', textId.value]),
  queryFn: () => textsApi.getOne(textId.value!).then((r) => r.data),
  enabled: computed(() => !!textId.value),
});

const text = computed(() => data.value?.text as ReadingText | undefined);
const knownWordsSet = computed(
  () => new Set((text.value?.knownWordsUsed || []).map((w: string) => w.toLowerCase()))
);
const newWordsSet = computed(
  () => new Set((text.value?.newWordsIntroduced || []).map((w: string) => w.toLowerCase()))
);

// Fetch learning vocabulary
const { data: learningVocabData } = useQuery({
  queryKey: computed(() => ['vocabulary', 'learning', text.value?.language]),
  queryFn: () =>
    vocabularyApi
      .getAll({ language: text.value?.language, status: 'learning', limit: 1000 })
      .then((r) => r.data),
  enabled: computed(() => !!text.value?.language),
});

const markedLearningWords = ref<Set<string>>(new Set());

watch(
  () => learningVocabData.value,
  (data) => {
    if (data?.words) {
      markedLearningWords.value = new Set(
        data.words.map((w: { word: string }) => w.word.toLowerCase())
      );
    }
  }
);

// Custom composables
const { markedWords, trackWordLookup, updateSessionWithLearnedWord } = useReadingSession(
  () => text.value,
  () => textId.value
);

const {
  isSpeaking,
  speakingIdx,
  speechRate,
  setSpeechRate,
  speak,
  speakAll,
  speakSentence,
  stopSpeaking,
  voices,
  fallbackVoices,
  selectedVoice,
  setSelectedVoice,
} = useSpeech(
  () => text.value?.content,
  () => text.value?.language || 'Spanish'
);

const { highlightLearned, highlightLearning, highlightNew } = useHighlightPreferences();

// Popup position update
watch(hoveredWord, (hw) => {
  if (hw?.target) {
    updatePopupPosition();
    window.addEventListener('scroll', updatePopupPosition);
    window.addEventListener('resize', updatePopupPosition);
  } else {
    window.removeEventListener('scroll', updatePopupPosition);
    window.removeEventListener('resize', updatePopupPosition);
  }
});

onUnmounted(() => {
  window.removeEventListener('scroll', updatePopupPosition);
  window.removeEventListener('resize', updatePopupPosition);
  if (hoverTimeout) clearTimeout(hoverTimeout);
});

function updatePopupPosition() {
  if (hoveredWord.value?.target) {
    const rect = hoveredWord.value.target.getBoundingClientRect();
    popupPos.value = {
      top: rect.top - 44,
      left: rect.left + rect.width / 2,
    };
  }
}

// Mutations
const simplifyMutation = useMutation({
  mutationFn: () => generateApi.regenerate(textId.value!, 'simplify'),
  onSuccess: (response) => router.push(`/read/${response.data.text.id}`),
});

const harderMutation = useMutation({
  mutationFn: () => generateApi.regenerate(textId.value!, 'harder'),
  onSuccess: (response) => router.push(`/read/${response.data.text.id}`),
});

const markLearningMutation = useMutation({
  mutationFn: (word: string) =>
    vocabularyApi.markLearning(word, text.value?.language || 'Spanish'),
  onSuccess: (_: unknown, word: string) => {
    markedLearningWords.value = new Set(markedLearningWords.value).add(word.toLowerCase());
    queryClient.invalidateQueries({ queryKey: ['vocabulary'] });
  },
});

const markLearnedMutation = useMutation({
  mutationFn: (word: string) =>
    vocabularyApi.markLearned(word, text.value?.language || 'Spanish'),
  onSuccess: (_: unknown, word: string) => {
    const normalized = word.toLowerCase();
    markedWords.value = new Set(markedWords.value).add(normalized);
    updateSessionWithLearnedWord(normalized);
    queryClient.invalidateQueries({ queryKey: ['vocabulary'] });
  },
});

// Translation handlers
async function translateWord(word: string, context: string) {
  isLoadingWord.value = true;
  trackWordLookup(word);

  try {
    const response = await translateApi.full({
      word,
      sourceLanguage: text.value?.language || 'Spanish',
      targetLanguage: nativeLanguage.value,
      context,
    });
    wordInfo.value = { word, ...response.data };
  } catch (err) {
    console.error('Translation error:', err);
    wordInfo.value = { word, translation: 'Translation failed' };
  } finally {
    isLoadingWord.value = false;
  }
}

async function translateSentence(sentence: string) {
  isLoadingSentence.value = true;
  try {
    const response = await translateApi.sentence({
      sentence,
      sourceLanguage: text.value?.language || 'Spanish',
      targetLanguage: nativeLanguage.value,
      includeGrammarHints: true,
    });
    sentenceInfo.value = { sentence, ...response.data };
  } catch (err) {
    console.error('Translation error:', err);
    sentenceInfo.value = { sentence, translation: 'Translation failed' };
  } finally {
    isLoadingSentence.value = false;
  }
}

async function translateAll() {
  if (!text.value?.content || !textId.value) return;

  if (parallelTranslations.value.length > 0) {
    showParallelTranslation.value = true;
    return;
  }

  isTranslatingAll.value = true;
  showParallelTranslation.value = true;
  try {
    const response = await textsApi.translateAll(textId.value, nativeLanguage.value);
    parallelTranslations.value = response.data.sentences;
  } catch (err) {
    console.error('Parallel translation error:', err);
  } finally {
    isTranslatingAll.value = false;
  }
}

async function fetchEnhancedTranslation() {
  if (!text.value?.content || !textId.value) return;
  if (enhancedTranslations.value.length > 0) return;

  isLoadingEnhanced.value = true;
  try {
    const response = await textsApi.enhancedTranslate(textId.value, nativeLanguage.value);
    enhancedTranslations.value = response.data.sentences;
  } catch (err) {
    console.error('Enhanced translation error:', err);
  } finally {
    isLoadingEnhanced.value = false;
  }
}

function handleSetTranslationMode(mode: TranslationMode) {
  translationMode.value = mode;
  if (mode === 'enhanced') {
    fetchEnhancedTranslation();
  }
}

// Event handlers
function handleWordClick(word: string, sentence: string) {
  const clean = cleanWord(word);
  if (!clean) return;

  selectedWord.value = clean;
  selectedSentence.value = null;
  sentenceInfo.value = null;
  showSidebar.value = true;
  translateWord(clean, sentence);
}

function handleSentenceClick(sentence: string) {
  selectedSentence.value = sentence;
  selectedWord.value = null;
  wordInfo.value = null;
  showSidebar.value = true;
  translateSentence(sentence);
}

function handleWordHover(word: string | null, sentence: string, target: HTMLElement | null) {
  if (hoverTimeout) clearTimeout(hoverTimeout);

  if (word && target) {
    const clean = cleanWord(word);
    if (clean) {
      hoveredWord.value = { word, sentence, target };
    }
  } else {
    hoverTimeout = setTimeout(() => {
      hoveredWord.value = null;
    }, 300);
  }
}

function handleMarkLearning(word: string) {
  markLearningMutation.mutate(word);
  hoveredWord.value = null;
}

function handleMarkLearned(word: string) {
  markLearnedMutation.mutate(word);
  hoveredWord.value = null;
}

function closeSidebar() {
  selectedWord.value = null;
  selectedSentence.value = null;
  wordInfo.value = null;
  sentenceInfo.value = null;
}

function handlePopupMouseEnter() {
  if (hoverTimeout) clearTimeout(hoverTimeout);
}

function handlePopupMouseLeave() {
  hoverTimeout = setTimeout(() => {
    hoveredWord.value = null;
  }, 300);
}

const sentences = computed(() => {
  if (!text.value?.content) return [];
  return splitSentences(text.value.content);
});
</script>

<template>
  <!-- Loading -->
  <div v-if="isLoading" class="flex items-center justify-center min-h-[60vh]">
    <Loader2 class="w-8 h-8 animate-spin text-primary-600" />
  </div>

  <!-- Error -->
  <div v-else-if="error || !text" class="text-center py-12">
    <p class="text-red-600">Failed to load text</p>
    <button @click="router.push('/history')" class="btn btn-secondary mt-4">Go to History</button>
  </div>

  <!-- Main content -->
  <div v-else class="max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex gap-3 flex-wrap mb-3 justify-between">
      <div class="flex items-center gap-3">
        <button @click="router.back()" class="p-2 hover:bg-gray-100 rounded-lg">
          <ChevronLeft class="w-6 h-6" />
        </button>
        <div class="flex-1 min-w-0">
          <h1 class="text-xl sm:text-2xl font-bold text-gray-900">{{ text.title }}</h1>
          <p class="text-sm text-gray-500">
            {{ text.topic }} &bull; {{ text.wordCount }} words &bull; {{ text.difficulty }}
          </p>
        </div>
      </div>
      <div class="flex items-center gap-3 flex-wrap">
        <TranslationControls
          :has-translations="parallelTranslations.length > 0"
          :is-translating="isTranslatingAll"
          :show-parallel-translation="showParallelTranslation"
          :translation-mode="translationMode"
          :is-loading-enhanced="isLoadingEnhanced"
          @translate-all="translateAll"
          @toggle-parallel-view="showParallelTranslation = !showParallelTranslation"
          @set-mode="handleSetTranslationMode"
        />
      </div>
    </div>

    <!-- Playback controls -->
    <PlaybackControls
      :is-speaking="isSpeaking"
      :speech-rate="speechRate"
      :voices="voices"
      :fallback-voices="fallbackVoices"
      :selected-voice="selectedVoice"
      @speak-all="speakAll"
      @stop="stopSpeaking"
      @rate-change="setSpeechRate"
      @voice-change="setSelectedVoice"
    />

    <div class="flex gap-6">
      <!-- Hover Popup -->
      <WordPopup
        v-if="hoveredWord"
        :hovered-word="hoveredWord"
        :popup-pos="popupPos"
        :marked-learning-words="markedLearningWords"
        :marked-words="markedWords"
        @speak="speak"
        @mark-learning="handleMarkLearning"
        @mark-learned="handleMarkLearned"
        @mouseenter="handlePopupMouseEnter"
        @mouseleave="handlePopupMouseLeave"
      />

      <!-- Main content -->
      <div class="flex-1">
        <!-- Reading instructions -->
        <div class="card p-4 mb-4 bg-primary-50 border-primary-200">
          <p class="text-sm text-primary-700">
            <strong>Tip:</strong> Click any word for translation &amp; grammar info. Double-click a
            sentence for full translation with grammar notes.
          </p>
        </div>

        <!-- Text content -->
        <div
          class="card p-4 lg:p-8 reading-text"
          :lang="getLanguageCode(text.language).split('-')[0]"
          :style="{ fontSize: '1.2rem', lineHeight: '2' }"
        >
          <!-- Parallel view -->
          <ParallelView
            v-if="showParallelTranslation"
            :content="text.content"
            :translations="parallelTranslations"
            :enhanced-translations="enhancedTranslations"
            :is-translating="isTranslatingAll"
            :translation-mode="translationMode"
            :speaking-idx="speakingIdx"
            :selected-sentence="selectedSentence"
            :selected-word="selectedWord"
            :known-words-set="knownWordsSet"
            :new-words-set="newWordsSet"
            :marked-words="markedWords"
            :marked-learning-words="markedLearningWords"
            :highlight-learned="highlightLearned"
            :highlight-learning="highlightLearning"
            :highlight-new="highlightNew"
            @speak-sentence="speakSentence"
            @word-click="handleWordClick"
            @sentence-click="handleSentenceClick"
            @word-hover="handleWordHover"
          />

          <!-- Normal view -->
          <template v-else>
            <template v-for="(sentence, sIdx) in sentences" :key="sIdx">
              <span
                :class="[
                  'inline cursor-pointer rounded transition-colors',
                  speakingIdx === sIdx
                    ? 'bg-primary-100 ring-1 ring-primary-300'
                    : selectedSentence === sentence
                      ? 'bg-yellow-100'
                      : 'hover:bg-gray-100',
                ]"
                @dblclick="handleSentenceClick(sentence)"
              >
                <SentenceRenderer
                  :sentence="sentence"
                  :s-idx="sIdx"
                  :selected-word="selectedWord"
                  :known-words-set="knownWordsSet"
                  :new-words-set="newWordsSet"
                  :marked-words="markedWords"
                  :marked-learning-words="markedLearningWords"
                  :highlight-learned="highlightLearned"
                  :highlight-learning="highlightLearning"
                  :highlight-new="highlightNew"
                  @word-click="handleWordClick"
                  @sentence-click="handleSentenceClick"
                  @word-hover="handleWordHover"
                />
              </span>
              <span>&nbsp;</span>
            </template>
          </template>
        </div>

        <!-- Difficulty adjustment -->
        <DifficultyControls
          :difficulty="text.difficulty"
          :is-simplifying="simplifyMutation.isPending.value"
          :is-making-harder="harderMutation.isPending.value"
          @simplify="simplifyMutation.mutate()"
          @harder="harderMutation.mutate()"
        />

        <!-- Stats -->
        <ReadingStats
          :new-words-count="text.newWordsIntroduced?.length || 0"
          :marked-words-count="markedWords.size"
          :language="text.language"
        />
      </div>

      <!-- Sidebar -->
      <Sidebar
        v-if="showSidebar && (selectedWord || selectedSentence)"
        :selected-word="selectedWord"
        :selected-sentence="selectedSentence"
        :word-info="wordInfo"
        :sentence-info="sentenceInfo"
        :is-loading-word="isLoadingWord"
        :is-loading-sentence="isLoadingSentence"
        :marked-words="markedWords"
        :is-marking-learned="markLearnedMutation.isPending.value"
        @speak="speak"
        @mark-learned="handleMarkLearned"
        @close="closeSidebar"
      />
    </div>
  </div>
</template>
