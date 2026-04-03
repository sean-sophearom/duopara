<script setup lang="ts">
import { ref, computed } from 'vue';
import type { GameProps } from './types';
import { GAME_INFO } from './types';
import { useQuizGame, shuffleArray, getDistractors } from './useQuizGame';
import GameWrapper from './GameWrapper.vue';
import FeedbackOverlay from './FeedbackOverlay.vue';
import LoadingGame from './LoadingGame.vue';
import QuizOptions from './QuizOptions.vue';

const props = defineProps<GameProps>();
const quiz = useQuizGame({ words: props.words, onAttempt: props.onAttempt, onComplete: props.onComplete });
const sentenceIndex = ref(0);
const optionCount = props.config.optionCount || 4;
const gameInfo = GAME_INFO.fillblank;

const currentSentence = computed(() => {
  if (!quiz.currentWord.value?.gameData?.exampleSentences?.length) return null;
  const sentences = quiz.currentWord.value.gameData.exampleSentences;
  return sentences[sentenceIndex.value % sentences.length];
});

const options = computed(() => {
  if (!currentSentence.value) return [];
  const correctWord = currentSentence.value.blankWord;
  const distractors = getDistractors(props.words, quiz.currentWord.value, optionCount - 1, 'word');
  return shuffleArray([correctWord, ...distractors]);
});

const correctAnswer = computed(() => currentSentence.value?.blankWord || '');

function handleContinue() {
  sentenceIndex.value = 0;
  quiz.handleContinue();
}

function renderSentenceParts(sentence: string) {
  return sentence.split('___');
}
</script>

<template>
  <LoadingGame v-if="quiz.currentWord.value?.loading" message="Preparing sentences..." />
  <div v-else-if="!quiz.currentWord.value?.gameData?.exampleSentences?.length" class="min-h-dvh bg-gray-50 flex items-center justify-center p-4">
    <div class="text-center">
      <p class="text-red-600 mb-4">No example sentences available for this word.</p>
      <button
        @click="() => { if (quiz.currentIndex.value < words.length - 1) { sentenceIndex = 0; quiz.handleContinue(); } else { onComplete(); } }"
        class="px-4 py-2 bg-blue-600 text-white rounded-lg"
      >
        Skip to next
      </button>
    </div>
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
      <div class="mb-8 text-center max-w-2xl">
        <p class="text-sm text-gray-500 mb-4">Fill in the blank:</p>
        <p class="text-2xl text-gray-900 leading-relaxed">
          {{ renderSentenceParts(currentSentence!.sentence)[0] }}
          <span class="inline-block min-w-[80px] border-b-2 border-blue-500 mx-1 text-center text-transparent">
            {{ quiz.selectedAnswer.value || '____' }}
          </span>
          {{ renderSentenceParts(currentSentence!.sentence)[1] }}
        </p>
      </div>

      <QuizOptions
        :options="options"
        :selected-answer="quiz.selectedAnswer.value"
        :correct-answer="correctAnswer"
        :current-index="quiz.currentIndex.value"
        layout="grid"
        :show-letters="false"
        @select="(answer: string) => quiz.handleSelect(answer, correctAnswer, {
          sentence: currentSentence!.sentence,
          fullSentence: currentSentence!.fullSentence,
          options,
        })"
      />

      <p class="mt-8 text-sm text-gray-500">{{ quiz.currentIndex.value + 1 }} of {{ words.length }}</p>
    </div>

    <FeedbackOverlay
      v-if="quiz.showFeedback.value"
      :is-correct="quiz.isCorrect.value"
      :correct-answer="`${currentSentence!.blankWord} — &quot;${currentSentence!.fullSentence}&quot;`"
      @continue="handleContinue"
    />
  </GameWrapper>
</template>
