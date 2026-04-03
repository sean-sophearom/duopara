<script setup lang="ts">
import { ref, computed } from 'vue';
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import { vocabularyApi, settingsApi } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import {
  Search, Filter, Upload, Download, Plus, Trash2, X,
  BookMarked, Loader2, FileText,
} from 'lucide-vue-next';

const authStore = useAuthStore();
const queryClient = useQueryClient();
const fileInputRef = ref<HTMLInputElement | null>(null);

const search = ref('');
const statusFilter = ref('');
const languageFilter = ref(authStore.user?.settings?.targetLanguage || '');
const page = ref(0);
const showAddModal = ref(false);
const showImportModal = ref(false);
const newWord = ref({ word: '', translation: '' });
const importLanguage = ref(authStore.user?.settings?.targetLanguage || 'Spanish');

const limit = 20;

const { data: languages } = useQuery({
  queryKey: ['languages'],
  queryFn: () => settingsApi.getLanguages().then(r => r.data.languages),
});

const { data, isLoading } = useQuery({
  queryKey: computed(() => ['vocabulary', search.value, statusFilter.value, languageFilter.value, page.value]),
  queryFn: () => vocabularyApi.getAll({
    search: search.value || undefined,
    status: statusFilter.value || undefined,
    language: languageFilter.value || undefined,
    limit,
    offset: page.value * limit,
  }).then(r => r.data),
});

const { data: stats } = useQuery({
  queryKey: computed(() => ['vocabulary', 'stats', languageFilter.value]),
  queryFn: () => vocabularyApi.getStats(languageFilter.value || undefined).then(r => r.data),
});

const addMutation = useMutation({
  mutationFn: (data: { word: string; language: string; translation?: string }) => vocabularyApi.add(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['vocabulary'] });
    showAddModal.value = false;
    newWord.value = { word: '', translation: '' };
  },
});

const updateMutation = useMutation({
  mutationFn: ({ id, status }: { id: string; status: string }) => vocabularyApi.update(id, { status }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vocabulary'] }),
});

const deleteMutation = useMutation({
  mutationFn: vocabularyApi.delete,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vocabulary'] }),
});

const importMutation = useMutation({
  mutationFn: ({ file, language }: { file: File; language: string }) => vocabularyApi.import(file, language),
  onSuccess: (response) => {
    queryClient.invalidateQueries({ queryKey: ['vocabulary'] });
    showImportModal.value = false;
    alert(`Imported ${response.data.imported} words successfully!`);
  },
});

function handleExport() {
  vocabularyApi.export(languageFilter.value || undefined).then(response => {
    const blob = new Blob([response.data], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vocabulary-${languageFilter.value || 'all'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }).catch(console.error);
}

function handleFileSelect(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) {
    importMutation.mutate({ file, language: importLanguage.value });
  }
}

function handleAddWord() {
  addMutation.mutate({
    word: newWord.value.word,
    language: languageFilter.value || authStore.user?.settings?.targetLanguage || 'Spanish',
    translation: newWord.value.translation || undefined,
  });
}

function resetPage() {
  page.value = 0;
}

const words = computed(() => data.value?.words || []);
const total = computed(() => data.value?.total || 0);
const totalPages = computed(() => Math.ceil(total.value / limit));

const statusColors: Record<string, string> = {
  learning: 'bg-yellow-100 text-yellow-700',
  learned: 'bg-blue-100 text-blue-700',
  mastered: 'bg-green-100 text-green-700',
};
</script>

<template>
  <div class="max-w-6xl mx-auto">
    <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
      <div>
        <h1 class="text-2xl sm:text-3xl font-bold text-gray-900">Vocabulary</h1>
        <p class="text-gray-600 mt-1">Manage your known words and import from external sources</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button @click="showImportModal = true" class="btn btn-secondary">
          <Upload class="w-4 h-4 mr-2" /> Import
        </button>
        <button @click="handleExport" class="btn btn-secondary">
          <Download class="w-4 h-4 mr-2" /> Export
        </button>
        <button @click="showAddModal = true" class="btn btn-primary">
          <Plus class="w-4 h-4 mr-2" /> Add Word
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div v-if="stats" class="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
      <div class="card p-4 text-center">
        <p class="text-3xl font-bold text-gray-900">{{ stats.total }}</p>
        <p class="text-sm text-gray-500">Total</p>
      </div>
      <div class="card p-4 text-center">
        <p class="text-3xl font-bold text-yellow-600">{{ stats.learning }}</p>
        <p class="text-sm text-gray-500">Learning</p>
      </div>
      <div class="card p-4 text-center">
        <p class="text-3xl font-bold text-blue-600">{{ stats.learned }}</p>
        <p class="text-sm text-gray-500">Learned</p>
      </div>
      <div class="card p-4 text-center">
        <p class="text-3xl font-bold text-green-600">{{ stats.mastered }}</p>
        <p class="text-sm text-gray-500">Mastered</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="card p-4 mb-6">
      <div class="flex flex-col md:flex-row gap-4">
        <div class="flex-1 relative input">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text" v-model="search" @input="resetPage"
            placeholder="Search words..." class="ml-6 outline-none w-11/12"
          />
        </div>
        <div class="flex flex-col sm:flex-row sm:items-center gap-2">
          <div class="flex flex-1 items-center gap-2">
            <Filter class="w-5 h-5 text-gray-400 flex-shrink-0 hidden sm:block" />
            <select v-model="languageFilter" @change="resetPage" class="input flex-1 min-w-[130px]">
              <option value="">All languages</option>
              <option v-for="lang in languages" :key="lang.code" :value="lang.code">{{ lang.name }}</option>
            </select>
          </div>
          <select v-model="statusFilter" @change="resetPage" class="input flex-1 min-w-[110px]">
            <option value="">All status</option>
            <option value="learning">Learning</option>
            <option value="learned">Learned</option>
            <option value="mastered">Mastered</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex items-center justify-center py-12">
      <Loader2 class="w-8 h-8 animate-spin text-primary-600" />
    </div>

    <!-- Empty state -->
    <div v-else-if="words.length === 0" class="card p-12 text-center">
      <BookMarked class="w-16 h-16 mx-auto text-gray-300 mb-4" />
      <h3 class="text-lg font-medium text-gray-900 mb-2">No words yet</h3>
      <p class="text-gray-500 mb-4">
        {{ search || statusFilter || languageFilter ? 'No words match your filters' : 'Start by adding words or importing from Duolingo' }}
      </p>
      <button v-if="!search && !statusFilter && !languageFilter" @click="showImportModal = true" class="btn btn-primary">
        <Upload class="w-4 h-4 mr-2" /> Import Vocabulary
      </button>
    </div>

    <!-- Words table -->
    <template v-else>
      <div class="card overflow-x-auto">
        <table class="w-full min-w-[560px]">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-600">Word</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-600">Translation</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-600 hidden md:table-cell">Part of Speech</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-600">Status</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-600 hidden sm:table-cell">Encounters</th>
              <th class="px-4 py-3 text-right text-sm font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="word in words" :key="word.id" class="hover:bg-gray-50">
              <td class="px-4 py-3">
                <div>
                  <p class="font-medium text-gray-900">{{ word.word }}</p>
                  <p v-if="word.baseForm && word.baseForm !== word.word" class="text-xs text-gray-500">
                    → {{ word.baseForm }}
                  </p>
                </div>
              </td>
              <td class="px-4 py-3 text-gray-600">{{ word.translation || '-' }}</td>
              <td class="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">{{ word.partOfSpeech || '-' }}</td>
              <td class="px-4 py-3">
                <select
                  :value="word.status"
                  @change="updateMutation.mutate({ id: word.id, status: ($event.target as HTMLSelectElement).value })"
                  :class="['text-sm px-2 py-1 rounded-full border-0 cursor-pointer', statusColors[word.status] || '']"
                >
                  <option value="learning">Learning</option>
                  <option value="learned">Learned</option>
                  <option value="mastered">Mastered</option>
                </select>
              </td>
              <td class="px-4 py-3 text-sm text-gray-500 hidden sm:table-cell">{{ word.timesEncountered }}</td>
              <td class="px-4 py-3 text-right">
                <button @click="deleteMutation.mutate(word.id)" class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                  <Trash2 class="w-4 h-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex items-center justify-center gap-2 mt-6">
        <button @click="page = Math.max(0, page - 1)" :disabled="page === 0" class="btn btn-secondary">Previous</button>
        <span class="text-sm text-gray-600">Page {{ page + 1 }} of {{ totalPages }}</span>
        <button @click="page = Math.min(totalPages - 1, page + 1)" :disabled="page >= totalPages - 1" class="btn btn-secondary">Next</button>
      </div>
    </template>

    <!-- Add Word Modal -->
    <template v-if="showAddModal">
      <div class="modal-backdrop" @click="showAddModal = false" />
      <div class="modal-content top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold">Add New Word</h3>
          <button @click="showAddModal = false" class="p-1 hover:bg-gray-100 rounded"><X class="w-5 h-5" /></button>
        </div>
        <form @submit.prevent="handleAddWord" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Word</label>
            <input type="text" v-model="newWord.word" class="input" placeholder="Enter word..." required />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Translation (optional)</label>
            <input type="text" v-model="newWord.translation" class="input" placeholder="Enter translation..." />
          </div>
          <div class="flex gap-2 justify-end">
            <button type="button" @click="showAddModal = false" class="btn btn-secondary">Cancel</button>
            <button type="submit" :disabled="addMutation.isPending.value" class="btn btn-primary">
              <Loader2 v-if="addMutation.isPending.value" class="w-4 h-4 animate-spin" />
              <template v-else>Add Word</template>
            </button>
          </div>
        </form>
      </div>
    </template>

    <!-- Import Modal -->
    <template v-if="showImportModal">
      <div class="modal-backdrop" @click="showImportModal = false" />
      <div class="modal-content top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold">Import Vocabulary</h3>
          <button @click="showImportModal = false" class="p-1 hover:bg-gray-100 rounded"><X class="w-5 h-5" /></button>
        </div>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Language</label>
            <select v-model="importLanguage" class="input">
              <option v-for="lang in languages" :key="lang.code" :value="lang.code">{{ lang.name }}</option>
            </select>
          </div>
          <div class="p-4 bg-gray-50 rounded-lg">
            <div class="flex items-center gap-3 mb-3">
              <FileText class="w-5 h-5 text-gray-400" />
              <span class="text-sm font-medium text-gray-700">CSV Format</span>
            </div>
            <p class="text-sm text-gray-600 mb-2">Your CSV should have columns for:</p>
            <ul class="text-sm text-gray-600 list-disc list-inside space-y-1">
              <li><code>word</code> - The word (required)</li>
              <li><code>translation</code> - English translation</li>
              <li><code>part_of_speech</code> - noun, verb, etc.</li>
            </ul>
            <p class="text-xs text-gray-500 mt-2">Duolingo exports are automatically supported!</p>
          </div>
          <input ref="fileInputRef" type="file" accept=".csv" @change="handleFileSelect" class="hidden" />
          <button @click="fileInputRef?.click()" :disabled="importMutation.isPending.value" class="btn btn-primary w-full">
            <template v-if="importMutation.isPending.value">
              <Loader2 class="w-4 h-4 animate-spin mr-2" /> Importing...
            </template>
            <template v-else>
              <Upload class="w-4 h-4 mr-2" /> Select CSV File
            </template>
          </button>
        </div>
      </div>
    </template>
  </div>
</template>
