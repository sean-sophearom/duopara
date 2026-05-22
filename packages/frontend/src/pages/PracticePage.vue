<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { useAuthStore } from '../store/authStore';
import { practiceApi, vocabularyApi } from '../lib/api';
import {
  type GameType,
  type VocabularyStatus,
  type VocabularyWord,
  type GameConfig,
  type PracticeWord,
  type SessionStats,
  GAME_INFO,
} from '../games/types';
import {
  BookOpen, GraduationCap, Trophy, Play, ChevronRight, AlertCircle,
} from 'lucide-vue-next';

import DefinitionGame from '../games/DefinitionGame.vue';
import TranslationGame from '../games/TranslationGame.vue';
import ReverseTranslationGame from '../games/ReverseTranslationGame.vue';
import FillBlankGame from '../games/FillBlankGame.vue';
import MatchingGridGame from '../games/MatchingGridGame.vue';
import TrueFalseSwipeGame from '../games/TrueFalseSwipeGame.vue';
import SessionResults from '../games/SessionResults.vue';
import LoadingGame from '../games/LoadingGame.vue';

type ViewState = 'select' | 'config' | 'loading' | 'playing' | 'results';

const authStore = useAuthStore();
const queryClient = useQueryClient();

const viewState = ref<ViewState>('select');
const selectedStatuses = ref<VocabularyStatus[]>(
  (() => {
    const saved = localStorage.getItem('duopara.practice_selected_statuses');
    return saved ? JSON.parse(saved) : ['learning', 'learned'];
  })()
);
const selectedGame = ref<GameType | null>(null);
const wordCount = ref(
  (() => {
    const saved = localStorage.getItem('duopara.practice_word_count');
    return saved ? parseInt(saved) : 5;
  })()
);
const gameConfig = ref<GameConfig>({});

const sessionId = ref<string | null>(null);
const practiceWords = ref<PracticeWord[]>([]);
const sessionStats = ref<SessionStats | null>(null);
const loadingProgress = ref(0);

watch(wordCount, (v) => localStorage.setItem('duopara.practice_word_count', v.toString()));
watch(selectedStatuses, (v) => localStorage.setItem('duopara.practice_selected_statuses', JSON.stringify(v)), { deep: true });

const sourceLanguage = computed(() => authStore.user?.settings?.targetLanguage || 'Spanish');
const targetLanguage = computed(() => authStore.user?.settings?.nativeLanguage || 'English');

const { data: vocabStats } = useQuery({
  queryKey: computed(() => ['vocabulary', 'stats', sourceLanguage.value]),
  queryFn: () => vocabularyApi.getStats(sourceLanguage.value).then(r => r.data),
});

const { data: dueData } = useQuery({
  queryKey: computed(() => ['practice', 'due', sourceLanguage.value]),
  queryFn: () => practiceApi.getDueCount(sourceLanguage.value).then(r => r.data),
});

const availableWordCount = computed(() =>
  selectedStatuses.value.reduce((sum, status) => {
    if (!vocabStats.value) return sum;
    return sum + (vocabStats.value[status] || 0);
  }, 0),
);

const gameInfoList = computed(() => Object.values(GAME_INFO) as (typeof GAME_INFO)[GameType][]);

async function handleStartGame() {
  if (!selectedGame.value) return;
  viewState.value = 'loading';
  loadingProgress.value = 10;

  try {
    const isMatching = selectedGame.value === 'matching';
    const fetchLimit = isMatching ? (gameConfig.value.pairCount || 4) + 3 : wordCount.value;

    const wordsResponse = await practiceApi.getWords({
      language: sourceLanguage.value,
      statuses: selectedStatuses.value,
      limit: fetchLimit,
      prioritizeSpacedRepetition: true,
    });

    let words: VocabularyWord[] = wordsResponse.data.words;
    loadingProgress.value = 30;

    if (words.length === 0) {
      alert('No words found matching your filters.');
      viewState.value = 'select';
      return;
    }

    const gameDataResponse = await practiceApi.getGameDataBatch({
      words: words.map(w => ({ word: w.word, translation: w.translation || '' })),
      sourceLanguage: sourceLanguage.value,
      targetLanguage: targetLanguage.value,
    });

    loadingProgress.value = 70;
    const results = gameDataResponse.data.results;

    if (isMatching) {
      const pc = gameConfig.value.pairCount || 4;
      words = words.filter(w => results[w.word]?.data?.translation).slice(0, pc);
    }

    const sessionResponse = await practiceApi.startSession({
      gameType: selectedGame.value,
      sourceLanguage: sourceLanguage.value,
      targetLanguage: targetLanguage.value,
      wordIds: words.map(w => w.id),
      config: gameConfig.value,
    });

    sessionId.value = sessionResponse.data.session.id;
    loadingProgress.value = 90;

    practiceWords.value = words.map(w => ({
      vocabularyWord: w,
      gameData: results[w.word]?.data || null,
      loading: false,
      error: results[w.word]?.error,
    }));

    loadingProgress.value = 100;
    viewState.value = 'playing';
  } catch {
    alert('Failed to start game. Please try again.');
    viewState.value = 'select';
  }
}

async function handleAttempt(attempt: {
  vocabularyWordId: string;
  isCorrect: boolean;
  questionData: any;
  userAnswer: string;
  correctAnswer: string;
}) {
  if (!sessionId.value) return;
  try {
    await practiceApi.submitAttempt({ sessionId: sessionId.value, ...attempt });
  } catch (e) {
    console.error('Failed to submit attempt:', e);
  }
}

async function handleComplete() {
  if (!sessionId.value) return;
  try {
    const response = await practiceApi.completeSession(sessionId.value);
    sessionStats.value = response.data.stats;
    viewState.value = 'results';
    queryClient.invalidateQueries({ queryKey: ['vocabulary'] });
    queryClient.invalidateQueries({ queryKey: ['practice'] });
  } catch {
    viewState.value = 'select';
  }
}

function handlePlayAgain() {
  sessionId.value = null;
  practiceWords.value = [];
  sessionStats.value = null;
  handleStartGame();
}

function handleBackToSelect() {
  viewState.value = 'select';
  selectedGame.value = null;
  sessionId.value = null;
  practiceWords.value = [];
  sessionStats.value = null;
}

function handleSelectGame(gameType: GameType) {
  selectedGame.value = gameType;
  gameConfig.value = GAME_INFO[gameType].defaultConfig;
  viewState.value = 'config';
}

function toggleStatus(status: VocabularyStatus) {
  if (selectedStatuses.value.includes(status)) {
    selectedStatuses.value = selectedStatuses.value.filter(s => s !== status);
  } else {
    selectedStatuses.value = [...selectedStatuses.value, status];
  }
}

const gameComponents: Record<GameType, any> = {
  definition: DefinitionGame,
  translation: TranslationGame,
  reverse: ReverseTranslationGame,
  fillblank: FillBlankGame,
  matching: MatchingGridGame,
  truefalse: TrueFalseSwipeGame,
};

// Non-null accessor for template use (guarded by v-if="selectedGame")
const activeGame = computed(() => selectedGame.value as GameType);
const activeGameInfo = computed(() => GAME_INFO[selectedGame.value || 'definition']);
</script>

<template>
  <!-- SELECT VIEW -->
  <div v-if="viewState === 'select'" class="max-w-5xl mx-auto">
    <div class="flex items-center justify-between gap-4 mb-6 flex-wrap">
      <div>
        <h1 class="text-2xl sm:text-3xl font-bold text-gray-900">Practice</h1>
        <p class="text-gray-500 mt-0.5 text-sm">{{ sourceLanguage }} · {{ availableWordCount }} words in pool</p>
      </div>
      <div v-if="dueData?.dueCount" class="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-100 rounded-lg">
        <AlertCircle class="w-4 h-4 text-orange-500 shrink-0" />
        <span class="text-sm text-orange-700 font-medium">{{ dueData.dueCount }} due for review</span>
      </div>
    </div>

    <div class="grid lg:grid-cols-3 gap-6">
      <!-- Game grid — primary action -->
      <div class="lg:col-span-2">
        <div class="grid sm:grid-cols-2 gap-3">
          <button
            v-for="game in gameInfoList" :key="game.type"
            @click="handleSelectGame(game.type)"
            :disabled="availableWordCount < game.minWords"
            :class="[
              'bg-white p-5 rounded-xl border text-left transition-all',
              availableWordCount < game.minWords
                ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                : 'border-gray-200 hover:border-primary-300 hover:shadow-sm'
            ]"
          >
            <div class="flex items-start gap-4">
              <span class="text-2xl leading-none mt-0.5 shrink-0">{{ game.icon }}</span>
              <div class="min-w-0">
                <h4 class="font-semibold text-gray-900 mb-0.5">{{ game.name }}</h4>
                <p class="text-sm text-gray-500 leading-snug">{{ game.description }}</p>
                <p v-if="availableWordCount < game.minWords" class="text-xs text-red-500 mt-1.5">
                  Needs {{ game.minWords }}+ words
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>

      <!-- Settings sidebar -->
      <div class="space-y-4">
        <!-- Compact vocab summary -->
        <div class="card p-4">
          <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Vocabulary</p>
          <div class="grid grid-cols-3 gap-2 text-center">
            <div>
              <p class="text-lg font-bold text-gray-900">{{ vocabStats?.learning || 0 }}</p>
              <p class="text-xs text-gray-500">Learning</p>
            </div>
            <div>
              <p class="text-lg font-bold text-gray-900">{{ vocabStats?.learned || 0 }}</p>
              <p class="text-xs text-gray-500">Learned</p>
            </div>
            <div>
              <p class="text-lg font-bold text-gray-900">{{ vocabStats?.mastered || 0 }}</p>
              <p class="text-xs text-gray-500">Mastered</p>
            </div>
          </div>
        </div>

        <!-- Word pool filter -->
        <div class="card p-4">
          <p class="text-sm font-medium text-gray-700 mb-3">Practice from</p>
          <div class="space-y-2.5">
            <label
              v-for="status in (['learning', 'learned', 'mastered'] as VocabularyStatus[])" :key="status"
              class="flex items-center gap-3 cursor-pointer"
            >
              <input
                type="checkbox"
                :checked="selectedStatuses.includes(status)"
                @change="toggleStatus(status)"
                class="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span class="text-sm text-gray-700 capitalize flex-1">{{ status }}</span>
              <span class="text-xs text-gray-400">{{ vocabStats?.[status] || 0 }}</span>
            </label>
          </div>
        </div>

        <!-- Words per session -->
        <div class="card p-4">
          <p class="text-sm font-medium text-gray-700 mb-3">Words per session</p>
          <div class="flex gap-2 flex-wrap">
            <button
              v-for="count in [5, 10, 15, 20, 30]" :key="count"
              @click="wordCount = count"
              :disabled="count > availableWordCount"
              :class="[
                'px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors',
                wordCount === count
                  ? 'bg-primary-600 border-primary-600 text-white'
                  : count > availableWordCount
                  ? 'border-gray-100 text-gray-300 bg-gray-50 cursor-not-allowed'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
              ]"
            >
              {{ count }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- CONFIG VIEW -->
  <div v-else-if="viewState === 'config' && activeGameInfo" class="max-w-sm mx-auto">
    <button @click="viewState = 'select'" class="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-5 transition-colors">
      <ChevronRight class="w-4 h-4 rotate-180" /> Back to games
    </button>
    <div class="card p-6">
      <div class="flex items-center gap-4 mb-6 pb-5 border-b border-gray-100">
        <span class="text-3xl leading-none">{{ activeGameInfo.icon }}</span>
        <div>
          <h2 class="text-lg font-bold text-gray-900">{{ activeGameInfo.name }}</h2>
          <p class="text-sm text-gray-500 mt-0.5">{{ activeGameInfo.description }}</p>
        </div>
      </div>

      <!-- Game-specific option: optionCount -->
      <div v-if="activeGameInfo.configOptions?.optionCount" class="mb-5">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          {{ activeGameInfo.configOptions!.optionCount!.label }}
        </label>
        <div class="flex gap-2">
          <button
            v-for="n in Array.from(
              { length: activeGameInfo.configOptions!.optionCount!.max - activeGameInfo.configOptions!.optionCount!.min + 1 },
              (_, i) => activeGameInfo.configOptions!.optionCount!.min + i
            )"
            :key="n"
            @click="gameConfig = { ...gameConfig, optionCount: n }"
            :class="[
              'flex-1 py-2 rounded-lg border text-sm font-medium transition-colors',
              (gameConfig.optionCount || activeGameInfo.configOptions!.optionCount!.default) === n
                ? 'bg-primary-600 border-primary-600 text-white'
                : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
            ]"
          >
            {{ n }}
          </button>
        </div>
      </div>

      <!-- Game-specific option: pairCount -->
      <div v-if="activeGameInfo.configOptions?.pairCount" class="mb-5">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          {{ activeGameInfo.configOptions!.pairCount!.label }}
        </label>
        <div class="flex gap-2">
          <button
            v-for="n in Array.from(
              { length: activeGameInfo.configOptions!.pairCount!.max - activeGameInfo.configOptions!.pairCount!.min + 1 },
              (_, i) => activeGameInfo.configOptions!.pairCount!.min + i
            )"
            :key="n"
            @click="gameConfig = { ...gameConfig, pairCount: n }"
            :disabled="n > availableWordCount"
            :class="[
              'flex-1 py-2 rounded-lg border text-sm font-medium transition-colors',
              (gameConfig.pairCount || activeGameInfo.configOptions!.pairCount!.default) === n
                ? 'bg-primary-600 border-primary-600 text-white'
                : n > availableWordCount
                ? 'border-gray-200 text-gray-300 bg-gray-50 cursor-not-allowed'
                : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
            ]"
          >
            {{ n }}
          </button>
        </div>
      </div>

      <!-- Session summary -->
      <div class="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3 mb-5 space-y-1.5">
        <div class="flex justify-between text-sm">
          <span class="text-gray-500">Words</span>
          <span class="font-medium text-gray-900">{{ wordCount }}</span>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-gray-500">Language</span>
          <span class="font-medium text-gray-900">{{ sourceLanguage }}</span>
        </div>
      </div>

      <button @click="handleStartGame" class="btn btn-primary w-full py-3">
        <Play class="w-5 h-5 mr-2" /> Start
      </button>
    </div>
  </div>

  <!-- LOADING VIEW -->
  <LoadingGame v-else-if="viewState === 'loading'" message="Preparing your practice session..." :progress="loadingProgress" />

  <!-- PLAYING VIEW -->
  <component
    v-else-if="viewState === 'playing' && activeGame && practiceWords.length > 0"
    :is="gameComponents[activeGame]"
    :words="practiceWords"
    :source-language="sourceLanguage"
    :target-language="targetLanguage"
    :config="gameConfig"
    :on-attempt="handleAttempt"
    :on-complete="handleComplete"
  />

  <!-- RESULTS VIEW -->
  <SessionResults
    v-else-if="viewState === 'results' && sessionStats && activeGameInfo"
    :stats="sessionStats"
    :game-icon="activeGameInfo.icon"
    :game-name="activeGameInfo.name"
    @play-again="handlePlayAgain"
    @exit="handleBackToSelect"
  />
</template>
