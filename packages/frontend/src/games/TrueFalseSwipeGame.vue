<script setup lang="ts">
import { ref, computed } from 'vue';
import type { GameProps } from './types';
import { GAME_INFO } from './types';
import GameWrapper from './GameWrapper.vue';
import FeedbackOverlay from './FeedbackOverlay.vue';
import LoadingGame from './LoadingGame.vue';

const props = defineProps<GameProps>();
const gameInfo = GAME_INFO.truefalse;

const currentIndex = ref(0);
const correctCount = ref(0);
const incorrectCount = ref(0);
const showFeedback = ref(false);
const isCorrect = ref(false);
const swipeDirection = ref<'left' | 'right' | null>(null);

// Touch/drag state
const startX = ref(0);
const dragOffset = ref(0);
const isDragging = ref(false);

const currentWord = computed(() => props.words[currentIndex.value]);

// 50/50 whether we show the correct or false translation
const showCorrectArr = ref<boolean[]>(props.words.map(() => Math.random() > 0.5));
const showCorrect = computed(() => showCorrectArr.value[currentIndex.value]);

const displayedTranslation = computed(() => {
  if (!currentWord.value) return '';
  if (showCorrect.value) {
    return currentWord.value.gameData?.translation || '';
  }
  return currentWord.value.gameData?.falseTranslation
    || props.words[(currentIndex.value + 1) % props.words.length]?.gameData?.translation
    || 'Unknown';
});

function handleAnswer(userSaysTrue: boolean) {
  const correct = userSaysTrue === showCorrect.value;
  swipeDirection.value = userSaysTrue ? 'right' : 'left';
  isCorrect.value = correct;
  showFeedback.value = true;

  if (correct) correctCount.value++;
  else incorrectCount.value++;

  props.onAttempt({
    vocabularyWordId: currentWord.value.vocabularyWord.id,
    isCorrect: correct,
    questionData: {
      word: currentWord.value.vocabularyWord.word,
      displayedTranslation: displayedTranslation.value,
      wasCorrectPair: showCorrect.value,
    },
    userAnswer: userSaysTrue ? 'true' : 'false',
    correctAnswer: showCorrect.value ? 'true' : 'false',
  });
}

function handleContinue() {
  showFeedback.value = false;
  swipeDirection.value = null;
  dragOffset.value = 0;

  if (currentIndex.value < props.words.length - 1) {
    currentIndex.value++;
  } else {
    props.onComplete();
  }
}

function handleExit() {
  if (confirm('Are you sure you want to exit? Your progress will be saved.')) {
    props.onComplete();
  }
}

function handleDragStart(clientX: number) {
  if (showFeedback.value) return;
  startX.value = clientX;
  isDragging.value = true;
}

function handleDragMove(clientX: number) {
  if (!isDragging.value || showFeedback.value) return;
  dragOffset.value = clientX - startX.value;
}

function handleDragEnd() {
  if (!isDragging.value || showFeedback.value) return;
  isDragging.value = false;
  if (dragOffset.value > 100) handleAnswer(true);
  else if (dragOffset.value < -100) handleAnswer(false);
  else dragOffset.value = 0;
}

function getCardStyle() {
  if (swipeDirection.value === 'right') return { transform: 'translateX(500px) rotate(20deg)', opacity: 0 };
  if (swipeDirection.value === 'left') return { transform: 'translateX(-500px) rotate(-20deg)', opacity: 0 };
  if (isDragging.value) {
    const rotation = dragOffset.value / 20;
    return { transform: `translateX(${dragOffset.value}px) rotate(${rotation}deg)`, transition: 'none' };
  }
  return { transform: 'translateX(0) rotate(0deg)' };
}

function getOverlayOpacity() {
  return Math.min(Math.abs(dragOffset.value) / 150, 0.5);
}
</script>

<template>
  <LoadingGame v-if="currentWord?.loading" message="Preparing questions..." />
  <div v-else-if="!currentWord?.gameData?.translation" class="min-h-dvh bg-gray-50 flex items-center justify-center">
    <p class="text-red-600">This word doesn't have a translation.</p>
  </div>
  <GameWrapper
    v-else
    :game-name="gameInfo.name"
    :game-icon="gameInfo.icon"
    :current-index="currentIndex"
    :total-words="words.length"
    :correct-count="correctCount"
    :incorrect-count="incorrectCount"
    @exit="handleExit"
  >
    <div class="flex-1 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div class="mb-4 text-center">
        <p class="text-gray-600">Is this translation correct?</p>
        <p class="text-sm text-gray-500 mt-1">
          Swipe right for <span class="text-green-600 font-medium">TRUE</span>,
          left for <span class="text-red-600 font-medium">FALSE</span>
        </p>
      </div>

      <!-- Swipeable card -->
      <div
        class="relative w-full max-w-md cursor-grab active:cursor-grabbing"
        @mousedown="handleDragStart($event.clientX)"
        @mousemove="handleDragMove($event.clientX)"
        @mouseup="handleDragEnd"
        @mouseleave="handleDragEnd"
        @touchstart="handleDragStart($event.touches[0].clientX)"
        @touchmove="handleDragMove($event.touches[0].clientX)"
        @touchend="handleDragEnd"
      >
        <div
          class="bg-white rounded-2xl shadow-lg p-8 text-center transition-all duration-300 select-none"
          :style="getCardStyle()"
        >
          <!-- True overlay -->
          <div
            class="absolute inset-0 bg-green-500 rounded-2xl flex items-center justify-center transition-opacity"
            :style="{ opacity: dragOffset > 0 ? getOverlayOpacity() : 0 }"
          >
            <span class="text-white text-4xl font-bold">TRUE ✓</span>
          </div>
          <!-- False overlay -->
          <div
            class="absolute inset-0 bg-red-500 rounded-2xl flex items-center justify-center transition-opacity"
            :style="{ opacity: dragOffset < 0 ? getOverlayOpacity() : 0 }"
          >
            <span class="text-white text-4xl font-bold">FALSE ✗</span>
          </div>
          <!-- Card content -->
          <div class="relative z-10">
            <p class="text-sm text-gray-500 mb-2">{{ sourceLanguage }}</p>
            <h2 class="text-3xl font-bold text-gray-900 mb-6">{{ currentWord.vocabularyWord.word }}</h2>
            <div class="border-t pt-6">
              <p class="text-sm text-gray-500 mb-2">{{ targetLanguage }}</p>
              <p class="text-2xl text-gray-700">{{ displayedTranslation }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Button alternatives -->
      <div class="flex gap-4 mt-8">
        <button @click="handleAnswer(false)" :disabled="showFeedback"
          class="px-8 py-4 bg-red-100 text-red-700 rounded-full font-medium hover:bg-red-200 transition-colors flex items-center gap-2">
          <span class="text-2xl">👎</span> False
        </button>
        <button @click="handleAnswer(true)" :disabled="showFeedback"
          class="px-8 py-4 bg-green-100 text-green-700 rounded-full font-medium hover:bg-green-200 transition-colors flex items-center gap-2">
          True <span class="text-2xl">👍</span>
        </button>
      </div>

      <p class="mt-8 text-sm text-gray-500">{{ currentIndex + 1 }} of {{ words.length }}</p>
    </div>

    <FeedbackOverlay
      v-if="showFeedback"
      :is-correct="isCorrect"
      :correct-answer="`${currentWord.vocabularyWord.word} = ${currentWord.gameData!.translation}`"
      @continue="handleContinue"
    />
  </GameWrapper>
</template>
