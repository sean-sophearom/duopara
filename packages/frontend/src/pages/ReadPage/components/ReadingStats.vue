<script setup lang="ts">
import { BookOpen } from 'lucide-vue-next';

defineProps<{
  newWordsCount: number;
  markedWordsCount: number;
  language: string;
}>();
</script>

<template>
  <div class="card p-4 mt-4">
    <div class="flex items-center justify-between text-sm">
      <div class="flex items-center gap-4">
        <span class="text-gray-600">
          <span class="text-primary-600 font-medium">{{ newWordsCount }}</span> new words
        </span>
        <span class="text-gray-600">
          <span class="text-green-600 font-medium">{{ markedWordsCount }}</span> marked as learned
        </span>
      </div>
      <div class="flex items-center gap-1 text-gray-500">
        <BookOpen class="w-4 h-4" />
        <span>{{ language }}</span>
      </div>
    </div>
  </div>
</template>
