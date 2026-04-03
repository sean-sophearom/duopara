<script setup lang="ts">
import { cleanWord } from '../utils';

defineProps<{
  sentence: string;
  sIdx: number;
  selectedWord: string | null;
  knownWordsSet: Set<string>;
  newWordsSet: Set<string>;
  markedWords: Set<string>;
  markedLearningWords: Set<string>;
  highlightLearned: boolean;
  highlightLearning: boolean;
  highlightNew: boolean;
}>();

const emit = defineEmits<{
  wordClick: [word: string, sentence: string];
  sentenceClick: [sentence: string];
  wordHover: [word: string | null, sentence: string, target: HTMLElement | null];
}>();

function splitWords(sentence: string): string[] {
  return sentence.split(/(\s+)/);
}

function isWhitespace(part: string): boolean {
  return /^\s+$/.test(part);
}

function getWordClass(
  part: string,
  selectedWord: string | null,
  knownWordsSet: Set<string>,
  newWordsSet: Set<string>,
  markedWords: Set<string>,
  markedLearningWords: Set<string>,
  highlightLearned: boolean,
  highlightLearning: boolean,
  highlightNew: boolean
): string {
  const clean = cleanWord(part);
  const isSelected = selectedWord === clean;
  const isMarked = markedWords.has(clean);
  const isLearning = markedLearningWords.has(clean);
  const isNew = newWordsSet.has(clean);
  const isKnown = knownWordsSet.has(clean);

  const classes = ['word', 'cursor-pointer', 'rounded', 'px-0.5', 'transition-all', 'duration-150'];

  if (isSelected) classes.push('bg-primary-200', 'ring-2', 'ring-primary-400');
  if (isMarked && highlightLearned) classes.push('bg-green-100', 'text-green-800');
  if (isLearning && !isMarked && highlightLearning) classes.push('bg-yellow-100', 'text-yellow-800');
  if (isNew && !isMarked && !isLearning && highlightNew) classes.push('text-primary-700', 'font-medium');
  if (!isNew && !isMarked && !isLearning && isKnown) classes.push('text-gray-800');
  classes.push('hover:bg-primary-100');

  return classes.join(' ');
}
</script>

<template>
  <template v-for="(part, wIdx) in splitWords(sentence)" :key="`${sIdx}-${wIdx}`">
    <span v-if="isWhitespace(part)" @click="emit('sentenceClick', sentence)">{{ part }}</span>
    <span
      v-else
      @click="emit('wordClick', part, sentence)"
      @mouseenter="emit('wordHover', part, sentence, $event.currentTarget as HTMLElement)"
      @mouseleave="emit('wordHover', null, sentence, null)"
      :class="getWordClass(part, selectedWord, knownWordsSet, newWordsSet, markedWords, markedLearningWords, highlightLearned, highlightLearning, highlightNew)"
    >{{ part }}</span>
  </template>
</template>
