<script setup lang="ts">
import { ChevronLeft } from 'lucide-vue-next';

defineProps<{
  gameName: string;
  gameIcon: string;
  currentIndex: number;
  totalWords: number;
  correctCount: number;
  incorrectCount: number;
}>();

const emit = defineEmits<{ exit: [] }>();

function progress(currentIndex: number, totalWords: number) {
  return totalWords > 0 ? (currentIndex / totalWords) * 100 : 0;
}
</script>

<template>
  <div class="min-h-dvh bg-gray-50 flex flex-col">
    <!-- Header -->
    <div class="bg-white border-b px-4 py-3">
      <div class="max-w-2xl mx-auto flex items-center justify-between">
        <button @click="emit('exit')" class="flex items-center gap-2 text-gray-600 hover:text-gray-900">
          <ChevronLeft class="w-5 h-5" />
          <span>Exit</span>
        </button>
        <div class="flex items-center gap-2">
          <span class="text-xl">{{ gameIcon }}</span>
          <span class="font-medium">{{ gameName }}</span>
        </div>
        <div class="flex items-center gap-3 text-sm">
          <span class="text-green-600 font-medium">{{ correctCount }} ✓</span>
          <span class="text-red-600 font-medium">{{ incorrectCount }} ✗</span>
        </div>
      </div>
    </div>
    <!-- Progress bar -->
    <div class="bg-gray-200 h-2">
      <div class="bg-blue-500 h-full transition-all duration-300" :style="{ width: `${progress(currentIndex, totalWords)}%` }" />
    </div>
    <!-- Game content -->
    <div class="flex-1 flex flex-col">
      <slot />
    </div>
  </div>
</template>
