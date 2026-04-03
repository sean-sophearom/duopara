<script setup lang="ts">
import { computed } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { RouterLink } from 'vue-router';
import { statsApi, textsApi, vocabularyApi } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import {
  BookOpen,
  PenTool,
  TrendingUp,
  Calendar,
  BookMarked,
  ArrowRight,
  Flame,
  Target,
  Clock,
} from 'lucide-vue-next';

const authStore = useAuthStore();
const language = computed(() => authStore.user?.settings?.targetLanguage || 'Spanish');

const { data: stats } = useQuery({
  queryKey: computed(() => ['stats', language.value]),
  queryFn: () => statsApi.get(language.value).then(r => r.data),
});

const { data: recentTexts } = useQuery({
  queryKey: ['texts', 'recent'],
  queryFn: () => textsApi.getAll({ limit: 3 }).then(r => r.data),
});

const { data: vocabStats } = useQuery({
  queryKey: computed(() => ['vocabulary', 'stats', language.value]),
  queryFn: () => vocabularyApi.getStats(language.value).then(r => r.data),
});
</script>

<template>
  <div class="max-w-6xl mx-auto space-y-8">
    <!-- Header -->
    <div>
      <h1 class="text-2xl sm:text-3xl font-bold text-gray-900">
        Welcome back{{ authStore.user?.name ? `, ${authStore.user.name}` : '' }}!
      </h1>
      <p class="text-gray-600 mt-1">
        Continue your {{ language }} learning journey
      </p>
    </div>

    <!-- Quick stats -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <div class="card p-4 sm:p-6 flex items-center justify-between sm:flex-col sm:items-start">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
            <Flame class="w-5 h-5 text-orange-600" />
          </div>
          <span class="text-sm text-gray-600">Current Streak</span>
        </div>
        <p class="text-3xl font-bold text-gray-900">
          {{ stats?.activity?.currentStreak || 0 }}
          <span class="text-lg font-normal text-gray-500 ml-1">&nbsp;days</span>
        </p>
      </div>

      <div class="card p-4 sm:p-6 flex items-center justify-between sm:flex-col sm:items-start">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
            <Target class="w-5 h-5 text-green-600" />
          </div>
          <span class="text-sm text-gray-600">Words Mastered</span>
        </div>
        <p class="text-3xl font-bold text-gray-900">
          {{ vocabStats?.mastered || 0 }}
          <span class="text-lg font-normal text-gray-500 ml-1">&nbsp;words</span>
        </p>
      </div>

      <div class="card p-4 sm:p-6 flex items-center justify-between sm:flex-col sm:items-start">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
            <BookOpen class="w-5 h-5 text-primary-600" />
          </div>
          <span class="text-sm text-gray-600">Texts Read</span>
        </div>
        <p class="text-3xl font-bold text-gray-900">
          {{ stats?.reading?.completedSessions || 0 }}
          <span class="text-lg font-normal text-gray-500 ml-1">&nbsp;texts</span>
        </p>
      </div>

      <div class="card p-4 sm:p-6 flex items-center justify-between sm:flex-col sm:items-start">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <BookMarked class="w-5 h-5 text-purple-600" />
          </div>
          <span class="text-sm text-gray-600">Total Vocabulary</span>
        </div>
        <p class="text-3xl font-bold text-gray-900">
          {{ vocabStats?.total || 0 }}
          <span class="text-lg font-normal text-gray-500 ml-1">&nbsp;words</span>
        </p>
      </div>
    </div>

    <!-- Main content grid -->
    <div class="grid lg:grid-cols-3 gap-6">
      <!-- Left column -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Generate CTA -->
        <RouterLink to="/generate" class="card p-6 block hover:shadow-md transition-shadow group">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <PenTool class="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 class="text-xl font-semibold text-gray-900">Generate New Text</h3>
                <p class="text-gray-600">Create personalized reading material</p>
              </div>
            </div>
            <ArrowRight class="w-6 h-6 text-gray-400 group-hover:text-primary-600 group-hover:translate-x-1 transition-all" />
          </div>
        </RouterLink>

        <!-- Recent texts -->
        <div class="card p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-900">Recent Texts</h3>
            <RouterLink to="/history" class="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1">
              View all <ArrowRight class="w-4 h-4" />
            </RouterLink>
          </div>

          <div v-if="recentTexts?.texts?.length > 0" class="space-y-3">
            <RouterLink
              v-for="text in recentTexts.texts"
              :key="text.id"
              :to="`/read/${text.id}`"
              class="block p-4 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50/50 transition-colors"
            >
              <div class="flex items-start justify-between gap-4 flex-col md:flex-row">
                <div class="flex-1 min-w-0">
                  <h4 class="font-medium text-gray-900">{{ text.title }}</h4>
                  <p class="text-sm text-gray-500 mt-1">
                    {{ text.topic }} &bull; {{ text.wordCount }} words &bull; {{ text.difficulty }}
                  </p>
                </div>
                <div class="text-xs text-gray-400 flex items-center gap-1">
                  <Clock class="w-3 h-3" />
                  {{ new Date(text.createdAt).toLocaleDateString() }}
                </div>
              </div>
            </RouterLink>
          </div>
          <div v-else class="text-center py-8 text-gray-500">
            <BookOpen class="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p>No texts yet. Generate your first one!</p>
          </div>
        </div>
      </div>

      <!-- Right column -->
      <div class="space-y-6">
        <!-- Vocabulary progress -->
        <div class="card p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Vocabulary Progress</h3>

          <div class="space-y-4">
            <div>
              <div class="flex items-center justify-between text-sm mb-1">
                <span class="text-gray-600">Learning</span>
                <span class="font-medium text-yellow-600">{{ vocabStats?.learning || 0 }}</span>
              </div>
              <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  class="h-full bg-yellow-500 rounded-full transition-all"
                  :style="{ width: `${vocabStats?.total ? (vocabStats.learning / vocabStats.total) * 100 : 0}%` }"
                />
              </div>
            </div>

            <div>
              <div class="flex items-center justify-between text-sm mb-1">
                <span class="text-gray-600">Learned</span>
                <span class="font-medium text-blue-600">{{ vocabStats?.learned || 0 }}</span>
              </div>
              <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  class="h-full bg-blue-500 rounded-full transition-all"
                  :style="{ width: `${vocabStats?.total ? (vocabStats.learned / vocabStats.total) * 100 : 0}%` }"
                />
              </div>
            </div>

            <div>
              <div class="flex items-center justify-between text-sm mb-1">
                <span class="text-gray-600">Mastered</span>
                <span class="font-medium text-green-600">{{ vocabStats?.mastered || 0 }}</span>
              </div>
              <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  class="h-full bg-green-500 rounded-full transition-all"
                  :style="{ width: `${vocabStats?.total ? (vocabStats.mastered / vocabStats.total) * 100 : 0}%` }"
                />
              </div>
            </div>
          </div>

          <RouterLink
            to="/vocabulary"
            class="mt-4 block text-center text-primary-600 hover:text-primary-700 text-sm font-medium"
          >
            Manage vocabulary
          </RouterLink>
        </div>

        <!-- Activity summary -->
        <div class="card p-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">This Month</h3>

          <div class="grid grid-cols-2 gap-4">
            <div class="text-center p-3 bg-gray-50 rounded-lg">
              <div class="flex items-center justify-center gap-1 text-primary-600 mb-1">
                <BookOpen class="w-4 h-4" />
              </div>
              <p class="text-2xl font-bold text-gray-900">{{ stats?.activity?.recentTexts || 0 }}</p>
              <p class="text-xs text-gray-500">Texts read</p>
            </div>
            <div class="text-center p-3 bg-gray-50 rounded-lg">
              <div class="flex items-center justify-center gap-1 text-green-600 mb-1">
                <TrendingUp class="w-4 h-4" />
              </div>
              <p class="text-2xl font-bold text-gray-900">{{ stats?.activity?.recentWordsMastered || 0 }}</p>
              <p class="text-xs text-gray-500">Words mastered</p>
            </div>
          </div>

          <div class="mt-4 pt-4 border-t border-gray-100">
            <div class="flex items-center justify-between text-sm">
              <span class="text-gray-600">Longest streak</span>
              <span class="font-medium text-orange-600 flex items-center gap-1">
                <Calendar class="w-4 h-4" />
                {{ stats?.activity?.longestStreak || 0 }} days
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
