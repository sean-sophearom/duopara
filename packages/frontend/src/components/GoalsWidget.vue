<script setup lang="ts">
import { ref, computed } from 'vue';
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import { RouterLink, useRouter } from 'vue-router';
import { generateApi, goalsApi, type SavedGoal } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import GoalSuggestModal from './GoalSuggestModal.vue';
import {
  Target,
  Sparkles,
  CheckCircle2,
  X,
  BookOpen,
  Globe,
  Clock,
  Copy,
  Check,
  Loader2,
  AlertCircle,
} from 'lucide-vue-next';

const router = useRouter();
const queryClient = useQueryClient();
const authStore = useAuthStore();
const showModal = ref(false);
const modalIntent = ref('');
const copied = ref(false);

const quickGoalPrompts = [
  'Build a daily reading habit',
  'Practice travel conversations',
  'Learn food and restaurant words',
];

const { data, isLoading, isError, refetch } = useQuery({
  queryKey: ['goals', 'active'],
  queryFn: () => goalsApi.getActive().then((r) => r.data),
});

const activeGoal = computed<SavedGoal | undefined>(() => data.value?.goals?.[0]);

const actionData = computed(() => {
  if (!activeGoal.value) return {};
  try {
    return JSON.parse(activeGoal.value.actionData) as Record<string, string>;
  } catch {
    return {};
  }
});

const goalDetail = computed(() => {
  if (!activeGoal.value) return '';
  if (activeGoal.value.actionType === 'generate' && actionData.value.topic) {
    return `Topic: ${actionData.value.topic}`;
  }
  if (activeGoal.value.actionType === 'existing' && actionData.value.textTitle) {
    return `Text: ${actionData.value.textTitle}`;
  }
  if (activeGoal.value.actionType === 'article' && actionData.value.source) {
    return `Source: ${actionData.value.source}`;
  }
  return '';
});

const { mutate: updateStatus, isPending: isUpdating } = useMutation({
  mutationFn: ({ id, status }: { id: string; status: 'completed' | 'dismissed' }) =>
    goalsApi.updateStatus(id, status),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }),
});

const generateReadMutation = useMutation({
  mutationFn: () =>
    generateApi.create({
      topic: actionData.value.topic || activeGoal.value?.title || 'Reading practice',
      language: authStore.user?.settings?.targetLanguage || 'Spanish',
      difficulty: actionData.value.difficulty || authStore.user?.settings?.defaultDifficulty || 'intermediate',
      knownWordsRatio: authStore.user?.settings?.knownWordsRatio || 80,
      wordCount: Math.min(Math.max((activeGoal.value?.estimatedMinutes || 12) * 18, 100), 350),
      includeLearningWords: true,
      includeLearnedWords: true,
      reuseExisting: true,
    }),
  onSuccess: (response) => {
    router.push({
      path: `/read/${response.data.text.id}`,
      query: response.data.reused
        ? { reused: '1', strategy: response.data.reuseStrategy || 'existing' }
        : {},
    });
  },
});

function openGoalModal(intent = '') {
  modalIntent.value = intent;
  showModal.value = true;
}

function onSaved() {
  showModal.value = false;
  modalIntent.value = '';
  queryClient.invalidateQueries({ queryKey: ['goals'] });
}

function startGoal() {
  if (!activeGoal.value) return;
  const type = activeGoal.value.actionType;
  if (type === 'existing' && actionData.value.textId) {
    router.push(`/read/${actionData.value.textId}`);
  } else if (type === 'generate') {
    generateReadMutation.mutate();
  }
  // article type: handled with copy button
}

async function copySearchQuery() {
  const q = actionData.value.searchQuery;
  if (!q) return;
  try {
    await navigator.clipboard.writeText(q);
    copied.value = true;
    setTimeout(() => (copied.value = false), 2000);
  } catch {
    // ignore
  }
}

const actionLabels: Record<string, string> = {
  generate: 'Find read',
  existing: 'Start reading',
  article: 'Copy search',
};

const actionIcons: Record<string, any> = {
  generate: Sparkles,
  existing: BookOpen,
  article: Globe,
};

const typeBadgeColors: Record<string, string> = {
  generate: 'bg-primary-50 text-primary-600',
  existing: 'bg-green-50 text-green-600',
  article: 'bg-purple-50 text-purple-600',
};

const typeLabels: Record<string, string> = {
  generate: 'AI read',
  existing: 'Library read',
  article: 'Find article',
};
</script>

<template>
  <!-- Loading -->
  <div v-if="isLoading" class="card p-6">
    <div class="flex items-center gap-3 mb-4">
      <div class="w-9 h-9 rounded-lg bg-gray-100 animate-pulse" />
      <div class="space-y-2 flex-1">
        <div class="h-4 w-32 rounded bg-gray-100 animate-pulse" />
        <div class="h-3 w-44 rounded bg-gray-100 animate-pulse" />
      </div>
    </div>
    <div class="h-10 w-full rounded-lg bg-gray-100 animate-pulse" />
  </div>

  <!-- Error -->
  <div v-else-if="isError" class="card p-6">
    <div class="flex items-start gap-3">
      <div class="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
        <AlertCircle class="w-4.5 h-4.5 text-red-500" />
      </div>
      <div class="min-w-0 flex-1">
        <h3 class="text-lg font-semibold text-gray-900">Learning Goal</h3>
        <p class="text-sm text-gray-500 mt-1 mb-4">Could not load your active goal.</p>
        <button class="btn btn-secondary gap-2 w-full justify-center" @click="refetch()">
          Try again
        </button>
      </div>
    </div>
  </div>

  <!-- No active goal -->
  <div v-else-if="!activeGoal" class="card p-6">
    <div class="flex items-center gap-3 mb-4">
      <div class="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
        <Target class="w-4.5 h-4.5 text-amber-600" />
      </div>
      <h3 class="text-lg font-semibold text-gray-900">Learning Goal</h3>
    </div>
    <p class="text-sm text-gray-500 mb-4">
      Let AI suggest what to read next based on what you want to learn.
    </p>
    <div class="flex flex-wrap gap-2 mb-4">
      <button
        v-for="prompt in quickGoalPrompts"
        :key="prompt"
        type="button"
        class="px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-xs font-medium text-gray-600 transition-colors"
        @click="openGoalModal(prompt)"
      >
        {{ prompt }}
      </button>
    </div>
    <button class="btn btn-primary gap-2 w-full justify-center" @click="openGoalModal()">
      <Sparkles class="w-4 h-4" />
      Set a goal
    </button>
  </div>

  <!-- Active goal -->
  <div v-else class="card p-6 border-primary-200">
    <div class="flex items-start justify-between gap-2 mb-3">
      <div class="flex items-center gap-2.5">
        <div class="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center shrink-0">
          <Target class="w-4.5 h-4.5 text-primary-600" />
        </div>
        <div>
          <p class="text-xs font-medium text-primary-600 uppercase tracking-wide mb-0.5">Active Goal</p>
          <div class="flex items-center gap-2 flex-wrap">
            <span :class="['text-xs font-medium px-2 py-0.5 rounded-full', typeBadgeColors[activeGoal.actionType]]">
              {{ typeLabels[activeGoal.actionType] }}
            </span>
            <span class="flex items-center gap-1 text-xs text-gray-400">
              <Clock class="w-3 h-3" />
              ~{{ activeGoal.estimatedMinutes }} min
            </span>
          </div>
        </div>
      </div>
      <button
        class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
        :disabled="isUpdating"
        title="Dismiss goal"
        @click="updateStatus({ id: activeGoal!.id, status: 'dismissed' })"
      >
        <Loader2 v-if="isUpdating" class="w-4 h-4 animate-spin" />
        <X v-else class="w-4 h-4" />
      </button>
    </div>

    <h3 class="font-semibold text-gray-900 mb-1">{{ activeGoal.title }}</h3>
    <p class="text-sm text-gray-500 leading-relaxed mb-1">{{ activeGoal.description }}</p>
    <p v-if="goalDetail" class="text-xs font-medium text-gray-500 mb-1">{{ goalDetail }}</p>
    <p class="text-xs text-gray-400 italic mb-4">{{ activeGoal.why }}</p>

    <!-- Article: show search query with copy -->
    <div
      v-if="activeGoal.actionType === 'article' && actionData.searchQuery"
      class="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 mb-3 text-sm text-gray-600"
    >
      <Globe class="w-4 h-4 text-purple-500 shrink-0" />
      <span class="flex-1 truncate">{{ actionData.searchQuery }}</span>
      <button
        class="text-gray-400 hover:text-gray-700 transition-colors shrink-0"
        :title="copied ? 'Copied!' : 'Copy search query'"
        @click="copySearchQuery"
      >
        <Check v-if="copied" class="w-4 h-4 text-green-500" />
        <Copy v-else class="w-4 h-4" />
      </button>
    </div>

    <div class="flex gap-2">
      <!-- Primary action (not shown for article) -->
      <button
        v-if="activeGoal.actionType === 'article'"
        class="btn btn-primary gap-1.5 flex-1 justify-center text-sm"
        @click="copySearchQuery"
      >
        <component :is="actionIcons[activeGoal.actionType]" class="w-3.5 h-3.5" />
        {{ copied ? 'Copied' : actionLabels[activeGoal.actionType] }}
      </button>
      <button
        v-else
        class="btn btn-primary gap-1.5 flex-1 justify-center text-sm"
        :disabled="generateReadMutation.isPending.value"
        @click="startGoal"
      >
        <Loader2 v-if="generateReadMutation.isPending.value" class="w-3.5 h-3.5 animate-spin" />
        <component v-else :is="actionIcons[activeGoal.actionType]" class="w-3.5 h-3.5" />
        {{ generateReadMutation.isPending.value ? 'Preparing...' : actionLabels[activeGoal.actionType] }}
      </button>

      <!-- Mark complete -->
      <button
        class="btn btn-secondary gap-1.5 flex-1 justify-center text-sm"
        :disabled="isUpdating"
        @click="updateStatus({ id: activeGoal!.id, status: 'completed' })"
      >
        <Loader2 v-if="isUpdating" class="w-3.5 h-3.5 animate-spin" />
        <CheckCircle2 v-else class="w-3.5 h-3.5 text-green-500" />
        Done
      </button>
    </div>

    <button
      class="mt-3 w-full text-center text-xs text-gray-400 hover:text-primary-600 transition-colors flex items-center justify-center gap-1"
      @click="openGoalModal()"
    >
      <Sparkles class="w-3 h-3" />
      Set a different goal
    </button>
    <RouterLink
      to="/goals"
      class="mt-2 w-full text-center text-xs text-gray-400 hover:text-primary-600 transition-colors block"
    >
      View goals
    </RouterLink>
  </div>

  <GoalSuggestModal
    v-if="showModal"
    :initial-intent="modalIntent"
    @close="showModal = false"
    @saved="onSaved"
  />
</template>
