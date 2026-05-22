<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue';
import type { GameProps } from './types';
import { GAME_INFO } from './types';
import { shuffleArray } from './useQuizGame';
import GameWrapper from './GameWrapper.vue';
import LoadingGame from './LoadingGame.vue';

interface Tile {
  id: string;
  content: string;
  type: 'word' | 'translation';
  wordId: string;
  matched: boolean;
}

const props = defineProps<GameProps>();
const pairCount = props.config.pairCount || 5;
const gameInfo = GAME_INFO.matching;

const correctCount = ref(0);
const incorrectCount = ref(0);
const selectedTile = ref<Tile | null>(null);
const matchedPairs = ref<Set<string>>(new Set());
const wrongPair = ref<[string, string] | null>(null);
const isComplete = ref(false);
const completionFired = ref(false);

const isLoading = computed(() => props.words.some(w => w.loading));

const gameWords = computed(() => {
  const validWords = props.words.filter(w => w.gameData?.translation);
  return validWords.slice(0, pairCount);
});

const tiles = computed(() => {
  const allTiles: Tile[] = [];
  gameWords.value.forEach(word => {
    allTiles.push({
      id: `word-${word.vocabularyWord.id}`,
      content: word.vocabularyWord.word,
      type: 'word',
      wordId: word.vocabularyWord.id,
      matched: false,
    });
    allTiles.push({
      id: `trans-${word.vocabularyWord.id}`,
      content: word.gameData!.translation,
      type: 'translation',
      wordId: word.vocabularyWord.id,
      matched: false,
    });
  });
  return shuffleArray(allTiles);
});

watch(matchedPairs, (mp) => {
  if (completionFired.value) return;
  if (mp.size === gameWords.value.length && gameWords.value.length > 0) {
    completionFired.value = true;
    isComplete.value = true;
    gameWords.value.forEach(word => {
      props.onAttempt({
        vocabularyWordId: word.vocabularyWord.id,
        isCorrect: true,
        questionData: { gameType: 'matching', pairCount },
        userAnswer: word.gameData!.translation,
        correctAnswer: word.gameData!.translation,
      });
    });
    setTimeout(() => props.onComplete(), 1000);
  }
}, { deep: true });

let wrongTimer: ReturnType<typeof setTimeout> | null = null;
watch(wrongPair, (wp) => {
  if (wp) {
    wrongTimer = setTimeout(() => { wrongPair.value = null; }, 600);
  }
});
onUnmounted(() => { if (wrongTimer) clearTimeout(wrongTimer); });

function handleTileClick(tile: Tile) {
  if (matchedPairs.value.has(tile.wordId)) return;

  if (!selectedTile.value) {
    selectedTile.value = tile;
    return;
  }
  if (selectedTile.value.id === tile.id) {
    selectedTile.value = null;
    return;
  }
  if (selectedTile.value.type === tile.type) {
    selectedTile.value = tile;
    return;
  }

  if (selectedTile.value.wordId === tile.wordId) {
    matchedPairs.value = new Set([...matchedPairs.value, tile.wordId]);
    correctCount.value++;
    selectedTile.value = null;
  } else {
    wrongPair.value = [selectedTile.value.id, tile.id];
    incorrectCount.value++;
    const word = gameWords.value.find(w => w.vocabularyWord.id === selectedTile.value!.wordId);
    if (word) {
      props.onAttempt({
        vocabularyWordId: word.vocabularyWord.id,
        isCorrect: false,
        questionData: { gameType: 'matching', selectedPair: [selectedTile.value.content, tile.content] },
        userAnswer: tile.content,
        correctAnswer: word.gameData!.translation,
      });
    }
    selectedTile.value = null;
  }
}

function handleExit() {
  if (confirm('Are you sure you want to exit? Your progress will be saved.')) {
    props.onComplete();
  }
}

function getTileClass(tile: Tile) {
  const isMatched = matchedPairs.value.has(tile.wordId);
  const isSelected = selectedTile.value?.id === tile.id;
  const isWrong = wrongPair.value?.includes(tile.id);

  let cls = 'p-4 rounded-xl text-center font-medium transition-all duration-200 ';
  if (isMatched) cls += 'bg-green-100 text-green-800 border-2 border-green-300 opacity-60';
  else if (isWrong) cls += 'bg-red-100 text-red-800 border-2 border-red-500 animate-shake';
  else if (isSelected) cls += 'bg-blue-100 text-blue-800 border-2 border-blue-500 scale-105';
  else cls += 'bg-white text-gray-800 border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer';
  return cls;
}

const gridCols = computed(() =>
  gameWords.value.length === 3 ? 'grid-cols-3' :
  gameWords.value.length === 4 ? 'grid-cols-4' : 'grid-cols-5'
);
</script>

<template>
  <LoadingGame v-if="isLoading" message="Preparing matching game..." />
  <div v-else-if="gameWords.length < 2" class="min-h-dvh bg-gray-50 flex items-center justify-center">
    <p class="text-red-600">Not enough words with translations for matching game.</p>
  </div>
  <GameWrapper
    v-else
    :game-name="gameInfo.name"
    :game-icon="gameInfo.icon"
    :current-index="matchedPairs.size"
    :total-words="gameWords.length"
    :correct-count="correctCount"
    :incorrect-count="incorrectCount"
    @exit="handleExit"
  >
    <div class="flex-1 flex flex-col items-center justify-center p-4">
      <div class="mb-6 text-center">
        <p class="text-gray-600">Match each {{ sourceLanguage }} word with its {{ targetLanguage }} translation</p>
        <p class="text-sm text-gray-500 mt-1">{{ matchedPairs.size }} of {{ gameWords.length }} pairs matched</p>
      </div>

      <div :class="['grid gap-3 max-w-4xl w-full', gridCols]">
        <button
          v-for="tile in tiles" :key="tile.id"
          @click="handleTileClick(tile)"
          :disabled="matchedPairs.has(tile.wordId) || isComplete"
          :class="getTileClass(tile)"
        >
          <span class="block text-xs text-gray-400 mb-1">{{ tile.type === 'word' ? sourceLanguage : targetLanguage }}</span>
          {{ tile.content }}
        </button>
      </div>

      <div v-if="isComplete" class="mt-6 p-4 bg-green-100 rounded-lg text-green-800 text-center">
        <p class="text-xl font-bold">All pairs matched!</p>
      </div>
    </div>

  </GameWrapper>
</template>

<style scoped>
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
  }
  .animate-shake {
    animation: shake 0.3s ease-in-out 2;
  }
</style>