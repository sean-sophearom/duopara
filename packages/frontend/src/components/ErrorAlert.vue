<script setup lang="ts">
import { AlertCircle } from 'lucide-vue-next';

defineProps<{
  error: string;
}>();

const emit = defineEmits<{
  dismiss: [];
}>();
</script>

<template>
  <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
    <AlertCircle class="w-5 h-5 flex-shrink-0" />
    <span class="text-sm">{{ error }}</span>
    <button @click="emit('dismiss')" class="ml-auto text-red-500 hover:text-red-700">
      &times;
    </button>
  </div>
</template>
