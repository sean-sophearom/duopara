<script setup lang="ts">
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-vue-next';

defineProps<{
  difficulty: string;
  isSimplifying: boolean;
  isMakingHarder: boolean;
}>();

const emit = defineEmits<{
  simplify: [];
  harder: [];
}>();
</script>

<template>
  <div class="card p-4 mt-4">
    <div class="flex items-center justify-between">
      <span class="text-sm text-gray-600">Adjust difficulty:</span>
      <div class="flex gap-2">
        <button
          @click="emit('simplify')"
          :disabled="isSimplifying || difficulty === 'beginner'"
          class="btn btn-secondary text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          <template v-if="isSimplifying">
            <Loader2 class="w-4 h-4 animate-spin" />
          </template>
          <template v-else>
            <ChevronDown class="w-4 h-4 mr-1" />
            Simplify
          </template>
        </button>
        <button
          @click="emit('harder')"
          :disabled="isMakingHarder || difficulty === 'advanced'"
          class="btn btn-secondary text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          <template v-if="isMakingHarder">
            <Loader2 class="w-4 h-4 animate-spin" />
          </template>
          <template v-else>
            <ChevronUp class="w-4 h-4 mr-1" />
            Harder
          </template>
        </button>
      </div>
    </div>
  </div>
</template>
