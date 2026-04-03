<script setup lang="ts">
import { ref, computed } from 'vue';
import { Volume2, Loader2, Highlighter, Underline, Type } from 'lucide-vue-next';
import { splitSentences } from '@duopara/shared';
import type { ParallelTranslation, EnhancedTranslation } from '../types';
import SentenceRenderer from './SentenceRenderer.vue';

type TranslationMode = 'natural' | 'literal' | 'enhanced';
type HighlightStyle = 'underline' | 'bg' | 'text';

const COLORS = [
  { underline: 'decoration-blue-500', bg: 'bg-blue-100/50', text: 'text-blue-600' },
  { underline: 'decoration-amber-500', bg: 'bg-amber-100/50', text: 'text-amber-600' },
  { underline: 'decoration-emerald-500', bg: 'bg-emerald-100/50', text: 'text-emerald-600' },
  { underline: 'decoration-rose-500', bg: 'bg-rose-100/50', text: 'text-rose-600' },
  { underline: 'decoration-violet-500', bg: 'bg-violet-100/50', text: 'text-violet-600' },
  { underline: 'decoration-cyan-500', bg: 'bg-cyan-100/50', text: 'text-cyan-600' },
  { underline: 'decoration-orange-500', bg: 'bg-orange-100/50', text: 'text-orange-600' },
  { underline: 'decoration-teal-500', bg: 'bg-teal-100/50', text: 'text-teal-600' },
  { underline: 'decoration-pink-500', bg: 'bg-pink-100/50', text: 'text-pink-600' },
  { underline: 'decoration-indigo-500', bg: 'bg-indigo-100/50', text: 'text-indigo-600' },
];

const STORAGE_KEY = 'duopara.enhancedHighlightStyles';

function getStoredStyles(): Set<HighlightStyle> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw) as HighlightStyle[];
      return new Set(arr.filter((s) => ['underline', 'bg', 'text'].includes(s)));
    }
  } catch { /* ignore */ }
  return new Set(['underline']);
}

function storeStyles(styles: Set<HighlightStyle>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...styles]));
}

function buildPairClass(idx: number, styles: Set<HighlightStyle>): string {
  const c = COLORS[idx % COLORS.length];
  const parts: string[] = ['inline-block rounded'];
  if (styles.has('bg')) {
    parts.push('px-1.5 py-0.5 text-sm', c.bg);
  } else {
    parts.push('py-0.5');
  }
  if (styles.has('underline')) {
    parts.push('underline decoration-[1.5px] underline-offset-2', c.underline);
  }
  if (styles.has('text')) {
    parts.push(c.text);
  }
  return parts.join(' ');
}

const props = defineProps<{
  content: string;
  translations: Array<ParallelTranslation | null>;
  enhancedTranslations: Array<EnhancedTranslation | null>;
  isTranslating: boolean;
  translationMode: TranslationMode;
  speakingIdx: number | null;
  selectedSentence: string | null;
  selectedWord: string | null;
  knownWordsSet: Set<string>;
  newWordsSet: Set<string>;
  markedWords: Set<string>;
  markedLearningWords: Set<string>;
  highlightLearned: boolean;
  highlightLearning: boolean;
  highlightNew: boolean;
}>();

const emit = defineEmits<{
  speakSentence: [sentence: string];
  wordClick: [word: string, sentence: string];
  sentenceClick: [sentence: string];
  wordHover: [word: string | null, sentence: string, target: HTMLElement | null];
}>();

const sentences = computed(() => splitSentences(props.content));
const activeStyles = ref<Set<HighlightStyle>>(getStoredStyles());

function toggleStyle(style: HighlightStyle) {
  const next = new Set(activeStyles.value);
  if (next.has(style)) next.delete(style);
  else next.add(style);
  storeStyles(next);
  activeStyles.value = next;
}

const styleButtons: { style: HighlightStyle; icon: typeof Underline; label: string }[] = [
  { style: 'underline', icon: Underline, label: 'Underline' },
  { style: 'bg', icon: Highlighter, label: 'Background' },
  { style: 'text', icon: Type, label: 'Text color' },
];
</script>

<template>
  <div v-if="isTranslating" class="flex flex-col items-center justify-center py-16 gap-4 text-gray-500">
    <Loader2 class="w-8 h-8 animate-spin text-primary-500" />
    <p class="text-sm">Translating entire text — this will be cached for future visits…</p>
  </div>

  <div v-else>
    <!-- Style toggle buttons for enhanced mode -->
    <div
      v-if="translationMode === 'enhanced' && enhancedTranslations.length > 0"
      class="flex justify-end gap-1 mb-2"
    >
      <button
        v-for="btn in styleButtons"
        :key="btn.style"
        @click="toggleStyle(btn.style)"
        :class="[
          'flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors',
          activeStyles.has(btn.style)
            ? 'bg-primary-100 text-primary-700'
            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100',
        ]"
        :title="btn.label"
      >
        <component :is="btn.icon" class="w-3.5 h-3.5" />
        {{ btn.label }}
      </button>
    </div>

    <div class="divide-y divide-gray-100">
      <div
        v-for="(sentence, sIdx) in sentences"
        :key="sIdx"
        :class="[
          'grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 py-3 rounded transition-colors',
          speakingIdx === sIdx ? 'bg-primary-50' : '',
        ]"
      >
        <!-- Original + play button -->
        <div class="flex items-start gap-1 pl-1.5">
          <button
            @click="emit('speakSentence', sentence)"
            class="mt-2.5 shrink-0 p-0.5 text-gray-400 hover:text-primary-600 rounded"
            title="Read sentence"
          >
            <Volume2 class="w-3.5 h-3.5" />
          </button>

          <!-- Enhanced mode: show pairs -->
          <span
            v-if="translationMode === 'enhanced' && enhancedTranslations[sIdx]"
            class="flex flex-wrap gap-1 items-baseline px-1"
          >
            <span
              v-for="(pair, pIdx) in enhancedTranslations[sIdx]!.pairs"
              :key="pIdx"
              :class="buildPairClass(pIdx, activeStyles)"
              :title="pair.t"
            >
              {{ pair.s }}
            </span>
          </span>

          <!-- Normal mode: SentenceRenderer -->
          <span
            v-else
            :class="[
              'cursor-pointer hover:bg-gray-50 rounded px-1',
              selectedSentence === sentence ? 'bg-yellow-100' : '',
            ]"
            @dblclick="emit('sentenceClick', sentence)"
          >
            <SentenceRenderer
              :sentence="sentence"
              :s-idx="sIdx"
              :selected-word="selectedWord"
              :known-words-set="knownWordsSet"
              :new-words-set="newWordsSet"
              :marked-words="markedWords"
              :marked-learning-words="markedLearningWords"
              :highlight-learned="highlightLearned"
              :highlight-learning="highlightLearning"
              :highlight-new="highlightNew"
              @word-click="(w, s) => emit('wordClick', w, s)"
              @sentence-click="(s) => emit('sentenceClick', s)"
              @word-hover="(w, s, t) => emit('wordHover', w, s, t)"
            />
          </span>
        </div>

        <!-- Translation -->
        <span class="text-gray-500 text-sm sm:text-base pl-3 sm:pl-1 border-l-2 border-primary-100 sm:border-0">
          <!-- Enhanced translation pairs -->
          <span
            v-if="translationMode === 'enhanced' && enhancedTranslations[sIdx]"
            class="flex flex-wrap gap-1 items-baseline"
          >
            <span
              v-for="(pair, pIdx) in enhancedTranslations[sIdx]!.pairs"
              :key="pIdx"
              :class="buildPairClass(pIdx, activeStyles)"
            >
              {{ pair.t }}
            </span>
          </span>

          <!-- Loading -->
          <Loader2
            v-else-if="translations[sIdx] == null"
            class="w-4 h-4 animate-spin text-primary-400 inline"
          />

          <!-- Natural/Literal translation text -->
          <template v-else>
            {{
              translationMode === 'literal'
                ? translations[sIdx]?.literalTranslation || translations[sIdx]?.translation
                : translations[sIdx]?.translation
            }}
          </template>
        </span>
      </div>
    </div>
  </div>
</template>
