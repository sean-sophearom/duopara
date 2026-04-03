<script setup lang="ts">
import { computed } from 'vue';
import { X, Volume2, Check, Sparkles, Loader2 } from 'lucide-vue-next';
import type { WordInfo, SentenceInfo } from '../types';

const props = defineProps<{
  selectedWord: string | null;
  selectedSentence: string | null;
  wordInfo: WordInfo | null;
  sentenceInfo: SentenceInfo | null;
  isLoadingWord: boolean;
  isLoadingSentence: boolean;
  markedWords: Set<string>;
  isMarkingLearned: boolean;
}>();

const emit = defineEmits<{
  speak: [text: string];
  markLearned: [word: string];
  close: [];
}>();

const isMarked = computed(() =>
  props.selectedWord ? props.markedWords.has(props.selectedWord) : false
);
</script>

<template>
  <div
    class="fixed bottom-0 left-0 right-0 max-h-[60vh] sm:bottom-auto sm:left-auto sm:right-4 sm:top-20 lg:top-8 sm:w-80 sm:max-h-[calc(100vh-6rem)] overflow-y-auto z-30"
  >
    <div class="card p-6 animate-fade-in rounded-t-2xl sm:rounded-2xl">
      <button @click="emit('close')" class="absolute top-3 right-3 p-1 hover:bg-gray-100 rounded">
        <X class="w-4 h-4" />
      </button>

      <!-- Word info -->
      <div v-if="selectedWord">
        <div class="flex items-start justify-between gap-2 mb-4">
          <div>
            <h3 class="text-2xl font-bold text-gray-900">{{ selectedWord }}</h3>
            <p
              v-if="wordInfo?.baseForm && wordInfo.baseForm !== selectedWord"
              class="text-sm text-gray-500"
            >
              Base form: <span class="font-medium">{{ wordInfo.baseForm }}</span>
            </p>
          </div>
          <button
            @click="emit('speak', selectedWord)"
            class="p-2 hover:bg-gray-100 rounded-lg"
            title="Listen"
          >
            <Volume2 class="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div v-if="isLoadingWord" class="flex items-center justify-center py-8">
          <Loader2 class="w-6 h-6 animate-spin text-primary-600" />
        </div>

        <div v-else-if="wordInfo" class="space-y-4">
          <!-- Part of speech -->
          <div v-if="wordInfo.partOfSpeech" class="inline-block px-2 py-1 bg-gray-100 rounded text-sm text-gray-600">
            {{ wordInfo.partOfSpeech }}{{ wordInfo.gender ? ` (${wordInfo.gender})` : '' }}
          </div>

          <!-- Translation -->
          <div>
            <p class="text-xl font-medium text-gray-900">{{ wordInfo.translation }}</p>
            <p
              v-if="wordInfo.alternativeTranslations && wordInfo.alternativeTranslations.length > 0"
              class="text-sm text-gray-500 mt-1"
            >
              Also: {{ wordInfo.alternativeTranslations.join(', ') }}
            </p>
          </div>

          <!-- Conjugation info -->
          <div
            v-if="wordInfo.conjugation && Object.keys(wordInfo.conjugation).length > 0"
            class="p-3 bg-blue-50 rounded-lg"
          >
            <p class="text-sm font-medium text-blue-800 mb-1">Conjugation</p>
            <p class="text-sm text-blue-700">
              {{ wordInfo.conjugation.tense ? wordInfo.conjugation.tense : '' }}{{ wordInfo.conjugation.person ? `, ${wordInfo.conjugation.person}` : '' }}{{ wordInfo.conjugation.mood ? ` (${wordInfo.conjugation.mood})` : '' }}
            </p>
          </div>

          <!-- Contextual note -->
          <div v-if="wordInfo.contextualNote" class="p-3 bg-yellow-50 rounded-lg">
            <p class="text-sm text-yellow-800">
              <Sparkles class="w-4 h-4 inline mr-1" />
              {{ wordInfo.contextualNote }}
            </p>
          </div>

          <!-- Mark as learned button -->
          <button
            @click="emit('markLearned', selectedWord)"
            :disabled="isMarked || isMarkingLearned"
            :class="[
              'w-full btn',
              isMarked ? 'bg-green-100 text-green-700 cursor-default' : 'btn-primary',
            ]"
          >
            <template v-if="isMarked">
              <Check class="w-5 h-5 mr-2" />
              Marked as Learned
            </template>
            <template v-else-if="isMarkingLearned">
              <Loader2 class="w-5 h-5 animate-spin" />
            </template>
            <template v-else>
              <Check class="w-5 h-5 mr-2" />
              Mark as Learned
            </template>
          </button>
        </div>
      </div>

      <!-- Sentence info -->
      <div v-if="selectedSentence">
        <div class="flex items-start justify-between gap-2 mb-4">
          <h3 class="text-lg font-semibold text-gray-900">Sentence Translation</h3>
          <button
            @click="emit('speak', selectedSentence)"
            class="p-2 hover:bg-gray-100 rounded-lg"
            title="Listen"
          >
            <Volume2 class="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div v-if="isLoadingSentence" class="flex items-center justify-center py-8">
          <Loader2 class="w-6 h-6 animate-spin text-primary-600" />
        </div>

        <div v-else-if="sentenceInfo" class="space-y-4">
          <!-- Original sentence -->
          <div class="p-3 bg-gray-50 rounded-lg">
            <p class="text-sm text-gray-600 italic">{{ selectedSentence }}</p>
          </div>

          <!-- Translation -->
          <div>
            <p class="font-medium text-gray-900">{{ sentenceInfo.translation }}</p>
          </div>

          <!-- Literal translation -->
          <div v-if="sentenceInfo.literalTranslation" class="p-3 bg-purple-50 rounded-lg">
            <p class="text-sm font-medium text-purple-800 mb-1">Word-for-word</p>
            <p class="text-sm text-purple-700">{{ sentenceInfo.literalTranslation }}</p>
          </div>

          <!-- Grammar notes -->
          <div
            v-if="sentenceInfo.grammarNotes && sentenceInfo.grammarNotes.length > 0"
            class="p-3 bg-blue-50 rounded-lg"
          >
            <p class="text-sm font-medium text-blue-800 mb-2">Grammar Notes</p>
            <ul class="space-y-2">
              <li
                v-for="(note, idx) in sentenceInfo.grammarNotes"
                :key="idx"
                class="text-sm text-blue-700"
              >
                <span class="font-medium">{{ note.element }}:</span> {{ note.explanation }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
