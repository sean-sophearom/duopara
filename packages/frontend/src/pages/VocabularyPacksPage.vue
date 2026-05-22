<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import {
  ArrowLeft,
  BookMarked,
  CheckCircle2,
  Loader2,
  PackagePlus,
  Search,
} from 'lucide-vue-next';
import { vocabularyApi, settingsApi } from '../lib/api';
import { useAuthStore } from '../store/authStore';

interface PresetWord {
  word: string;
  translation: string;
  partOfSpeech: string;
  baseForm?: string;
}

interface PresetPack {
  id: string;
  language: string;
  title: string;
  description: string;
  level: 'beginner' | 'intermediate';
  category: string;
  words: PresetWord[];
  wordCount: number;
}

const authStore = useAuthStore();
const queryClient = useQueryClient();
const languageFilter = ref(authStore.user?.settings?.targetLanguage || 'Spanish');
const status = ref<'learning' | 'learned' | 'mastered'>('learning');
const addedPack = ref<Record<string, string>>({});

const { data: languages } = useQuery({
  queryKey: ['languages'],
  queryFn: () => settingsApi.getLanguages().then(r => r.data.languages),
});

const { data: packs, isLoading } = useQuery({
  queryKey: computed(() => ['vocabulary', 'presets', languageFilter.value]),
  queryFn: () => vocabularyApi.getPresets(languageFilter.value).then(r => r.data.packs as PresetPack[]),
});

const addPresetMutation = useMutation({
  mutationFn: (packId: string) => vocabularyApi.addPreset(packId, status.value),
  onSuccess: (response, packId) => {
    const added = response.data.added;
    const updated = response.data.updated;
    addedPack.value = {
      ...addedPack.value,
      [packId]: `Added ${added} word${added === 1 ? '' : 's'}${updated ? `, refreshed ${updated}` : ''}`,
    };
    queryClient.invalidateQueries({ queryKey: ['vocabulary'] });
  },
});

const groupedPacks = computed(() => {
  const groups = new Map<string, PresetPack[]>();
  for (const pack of packs.value || []) {
    groups.set(pack.category, [...(groups.get(pack.category) || []), pack]);
  }
  return Array.from(groups.entries()).map(([category, categoryPacks]) => ({ category, packs: categoryPacks }));
});

function previewWords(pack: PresetPack) {
  return pack.words.slice(0, 6);
}
</script>

<template>
  <div class="max-w-6xl mx-auto">
    <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
      <div>
        <RouterLink to="/vocabulary" class="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary-700 mb-3">
          <ArrowLeft class="w-4 h-4" />
          Vocabulary
        </RouterLink>
        <h1 class="text-2xl sm:text-3xl font-bold text-gray-900">Preset Packs</h1>
        <p class="text-gray-600 mt-1">Start with curated word groups by language and word type.</p>
      </div>
      <div class="flex flex-col sm:flex-row gap-2">
        <select v-model="languageFilter" class="input min-w-[160px]">
          <option v-for="lang in languages" :key="lang.code" :value="lang.code">{{ lang.name }}</option>
        </select>
        <select v-model="status" class="input min-w-[150px]">
          <option value="learning">Add as learning</option>
          <option value="learned">Add as learned</option>
          <option value="mastered">Add as mastered</option>
        </select>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <div class="card p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
            <PackagePlus class="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <p class="text-2xl font-bold text-gray-900">{{ packs?.length || 0 }}</p>
            <p class="text-sm text-gray-500">Available packs</p>
          </div>
        </div>
      </div>
      <div class="card p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <BookMarked class="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p class="text-2xl font-bold text-gray-900">
              {{ (packs || []).reduce((sum, pack) => sum + pack.wordCount, 0) }}
            </p>
            <p class="text-sm text-gray-500">Curated words</p>
          </div>
        </div>
      </div>
      <div class="card p-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
            <CheckCircle2 class="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p class="text-2xl font-bold text-gray-900">{{ languageFilter }}</p>
            <p class="text-sm text-gray-500">Selected language</p>
          </div>
        </div>
      </div>
    </div>

    <div v-if="isLoading" class="flex items-center justify-center py-12">
      <Loader2 class="w-8 h-8 animate-spin text-primary-600" />
    </div>

    <div v-else-if="!packs?.length" class="card p-12 text-center">
      <Search class="w-16 h-16 mx-auto text-gray-300 mb-4" />
      <h3 class="text-lg font-medium text-gray-900 mb-2">No preset packs yet</h3>
      <p class="text-gray-500">Choose another language or add packs for this language on the backend.</p>
    </div>

    <div v-else class="space-y-8">
      <section v-for="group in groupedPacks" :key="group.category">
        <div class="flex items-center justify-between gap-4 mb-3">
          <h2 class="text-lg font-semibold text-gray-900">{{ group.category }}</h2>
          <span class="text-sm text-gray-500">{{ group.packs.length }} pack{{ group.packs.length === 1 ? '' : 's' }}</span>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <article v-for="pack in group.packs" :key="pack.id" class="card p-5">
            <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
              <div>
                <div class="flex flex-wrap items-center gap-2 mb-2">
                  <h3 class="text-lg font-semibold text-gray-900">{{ pack.title }}</h3>
                  <span class="px-2 py-1 rounded-full bg-gray-100 text-xs font-medium text-gray-600 capitalize">
                    {{ pack.level }}
                  </span>
                  <span class="px-2 py-1 rounded-full bg-primary-50 text-xs font-medium text-primary-700">
                    {{ pack.wordCount }} words
                  </span>
                </div>
                <p class="text-sm text-gray-600">{{ pack.description }}</p>
              </div>
              <button
                @click="addPresetMutation.mutate(pack.id)"
                :disabled="addPresetMutation.isPending.value"
                class="btn btn-primary whitespace-nowrap"
              >
                <Loader2 v-if="addPresetMutation.isPending.value" class="w-4 h-4 animate-spin mr-2" />
                <PackagePlus v-else class="w-4 h-4 mr-2" />
                Add Pack
              </button>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div
                v-for="word in previewWords(pack)"
                :key="`${pack.id}-${word.word}`"
                class="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
              >
                <div class="flex items-center justify-between gap-2">
                  <p class="font-medium text-gray-900">{{ word.word }}</p>
                  <span class="text-xs text-gray-500">{{ word.partOfSpeech }}</span>
                </div>
                <p class="text-sm text-gray-600">{{ word.translation }}</p>
              </div>
            </div>

            <p v-if="pack.words.length > previewWords(pack).length" class="text-xs text-gray-500 mt-3">
              +{{ pack.words.length - previewWords(pack).length }} more words
            </p>
            <p v-if="addedPack[pack.id]" class="mt-3 text-sm font-medium text-green-700">
              {{ addedPack[pack.id] }}
            </p>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>
