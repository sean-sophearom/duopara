<script setup lang="ts">
import { ref, computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import { textsApi, settingsApi } from '../lib/api';
import { Search, Filter, Clock, Trash2, BookOpen, MoreVertical, Loader2 } from 'lucide-vue-next';

const queryClient = useQueryClient();
const search = ref('');
const languageFilter = ref('');
const page = ref(0);
const openMenu = ref<string | null>(null);
const limit = 10;

const { data: languages } = useQuery({
  queryKey: ['languages'],
  queryFn: () => settingsApi.getLanguages().then(r => r.data.languages),
});

const { data, isLoading } = useQuery({
  queryKey: computed(() => ['texts', search.value, languageFilter.value, page.value]),
  queryFn: () => textsApi.getAll({
    search: search.value || undefined,
    language: languageFilter.value || undefined,
    limit,
    offset: page.value * limit,
  }).then(r => r.data),
});

const deleteMutation = useMutation({
  mutationFn: textsApi.delete,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['texts'] });
    openMenu.value = null;
  },
});

const texts = computed(() => data.value?.texts || []);
const total = computed(() => data.value?.total || 0);
const totalPages = computed(() => Math.ceil(total.value / limit));

function resetPage() {
  page.value = 0;
}
</script>

<template>
  <div class="max-w-5xl mx-auto">
    <div class="mb-8">
      <h1 class="text-2xl sm:text-3xl font-bold text-gray-900">Reading History</h1>
      <p class="text-gray-600 mt-1">Your reading library</p>
    </div>

    <!-- Filters -->
    <div class="card p-4 mb-6">
      <div class="flex flex-col sm:flex-row gap-4">
        <div class="flex-1 relative input">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            v-model="search"
            @input="resetPage"
            placeholder="Search by title or topic..."
            class="ml-6 outline-none w-11/12"
          />
        </div>
        <div class="flex items-center gap-2">
          <Filter class="w-5 h-5 text-gray-400" />
          <select v-model="languageFilter" @change="resetPage" class="input w-40">
            <option value="">All languages</option>
            <option v-for="lang in languages" :key="lang.code" :value="lang.code">
              {{ lang.name }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex items-center justify-center py-12">
      <Loader2 class="w-8 h-8 animate-spin text-primary-600" />
    </div>

    <!-- Empty state -->
    <div v-else-if="texts.length === 0" class="card p-12 text-center">
      <BookOpen class="w-16 h-16 mx-auto text-gray-300 mb-4" />
      <h3 class="text-lg font-medium text-gray-900 mb-2">No texts yet</h3>
      <p class="text-gray-500 mb-4">
        {{ search || languageFilter ? 'No texts match your filters' : "You haven't generated any texts yet" }}
      </p>
      <RouterLink v-if="!search && !languageFilter" to="/generate" class="btn btn-primary">
        Generate your first text
      </RouterLink>
    </div>

    <!-- Texts list -->
    <template v-else>
      <div class="space-y-4">
        <div v-for="text in texts" :key="text.id" class="card p-5 hover:shadow-md transition-shadow">
          <div class="flex items-start justify-between gap-4">
            <RouterLink :to="`/read/${text.id}`" class="flex-1 min-w-0">
              <h3 class="text-lg font-semibold text-gray-900 hover:text-primary-600 transition-colors">
                {{ text.title }}
              </h3>
              <p class="text-sm text-gray-500 mt-1">{{ text.topic }}</p>
              <div class="flex flex-wrap items-center gap-3 mt-3 text-sm">
                <span class="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-gray-600">
                  {{ text.language }}
                </span>
                <span :class="[
                  'inline-flex items-center gap-1 px-2 py-1 rounded',
                  text.difficulty === 'beginner' ? 'bg-green-100 text-green-700' :
                  text.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                ]">
                  {{ text.difficulty }}
                </span>
                <span class="text-gray-500">{{ text.wordCount }} words</span>
                <span class="text-gray-500">{{ text.newWordsIntroduced?.length || 0 }} new words</span>
              </div>
            </RouterLink>

            <div class="flex items-center gap-2 flex-shrink-0">
              <div class="hidden sm:block text-right text-sm text-gray-500">
                <div class="flex items-center justify-end gap-1">
                  <Clock class="w-4 h-4" />
                  {{ new Date(text.createdAt).toLocaleDateString() }}
                </div>
                <p v-if="text.readCount > 0" class="text-xs mt-1">
                  Read {{ text.readCount }} time{{ text.readCount !== 1 ? 's' : '' }}
                </p>
              </div>

              <div class="relative">
                <button
                  @click="openMenu = openMenu === text.id ? null : text.id"
                  class="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <MoreVertical class="w-5 h-5 text-gray-400" />
                </button>
                <template v-if="openMenu === text.id">
                  <div class="fixed inset-0 z-10" @click="openMenu = null" />
                  <div class="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                    <button
                      @click="deleteMutation.mutate(text.id)"
                      class="w-full flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 class="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex items-center justify-center gap-2 mt-6">
        <button @click="page = Math.max(0, page - 1)" :disabled="page === 0" class="btn btn-secondary">
          Previous
        </button>
        <span class="text-sm text-gray-600">Page {{ page + 1 }} of {{ totalPages }}</span>
        <button @click="page = Math.min(totalPages - 1, page + 1)" :disabled="page >= totalPages - 1" class="btn btn-secondary">
          Next
        </button>
      </div>
    </template>
  </div>
</template>
