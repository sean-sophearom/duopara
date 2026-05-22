<script setup lang="ts">
import { BookOpen } from 'lucide-vue-next';

defineProps<{
  subtitle: string;
}>();
</script>

<template>
  <div class="min-h-dvh flex items-center justify-center bg-gradient-to-br from-primary-50 to-accent-50 px-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-600 text-white mb-4">
          <BookOpen class="w-8 h-8" />
        </div>
        <h1 class="text-3xl font-bold text-gray-900">Kontexi</h1>
        <p class="text-gray-600 mt-2">{{ subtitle }}</p>
      </div>
      <slot />
    </div>
  </div>
</template>
