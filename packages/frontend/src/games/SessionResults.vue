<script setup lang="ts">
import type { SessionStats } from './types';

defineProps<{
  stats: SessionStats;
  gameIcon: string;
  gameName: string;
}>();

const emit = defineEmits<{ playAgain: []; exit: [] }>();

function getGrade(accuracy: number) {
  if (accuracy >= 90) return { grade: 'A', color: 'text-green-600', message: 'Excellent!' };
  if (accuracy >= 80) return { grade: 'B', color: 'text-blue-600', message: 'Great job!' };
  if (accuracy >= 70) return { grade: 'C', color: 'text-yellow-600', message: 'Good effort!' };
  if (accuracy >= 60) return { grade: 'D', color: 'text-orange-600', message: 'Keep practicing!' };
  return { grade: 'F', color: 'text-red-600', message: 'Try again!' };
}
</script>

<template>
  <div class="min-h-dvh bg-gray-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
      <div class="text-6xl mb-4">{{ gameIcon }}</div>
      <h2 class="text-2xl font-bold mb-2">{{ gameName }} Complete!</h2>
      <p class="text-gray-600 mb-6">{{ getGrade(stats.accuracy).message }}</p>

      <div :class="['w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6', getGrade(stats.accuracy).color]">
        <span class="text-5xl font-bold">{{ getGrade(stats.accuracy).grade }}</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div class="bg-gray-50 rounded-lg p-4">
          <div class="text-3xl font-bold text-blue-600">{{ stats.accuracy }}%</div>
          <div class="text-sm text-gray-600">Accuracy</div>
        </div>
        <div class="bg-gray-50 rounded-lg p-4">
          <div class="text-3xl font-bold text-purple-600">{{ stats.avgTimeMs ? `${(stats.avgTimeMs / 1000).toFixed(1)}s` : '-' }}</div>
          <div class="text-sm text-gray-600">Avg Time</div>
        </div>
        <div class="bg-gray-50 rounded-lg p-4">
          <div class="text-3xl font-bold text-green-600">{{ stats.correctCount }}</div>
          <div class="text-sm text-gray-600">Correct</div>
        </div>
        <div class="bg-gray-50 rounded-lg p-4">
          <div class="text-3xl font-bold text-red-600">{{ stats.incorrectCount }}</div>
          <div class="text-sm text-gray-600">Incorrect</div>
        </div>
      </div>

      <div class="flex gap-3 flex-col sm:flex-row">
        <button @click="emit('exit')" class="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          Back to Practice
        </button>
        <button @click="emit('playAgain')" class="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          Play Again
        </button>
      </div>
    </div>
  </div>
</template>
