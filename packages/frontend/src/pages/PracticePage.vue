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
  <div v-if="viewState === 'select'" class="max-w-4xl mx-auto">
    <div class="mb-8">
      <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Practice Vocabulary</h1>
      <p class="text-gray-600">Choose a game to practice your words</p>
    </div>

    <!-- Stats overview -->
    <div class="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
      <div class="bg-blue-50 rounded-lg p-4 text-center">
        <BookOpen class="w-6 h-6 mx-auto mb-2 text-blue-600" />
        <div class="text-2xl font-bold text-blue-900">{{ vocabStats?.learning || 0 }}</div>
        <div class="text-sm text-blue-600">Learning</div>
      </div>
      <div class="bg-green-50 rounded-lg p-4 text-center">
        <GraduationCap class="w-6 h-6 mx-auto mb-2 text-green-600" />
        <div class="text-2xl font-bold text-green-900">{{ vocabStats?.learned || 0 }}</div>
        <div class="text-sm text-green-600">Learned</div>
      </div>
      <div class="bg-purple-50 rounded-lg p-4 text-center">
        <Trophy class="w-6 h-6 mx-auto mb-2 text-purple-600" />
        <div class="text-2xl font-bold text-purple-900">{{ vocabStats?.mastered || 0 }}</div>
        <div class="text-sm text-purple-600">Mastered</div>
      </div>
      <div class="bg-orange-50 rounded-lg p-4 text-center">
        <AlertCircle class="w-6 h-6 mx-auto mb-2 text-orange-600" />
        <div class="text-2xl font-bold text-orange-900">{{ dueData?.dueCount || 0 }}</div>
        <div class="text-sm text-orange-600">Due for Review</div>
      </div>
    </div>

    <!-- Filter by status -->
    <div class="bg-white rounded-lg border p-4 mb-6">
      <h3 class="font-medium text-gray-900 mb-3">Practice words that are:</h3>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="status in (['learning', 'learned', 'mastered'] as VocabularyStatus[])" :key="status"
          @click="toggleStatus(status)"
          :class="[
            'px-4 py-2 rounded-full text-sm font-medium transition-colors',
            selectedStatuses.includes(status)
              ? status === 'learning' ? 'bg-blue-600 text-white'
                : status === 'learned' ? 'bg-green-600 text-white'
                : 'bg-purple-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          ]"
        >
          {{ status.charAt(0).toUpperCase() + status.slice(1) }}
        </button>
      </div>
      <p class="text-sm text-gray-500 mt-2">{{ availableWordCount }} words available</p>
    </div>

    <!-- Word count selector -->
    <div class="bg-white rounded-lg border p-4 mb-6">
      <h3 class="font-medium text-gray-900 mb-3">Number of words:</h3>
      <div class="grid grid-cols-2 sm:flex gap-2">
        <button
          v-for="count in [5, 10, 15, 20, 30]" :key="count"
          @click="wordCount = count"
          :disabled="count > availableWordCount || count >= 15"
          :class="[
            'px-4 py-2 rounded-lg transition-colors',
            wordCount === count ? 'bg-blue-600 text-white'
              : count > availableWordCount || count >= 15 ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          ]"
        >
          {{ count }}
        </button>
      </div>
    </div>

    <!-- Game cards -->
    <h3 class="font-medium text-gray-900 mb-4">Choose a game:</h3>
    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      <button
        v-for="game in gameInfoList" :key="game.type"
        @click="handleSelectGame(game.type)"
        :disabled="availableWordCount < game.minWords"
        :class="[
          'p-6 rounded-xl border-2 text-left transition-all',
          availableWordCount < game.minWords
            ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
            : 'border-gray-200 bg-white hover:border-blue-400 hover:shadow-lg'
        ]"
      >
        <div class="text-3xl mb-3">{{ game.icon }}</div>
        <h4 class="font-semibold text-gray-900 mb-1">{{ game.name }}</h4>
        <p class="text-sm text-gray-600">{{ game.description }}</p>
        <p v-if="availableWordCount < game.minWords" class="text-xs text-red-500 mt-2">
          Requires at least {{ game.minWords }} words
        </p>
      </button>
    </div>
  </div>

  <!-- CONFIG VIEW -->
  <div v-else-if="viewState === 'config' && activeGameInfo" class="max-w-md mx-auto p-6 flex-1 flex flex-col">
    <button @click="viewState = 'select'" class="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
      <ChevronRight class="w-5 h-5 rotate-180" /> Back
    </button>
    <div class="bg-white rounded-xl border p-6 my-auto">
      <div class="text-center mb-6">
        <div class="text-5xl mb-3">{{ activeGameInfo.icon }}</div>
        <h2 class="text-2xl font-bold text-gray-900">{{ activeGameInfo.name }}</h2>
        <p class="text-gray-600 mt-1">{{ activeGameInfo.description }}</p>
      </div>

      <!-- Game-specific option: optionCount -->
      <div v-if="activeGameInfo.configOptions?.optionCount" class="space-y-4 mb-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            {{ activeGameInfo.configOptions!.optionCount!.label }}
          </label>
          <div class="grid grid-cols-2 gap-2 sm:flex">
            <button
              v-for="n in Array.from(
                { length: activeGameInfo.configOptions!.optionCount!.max - activeGameInfo.configOptions!.optionCount!.min + 1 },
                (_, i) => activeGameInfo.configOptions!.optionCount!.min + i
              )"
              :key="n"
              @click="gameConfig = { ...gameConfig, optionCount: n }"
              :class="[
                'flex-1 py-2 rounded-lg transition-colors',
                (gameConfig.optionCount || activeGameInfo.configOptions!.optionCount!.default) === n
                  ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              ]"
            >
              {{ n }}
            </button>
          </div>
        </div>
      </div>

      <!-- Game-specific option: pairCount -->
      <div v-if="activeGameInfo.configOptions?.pairCount" class="space-y-4 mb-6">
        <div>
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
                'flex-1 py-2 rounded-lg transition-colors',
                (gameConfig.pairCount || activeGameInfo.configOptions!.pairCount!.default) === n
                  ? 'bg-blue-600 text-white'
                  : n > availableWordCount ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              ]"
            >
              {{ n }}
            </button>
          </div>
        </div>
      </div>

      <!-- Summary -->
      <div class="bg-gray-50 rounded-lg p-4 mb-6">
        <div class="flex justify-between text-sm mb-2">
          <span class="text-gray-600">Words</span>
          <span class="font-medium">{{ wordCount }}</span>
        </div>
        <div class="flex justify-between text-sm mb-2">
          <span class="text-gray-600">Source</span>
          <span class="font-medium">{{ sourceLanguage }}</span>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-gray-600">Target</span>
          <span class="font-medium">{{ targetLanguage }}</span>
        </div>
      </div>

      <button @click="handleStartGame" class="w-full py-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
        <Play class="w-5 h-5" /> Start Game
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
