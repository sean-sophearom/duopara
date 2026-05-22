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
  BookMarked,
  ArrowRight,
  Flame,
  Target,
  Clock,
  Gamepad2,
  Zap,
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

const streakClass = computed(() => {
  const s = stats.value?.activity?.currentStreak || 0;
  if (s >= 30) return 'text-red-400';
  if (s >= 14) return 'text-orange-500';
  return 'text-orange-400';
});

const masteryPct = computed(() => {
  const t = vocabStats.value?.total || 0;
  const m = vocabStats.value?.mastered || 0;
  return t ? Math.round((m / t) * 100) : 0;
});
</script>

<template>
  <div class="max-w-6xl mx-auto space-y-8">
    <!-- Page header -->
    <div class="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1 class="text-2xl sm:text-3xl font-bold text-gray-900">
          {{ authStore.user?.name ? `Hi, ${authStore.user.name}` : 'Dashboard' }}
        </h1>
        <p class="text-gray-500 mt-1">
          Learning <span class="font-medium text-gray-700">{{ language }}</span>
        </p>
      </div>
      <div class="flex items-center gap-2 px-4 py-2.5 bg-orange-50 border border-orange-100 rounded-xl">
        <Flame :class="['w-5 h-5', streakClass]" />
        <span class="text-lg font-bold text-gray-900 leading-none">{{ stats?.activity?.currentStreak || 0 }}</span>
        <span class="text-sm text-gray-500">day streak</span>
      </div>
    </div>

    <!-- Quick stats -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <div class="card p-4 sm:p-5 flex items-center gap-3 sm:gap-4 cursor-default">
        <div class="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
          <Target class="w-5 h-5 text-green-600" />
        </div>
        <div>
          <p class="text-xl sm:text-2xl font-bold text-gray-900 leading-none">{{ vocabStats?.mastered || 0 }}</p>
          <p class="text-xs sm:text-sm text-gray-500 mt-0.5">Mastered</p>
        </div>
      </div>

      <div class="card p-4 sm:p-5 flex items-center gap-3 sm:gap-4 cursor-default">
        <div class="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center shrink-0">
          <BookOpen class="w-5 h-5 text-primary-600" />
        </div>
        <div>
          <p class="text-xl sm:text-2xl font-bold text-gray-900 leading-none">{{ stats?.reading?.completedSessions || 0 }}</p>
          <p class="text-xs sm:text-sm text-gray-500 mt-0.5">Texts read</p>
        </div>
      </div>

      <div class="card p-4 sm:p-5 flex items-center gap-3 sm:gap-4 cursor-default">
        <div class="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
          <BookMarked class="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <p class="text-xl sm:text-2xl font-bold text-gray-900 leading-none">{{ vocabStats?.total || 0 }}</p>
          <p class="text-xs sm:text-sm text-gray-500 mt-0.5">Total words</p>
        </div>
      </div>

      <div class="card p-4 sm:p-5 flex items-center gap-3 sm:gap-4 cursor-default">
        <div class="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
          <Zap class="w-5 h-5 text-orange-600" />
        </div>
        <div>
          <p class="text-xl sm:text-2xl font-bold text-gray-900 leading-none">{{ stats?.activity?.longestStreak || 0 }}</p>
          <p class="text-xs sm:text-sm text-gray-500 mt-0.5">Best streak</p>
        </div>
      </div>
    </div>

    <!-- Main content grid -->
    <div class="grid lg:grid-cols-3 gap-6">
      <!-- Left column -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Action cards row -->
        <div class="grid sm:grid-cols-2 gap-4">
          <RouterLink to="/generate"
            class="card p-5 block hover:shadow-md transition-all duration-200 group hover:border-primary-200">
            <div class="flex items-center gap-4">
              <div
                class="w-11 h-11 rounded-lg bg-primary-100 flex items-center justify-center shrink-0 group-hover:bg-primary-200 transition-colors">
                <PenTool class="w-5 h-5 text-primary-600" />
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="font-semibold text-gray-900">Read New Text</h3>
                <p class="text-sm text-gray-500">Generate or import material</p>
              </div>
              <ArrowRight
                class="w-5 h-5 text-gray-300 group-hover:text-primary-500 group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>
          </RouterLink>

          <RouterLink to="/practice"
            class="card p-5 block hover:shadow-md transition-all duration-200 group hover:border-green-200">
            <div class="flex items-center gap-4">
              <div
                class="w-11 h-11 rounded-lg bg-green-100 flex items-center justify-center shrink-0 group-hover:bg-green-200 transition-colors">
                <Gamepad2 class="w-5 h-5 text-green-600" />
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="font-semibold text-gray-900">Practice Now</h3>
                <p class="text-sm text-gray-500">Review words with games</p>
              </div>
              <ArrowRight
                class="w-5 h-5 text-gray-300 group-hover:text-green-500 group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>
          </RouterLink>
        </div>

        <!-- Recent texts -->
        <div class="card p-6">
          <div class="flex items-center justify-between mb-5">
            <div class="flex items-center gap-2">
              <BookOpen class="w-5 h-5 text-primary-600" />
              <h3 class="text-lg font-semibold text-gray-900">Recent Texts</h3>
            </div>
            <RouterLink to="/history"
              class="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1 group">
              View all
              <ArrowRight class="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </RouterLink>
          </div>

          <div v-if="recentTexts?.texts?.length > 0" class="space-y-2">
            <RouterLink v-for="text in recentTexts.texts" :key="text.id" :to="`/read/${text.id}`"
              class="flex items-center gap-3 p-3 rounded-lg border border-transparent hover:border-gray-200 hover:bg-gray-50 transition-all duration-150 group">
              <div
                class="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 group-hover:bg-primary-100 transition-colors">
                <BookOpen class="w-4 h-4 text-gray-400 group-hover:text-primary-600 transition-colors" />
              </div>
              <div class="flex-1 min-w-0">
                <h4 class="font-medium text-gray-900 text-sm truncate">{{ text.title }}</h4>
                <p class="text-xs text-gray-400 mt-0.5 truncate">
                  {{ text.topic }} &bull; {{ text.wordCount }} words &bull; {{ text.difficulty }}
                </p>
              </div>
              <div class="text-xs text-gray-400 flex items-center gap-1 shrink-0">
                <Clock class="w-3 h-3" />
                {{ new Date(text.createdAt).toLocaleDateString() }}
              </div>
            </RouterLink>
          </div>

          <div v-else class="text-center py-10">
            <div class="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <BookOpen class="w-7 h-7 text-gray-300" />
            </div>
            <p class="font-medium text-gray-700 mb-1">No texts yet</p>
            <p class="text-sm text-gray-400 mb-4">Generate your first reading text!</p>
            <RouterLink to="/generate" class="btn btn-primary text-sm px-4 py-2">
              Get started
            </RouterLink>
          </div>
        </div>
      </div>

      <!-- Right column -->
      <div class="space-y-6">
        <!-- Vocabulary progress -->
        <div class="card p-6">
          <div class="flex items-center justify-between mb-5">
            <div class="flex items-center gap-2">
              <BookMarked class="w-5 h-5 text-purple-600" />
              <h3 class="text-lg font-semibold text-gray-900">Vocabulary</h3>
            </div>
            <span class="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
              {{ masteryPct }}% mastered
            </span>
          </div>

          <div class="space-y-4">
            <div>
              <div class="flex items-center justify-between text-sm mb-1.5">
                <span class="flex items-center gap-1.5 text-gray-600">
                  <span class="w-2 h-2 rounded-full bg-yellow-400 inline-block"></span>
                  Learning
                </span>
                <span class="font-semibold text-yellow-600">{{ vocabStats?.learning || 0 }}</span>
              </div>
              <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  class="h-full bg-yellow-400 rounded-full transition-all duration-500"
                  :style="{ width: `${vocabStats?.total ? (vocabStats.learning / vocabStats.total) * 100 : 0}%` }" />
              </div>
            </div>

            <div>
              <div class="flex items-center justify-between text-sm mb-1.5">
                <span class="flex items-center gap-1.5 text-gray-600">
                  <span class="w-2 h-2 rounded-full bg-blue-400 inline-block"></span>
                  Learned
                </span>
                <span class="font-semibold text-blue-600">{{ vocabStats?.learned || 0 }}</span>
              </div>
              <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div class="h-full bg-blue-400 rounded-full transition-all duration-500"
                  :style="{ width: `${vocabStats?.total ? (vocabStats.learned / vocabStats.total) * 100 : 0}%` }" />
              </div>
            </div>

            <div>
              <div class="flex items-center justify-between text-sm mb-1.5">
                <span class="flex items-center gap-1.5 text-gray-600">
                  <span class="w-2 h-2 rounded-full bg-green-400 inline-block"></span>
                  Mastered
                </span>
                <span class="font-semibold text-green-600">{{ vocabStats?.mastered || 0 }}</span>
              </div>
              <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  class="h-full bg-green-400 rounded-full transition-all duration-500"
                  :style="{ width: `${vocabStats?.total ? (vocabStats.mastered / vocabStats.total) * 100 : 0}%` }" />
              </div>
            </div>
          </div>

          <RouterLink to="/vocabulary"
            class="mt-5 flex items-center justify-center gap-1 text-primary-600 hover:text-primary-700 text-sm font-medium group">
            Manage vocabulary
            <ArrowRight class="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </RouterLink>
        </div>

        <!-- Activity summary -->
        <div class="card p-6">
          <div class="flex items-center gap-2 mb-4">
            <TrendingUp class="w-5 h-5 text-primary-600" />
            <h3 class="text-lg font-semibold text-gray-900">This Month</h3>
          </div>

          <div class="space-y-1">
            <div class="flex items-center justify-between py-2.5 border-b border-gray-100">
              <span class="text-sm text-gray-600 flex items-center gap-2">
                <BookOpen class="w-4 h-4 text-gray-400" />
                Texts read
              </span>
              <span class="text-sm font-semibold text-gray-900">{{ stats?.activity?.recentTexts || 0 }}</span>
            </div>
            <div class="flex items-center justify-between py-2.5">
              <span class="text-sm text-gray-600 flex items-center gap-2">
                <Target class="w-4 h-4 text-gray-400" />
                Words mastered
              </span>
              <span class="text-sm font-semibold text-gray-900">{{ stats?.activity?.recentWordsMastered || 0 }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
