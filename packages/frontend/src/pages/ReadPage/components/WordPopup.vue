<script setup lang="ts">
import { computed } from 'vue';
import { Volume2, BookOpen, Check } from 'lucide-vue-next';
import type { HoveredWord } from '../types';

const props = defineProps<{
  hoveredWord: HoveredWord;
  popupPos: { top: number; left: number };
  markedLearningWords: Set<string>;
  markedWords: Set<string>;
}>();

const emit = defineEmits<{
  speak: [word: string];
  markLearning: [word: string];
  markLearned: [word: string];
  mouseenter: [];
  mouseleave: [];
}>();

function cleanWordLocal(word: string): string {
  return word.replace(/[^\p{L}'-]/gu, '').toLowerCase();
}

const clean = computed(() => cleanWordLocal(props.hoveredWord.word));
const isLearning = computed(() => props.markedLearningWords.has(clean.value));
const isLearned = computed(() => props.markedWords.has(clean.value));
</script>

<template>
  <div
    class="fixed z-50 transform -translate-x-1/2 flex items-center bg-white border border-gray-200 shadow-lg rounded-full px-1.5 py-1 gap-1 animate-in fade-in zoom-in duration-200 pointer-events-auto"
    :style="{ top: `${popupPos.top}px`, left: `${popupPos.left}px` }"
    @mouseenter="emit('mouseenter')"
    @mouseleave="emit('mouseleave')"
  >
    <button
      @click.stop="emit('speak', hoveredWord.word)"
      class="p-1.5 hover:bg-gray-100 rounded-full text-gray-500 hover:text-primary-600 transition-colors"
      title="Pronounce"
    >
      <Volume2 class="w-4 h-4" />
    </button>
    <div class="w-px h-4 bg-gray-200" />
    <button
      @click.stop="emit('markLearning', clean)"
      :disabled="isLearning || isLearned"
      :class="[
        'p-1.5 rounded-full transition-colors',
        isLearning
          ? 'text-yellow-500 bg-yellow-50 cursor-default'
          : 'text-gray-500 hover:text-yellow-600 hover:bg-yellow-50',
      ]"
      title="Mark as Learning"
    >
      <BookOpen class="w-4 h-4" />
    </button>
    <div class="w-px h-4 bg-gray-200" />
    <button
      @click.stop="emit('markLearned', clean)"
      :disabled="isLearned"
      :class="[
        'p-1.5 rounded-full transition-colors',
        isLearned
          ? 'text-green-500 bg-green-50 cursor-default'
          : 'text-gray-500 hover:text-green-600 hover:bg-green-50',
      ]"
      title="Mark as Learned"
    >
      <Check class="w-4 h-4" />
    </button>
  </div>
</template>
