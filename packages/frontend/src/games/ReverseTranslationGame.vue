<script setup lang="ts">
import { computed } from 'vue';
import type { GameProps } from './types';
import { GAME_INFO } from './types';
import { useQuizGame, shuffleArray, getDistractors } from './useQuizGame';
import GameWrapper from './GameWrapper.vue';
import FeedbackOverlay from './FeedbackOverlay.vue';
import LoadingGame from './LoadingGame.vue';
import QuizOptions from './QuizOptions.vue';

const props = defineProps<GameProps>();
const quiz = useQuizGame({ words: props.words, onAttempt: props.onAttempt, onComplete: props.onComplete });
const optionCount = props.config.optionCount || 4;
const gameInfo = GAME_INFO.reverse;

const options = computed(() => {
  if (!quiz.currentWord.value?.vocabularyWord.word) return [];
  const correctWord = quiz.currentWord.value.vocabularyWord.word;
  const distractors = getDistractors(props.words, quiz.currentWord.value, optionCount - 1, 'word');
  return shuffleArray([correctWord, ...distractors]);
});

const correctAnswer = computed(() => quiz.currentWord.value?.vocabularyWord.word || '');
</script>

<template>
  <LoadingGame v-if="quiz.currentWord.value?.loading" message="Preparing questions..." />
  <div v-else-if="!quiz.currentWord.value?.gameData?.translation" class="min-h-dvh bg-gray-50 flex items-center justify-center">
    <p class="text-red-600">This word doesn't have a translation.</p>
  </div>
  <GameWrapper
    v-else
    :game-name="gameInfo.name"
    :game-icon="gameInfo.icon"
    :current-index="quiz.currentIndex.value"
    :total-words="words.length"
    :correct-count="quiz.correctCount.value"
    :incorrect-count="quiz.incorrectCount.value"
    @exit="quiz.handleExit"
  >
    <div class="flex-1 flex flex-col items-center justify-center p-4">
      <div class="mb-8 text-center">
        <p class="text-sm text-gray-500 mb-2">What is the {{ sourceLanguage }} word for:</p>
        <h2 class="text-4xl font-bold text-gray-900">{{ quiz.currentWord.value.gameData!.translation }}</h2>
      </div>

      <QuizOptions
        :options="options"
        :selected-answer="quiz.selectedAnswer.value"
        :correct-answer="correctAnswer"
        :current-index="quiz.currentIndex.value"
        @select="(answer: string) => quiz.handleSelect(answer, correctAnswer, { translation: quiz.currentWord.value.gameData!.translation, options })"
      />

      <p class="mt-8 text-sm text-gray-500">{{ quiz.currentIndex.value + 1 }} of {{ words.length }}</p>
    </div>

    <FeedbackOverlay
      v-if="quiz.showFeedback.value"
      :is-correct="quiz.isCorrect.value"
      :correct-answer="correctAnswer"
      @continue="quiz.handleContinue"
    />
  </GameWrapper>
</template>
