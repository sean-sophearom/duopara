<script setup lang="ts">
import { Languages, Eye, EyeOff, Loader2 } from 'lucide-vue-next';

type TranslationMode = 'natural' | 'literal' | 'enhanced';

defineProps<{
  hasTranslations: boolean;
  isTranslating: boolean;
  showParallelTranslation: boolean;
  translationMode: TranslationMode;
  isLoadingEnhanced: boolean;
}>();

const emit = defineEmits<{
  translateAll: [];
  toggleParallelView: [];
  setMode: [mode: TranslationMode];
}>();

const modes: TranslationMode[] = ['natural', 'literal', 'enhanced'];
</script>

<template>
  <template v-if="hasTranslations">
    <!-- Natural / Literal / Enhanced pill — only when panel is open -->
    <div
      v-if="showParallelTranslation"
      class="flex items-center rounded-lg overflow-hidden border border-gray-200 text-sm font-medium"
    >
      <button
        v-for="mode in modes"
        :key="mode"
        @click="emit('setMode', mode)"
        :disabled="mode === 'enhanced' && isLoadingEnhanced"
        :class="[
          'px-3 py-1.5 transition-colors capitalize',
          translationMode === mode
            ? 'bg-primary-600 text-white'
            : 'bg-white text-gray-600 hover:bg-gray-50',
          mode === 'enhanced' && isLoadingEnhanced ? 'opacity-60' : '',
        ]"
      >
        <span v-if="mode === 'enhanced' && isLoadingEnhanced" class="flex items-center gap-1">
          <Loader2 class="w-3 h-3 animate-spin" />
          Enhanced
        </span>
        <template v-else>{{ mode }}</template>
      </button>
    </div>
    <button
      @click="emit('toggleParallelView')"
      :class="[
        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
        showParallelTranslation
          ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
      ]"
      :title="showParallelTranslation ? 'Hide translation' : 'Show translation'"
    >
      <EyeOff v-if="showParallelTranslation" class="w-4 h-4" />
      <Eye v-else class="w-4 h-4" />
      Translation
    </button>
  </template>

  <button
    v-else
    @click="emit('translateAll')"
    :disabled="isTranslating"
    class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-60 transition-colors"
    title="Translate entire text sentence by sentence"
  >
    <Loader2 v-if="isTranslating" class="w-4 h-4 animate-spin" />
    <Languages v-else class="w-4 h-4" />
    {{ isTranslating ? 'Translating…' : 'Translate All' }}
  </button>
</template>
