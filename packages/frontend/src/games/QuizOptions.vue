<script setup lang="ts">
defineProps<{
  options: string[];
  selectedAnswer: string | null;
  correctAnswer: string;
  currentIndex: number;
  layout?: 'list' | 'grid';
  showLetters?: boolean;
}>();

const emit = defineEmits<{ select: [option: string] }>();
</script>

<template>
  <div :class="layout === 'grid' ? 'w-full max-w-xl grid grid-cols-2 gap-3' : 'w-full max-w-xl space-y-3'">
    <button
      v-for="(option, index) in options"
      :key="`${currentIndex}-${index}`"
      @click="emit('select', option)"
      :disabled="!!selectedAnswer"
      :class="[
        layout === 'grid' ? 'p-4 rounded-lg border-2 text-center transition-all' : 'w-full p-4 rounded-lg border-2 text-left transition-all',
        selectedAnswer
          ? option === correctAnswer
            ? 'border-green-500 bg-green-50 text-green-800'
            : option === selectedAnswer
              ? 'border-red-500 bg-red-50 text-red-800'
              : 'border-gray-200 bg-gray-50 text-gray-400'
          : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer'
      ]"
    >
      <span v-if="showLetters !== false" class="font-medium mr-2">{{ String.fromCharCode(65 + index) }}.</span>
      {{ option }}
    </button>
  </div>
</template>
