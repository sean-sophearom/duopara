<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useMutation, useQuery } from '@tanstack/vue-query';
import { generateApi, settingsApi, vocabularyApi } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import {
  Sparkles, Loader2, BookOpen, Lightbulb,
  Coffee, Plane, ShoppingBag, Utensils,
  Heart, Briefcase, GraduationCap, Newspaper,
  ClipboardPaste, Wand2, Shuffle,
} from 'lucide-vue-next';

const topicSuggestions = [
  { icon: Coffee, label: 'Ordering at a café', topic: 'Ordering coffee and pastries at a local café' },
  { icon: Plane, label: 'At the airport', topic: 'Navigating an airport and catching a flight' },
  { icon: ShoppingBag, label: 'Shopping for clothes', topic: 'Shopping for clothes at a store' },
  { icon: Utensils, label: 'Restaurant conversation', topic: 'Having dinner at a restaurant' },
  { icon: Heart, label: 'Making friends', topic: 'Meeting new people and making friends' },
  { icon: Briefcase, label: 'Job interview', topic: 'A job interview scenario' },
  { icon: GraduationCap, label: 'At university', topic: 'First day at a foreign university' },
  { icon: Newspaper, label: 'Daily news', topic: 'Reading about current events' },
];

const styleOptions = [
  { value: 'story', label: 'Story', description: 'Narrative with characters' },
  { value: 'dialogue', label: 'Dialogue', description: 'Conversation format' },
  { value: 'article', label: 'Article', description: 'Informative style' },
  { value: 'description', label: 'Description', description: 'Vivid descriptions' },
];

const difficultyOptions = [
  { value: 'beginner', label: 'Beginner', description: 'Simple vocabulary & grammar' },
  { value: 'intermediate', label: 'Intermediate', description: 'Varied structures' },
  { value: 'advanced', label: 'Advanced', description: 'Complex & idiomatic' },
];

const authStore = useAuthStore();
const router = useRouter();

const defaultLanguage = authStore.user?.settings?.targetLanguage || 'Spanish';
const defaultRatio = authStore.user?.settings?.knownWordsRatio || 80;
const defaultDifficulty = authStore.user?.settings?.defaultDifficulty || 'intermediate';

// Mode: 'generate' | 'import'
const mode = ref<'generate' | 'import'>('generate');

// Generate mode fields
const topic = ref('');
const style = ref('story');
const wordCount = ref(200);

// Import mode fields
const customText = ref('');
const customTitle = ref('');
const customTopic = ref('');

// Shared fields
const language = ref(defaultLanguage);
const difficulty = ref(defaultDifficulty);
const knownWordsRatio = ref(defaultRatio);
const includeLearningWords = ref(true);
const includeLearnedWords = ref(true);

const { data: languages } = useQuery({
  queryKey: ['languages'],
  queryFn: () => settingsApi.getLanguages().then(r => r.data.languages),
});

const { data: vocabStats } = useQuery({
  queryKey: computed(() => ['vocabulary', 'stats', language.value]),
  queryFn: () => vocabularyApi.getStats(language.value).then(r => r.data),
});

const generateMutation = useMutation({
  mutationFn: generateApi.create,
  onSuccess: (response) => {
    router.push(`/read/${response.data.text.id}`);
  },
});

const randomTopicMutation = useMutation({
  mutationFn: () => generateApi.randomTopic(language.value, difficulty.value),
  onSuccess: (response) => {
    topic.value = response.data.topic;
  },
});

function handleGenerate() {
  if (mode.value === 'import') {
    if (!customText.value.trim()) return;
    generateMutation.mutate({
      customText: customText.value.trim(),
      title: customTitle.value.trim() || undefined,
      topic: customTopic.value.trim() || undefined,
      language: language.value,
      difficulty: difficulty.value,
      knownWordsRatio: knownWordsRatio.value,
      includeLearningWords: includeLearningWords.value,
      includeLearnedWords: includeLearnedWords.value,
    });
  } else {
    if (!topic.value.trim()) return;
    generateMutation.mutate({
      topic: topic.value.trim(),
      language: language.value,
      difficulty: difficulty.value,
      knownWordsRatio: knownWordsRatio.value,
      wordCount: wordCount.value,
      style: style.value,
      includeLearningWords: includeLearningWords.value,
      includeLearnedWords: includeLearnedWords.value,
    });
  }
}

const isSubmitDisabled = computed(() => {
  if (generateMutation.isPending.value) return true;
  if (!includeLearnedWords.value && !includeLearningWords.value) return true;
  if (mode.value === 'import') return !customText.value.trim();
  return !topic.value.trim();
});

const knownWords = computed(() =>
  (includeLearnedWords.value ? (vocabStats.value?.learned || 0) + (vocabStats.value?.mastered || 0) : 0)
  + (includeLearningWords.value ? (vocabStats.value?.learning || 0) : 0)
);

const importWordCount = computed(() => {
  if (!customText.value) return 0;
  return customText.value.trim().split(/\s+/).filter(Boolean).length;
});
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <div class="mb-8">
      <h1 class="text-2xl sm:text-3xl font-bold text-gray-900">Generate Reading Material</h1>
      <p class="text-gray-600 mt-1">Create personalized content based on your vocabulary level</p>
    </div>

    <!-- Mode toggle -->
    <div class="flex gap-2 mb-8 p-1 bg-gray-100 rounded-xl w-fit">
      <button
        type="button"
        @click="mode = 'generate'"
        :class="[
          'flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all',
          mode === 'generate'
            ? 'bg-white text-primary-700 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        ]"
      >
        <Wand2 class="w-4 h-4" />
        AI Generate
      </button>
      <button
        type="button"
        @click="mode = 'import'"
        :class="[
          'flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all',
          mode === 'import'
            ? 'bg-white text-primary-700 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        ]"
      >
        <ClipboardPaste class="w-4 h-4" />
        Paste Your Text
      </button>
    </div>

    <form @submit.prevent="handleGenerate" class="space-y-8">

      <!-- AI Generate mode: topic input -->
      <template v-if="mode === 'generate'">
        <div class="card p-6">
          <div class="flex items-center justify-between mb-3">
            <label class="block text-lg font-semibold text-gray-900">What would you like to read about?</label>
            <!-- <button
              type="button"
              @click="randomTopicMutation.mutate()"
              :disabled="randomTopicMutation.isPending.value"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-50"
            >
              <Shuffle v-if="!randomTopicMutation.isPending.value" class="w-4 h-4" />
              <Loader2 v-else class="w-4 h-4 animate-spin" />
              Surprise me
            </button> -->
          </div>
          <div class="relative">
            <Lightbulb class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              v-model="topic"
              placeholder="e.g. A day at the beach, Cooking traditional food, Space exploration..."
              class="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
              required
            />
          </div>
          <div class="mt-4">
            <p class="text-sm text-gray-500 mb-2">Or try one of these:</p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="suggestion in topicSuggestions"
                :key="suggestion.label"
                type="button"
                @click="topic = suggestion.topic"
                class="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition-colors"
              >
                <component :is="suggestion.icon" class="w-4 h-4" />
                {{ suggestion.label }}
              </button>
            </div>
          </div>
        </div>
      </template>

      <!-- Paste mode: custom text + optional metadata -->
      <template v-else>
        <div class="card p-6 space-y-5">
          <div>
            <label class="block text-lg font-semibold text-gray-900 mb-1">Paste your text</label>
            <p class="text-sm text-gray-500 mb-3">Song lyrics, an article, a poem or anything you want to study.</p>
            <textarea
              v-model="customText"
              rows="10"
              placeholder="Paste your text here..."
              class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all resize-y font-mono text-sm"
              required
            />
            <p class="text-xs text-gray-400 mt-1 text-right">{{ importWordCount }} words</p>
          </div>

          <div class="grid sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Title <span class="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                v-model="customTitle"
                placeholder="Auto-detected from first sentence"
                class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Topic / Tag <span class="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                v-model="customTopic"
                placeholder="e.g. Song lyrics, Poem, Article"
                class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
              />
            </div>
          </div>
        </div>
      </template>

      <!-- Language and difficulty (shared) -->
      <div class="grid md:grid-cols-2 gap-6">
        <div class="card p-6">
          <label class="block text-lg font-semibold text-gray-900 mb-3">Target Language</label>
          <select v-model="language" class="input text-lg">
            <option v-for="lang in languages" :key="lang.code" :value="lang.code">
              {{ lang.name }} ({{ lang.nativeName }})
            </option>
            <option v-if="!languages" value="Spanish">Spanish (EspaÃ±ol)</option>
          </select>
          <div class="mt-4 p-3 bg-primary-50 rounded-lg">
            <p class="text-sm text-primary-700">
              <BookOpen class="w-4 h-4 inline mr-1" />
              You have <strong>{{ knownWords }}</strong> known words in {{ language }}
            </p>
          </div>
        </div>

        <div class="card p-6">
          <label class="block text-lg font-semibold text-gray-900 mb-3">Difficulty Level</label>
          <div class="space-y-2">
            <label
              v-for="opt in difficultyOptions"
              :key="opt.value"
              :class="[
                'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                difficulty === opt.value
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              ]"
            >
              <input type="radio" name="difficulty" :value="opt.value" v-model="difficulty" class="sr-only" />
              <div :class="[
                'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                difficulty === opt.value ? 'border-primary-600' : 'border-gray-300'
              ]">
                <div v-if="difficulty === opt.value" class="w-2 h-2 rounded-full bg-primary-600" />
              </div>
              <div>
                <p class="font-medium text-gray-900">{{ opt.label }}</p>
                <p class="text-sm text-gray-500">{{ opt.description }}</p>
              </div>
            </label>
          </div>
        </div>
      </div>

      <!-- Advanced options -->
      <div class="card p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Fine-tune your text</h3>
        <div class="grid md:grid-cols-2 gap-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Vocabulary Mix</label>
            <div class="flex items-center gap-4">
              <input type="range" min="50" max="95" step="5" v-model.number="knownWordsRatio" class="flex-1" />
              <span class="text-sm font-medium text-gray-900 w-24 text-right">{{ knownWordsRatio }}% known</span>
            </div>
            <p class="text-xs text-gray-500 mt-1">{{ 100 - knownWordsRatio }}% new words to challenge you</p>

            <div class="mt-4 space-y-2">
              <p class="text-xs font-semibold text-gray-600 uppercase tracking-wider">Include in "Known":</p>
              <div class="flex flex-wrap gap-3">
                <label class="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" v-model="includeLearnedWords" class="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                  <span class="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                    Learned ({{ vocabStats?.learned || 0 }})
                  </span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" v-model="includeLearningWords" class="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                  <span class="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                    Learning ({{ vocabStats?.learning || 0 }})
                  </span>
                </label>
              </div>
              <p v-if="!includeLearnedWords && !includeLearningWords" class="text-xs text-red-500 animate-pulse">
                Select at least one category
              </p>
            </div>
          </div>

          <div v-if="mode === 'generate'">
            <label class="block text-sm font-medium text-gray-700 mb-2">Approximate Length</label>
            <select v-model.number="wordCount" class="input">
              <option :value="100">Short (~100 words)</option>
              <option :value="200">Medium (~200 words)</option>
              <option :value="350">Long (~350 words)</option>
              <option :value="500">Very long (~500 words)</option>
            </select>
          </div>
        </div>

        <div v-if="mode === 'generate'" class="mt-6">
          <label class="block text-sm font-medium text-gray-700 mb-2">Writing Style</label>
          <div class="grid sm:grid-cols-2 md:grid-cols-4 gap-2">
            <label
              v-for="opt in styleOptions"
              :key="opt.value"
              :class="[
                'flex flex-col items-center gap-1 p-3 rounded-lg border cursor-pointer transition-all text-center',
                style === opt.value
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              ]"
            >
              <input type="radio" name="style" :value="opt.value" v-model="style" class="sr-only" />
              <span class="font-medium text-gray-900">{{ opt.label }}</span>
              <span class="text-xs text-gray-500">{{ opt.description }}</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Submit button -->
      <button
        type="submit"
        :disabled="isSubmitDisabled"
        class="btn btn-primary w-full py-4 text-lg"
      >
        <template v-if="generateMutation.isPending.value">
          <Loader2 class="w-6 h-6 animate-spin mr-2" />
          {{ mode === 'import' ? 'Processing your text...' : 'Generating your text...' }}
        </template>
        <template v-else-if="mode === 'import'">
          <ClipboardPaste class="w-6 h-6 mr-2" />
          Import Text
        </template>
        <template v-else>
          <Sparkles class="w-6 h-6 mr-2" />
          Generate Text
        </template>
      </button>

      <div v-if="generateMutation.isError.value" class="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        {{ mode === 'import' ? 'Failed to import text. Please try again.' : 'Failed to generate text. Please try again.' }}
      </div>
    </form>
  </div>
</template>
