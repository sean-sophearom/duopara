<script setup lang="ts">
import { onMounted, ref } from 'vue';

const props = defineProps<{
  isCorrect: boolean;
  correctAnswer: string;
}>();

const emit = defineEmits<{ continue: [] }>();

const hasTriggered = ref(false);

onMounted(() => {
  if (props.isCorrect && !hasTriggered.value) {
    const timer = setTimeout(() => {
      hasTriggered.value = true;
      emit('continue');
    }, 600);
    return () => clearTimeout(timer);
  }
});
</script>

<template>
  <!-- No overlay for correct - auto-advance -->
  <template v-if="!isCorrect">
    <div class="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t shadow-lg">
      <div class="max-w-2xl mx-auto flex items-center justify-between">
        <div class="flex-1">
          <p class="text-sm text-gray-500">Correct answer:</p>
          <p class="font-medium text-gray-900">{{ correctAnswer }}</p>
        </div>
        <button @click="emit('continue')" class="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
          Got it
        </button>
      </div>
    </div>
  </template>
</template>
