<script setup lang="ts">
defineProps<{
  message?: string;
  progress?: number;
}>();
</script>

<template>
  <div class="min-h-dvh bg-gray-50 flex items-center justify-center">
    <div class="text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
      <p class="text-gray-600">{{ message || 'Loading game data...' }}</p>
      <div v-if="progress !== undefined" class="mt-4 w-48 bg-gray-200 rounded-full h-2 mx-auto">
        <div class="bg-blue-600 h-2 rounded-full transition-all duration-300" :style="{ width: `${progress}%` }" />
      </div>
    </div>
  </div>
</template>
