<script setup lang="ts">
import { computed, ref } from 'vue';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { useRouter } from 'vue-router';
import { generateApi, goalsApi, type GoalContentOption, type SavedGoal } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import GoalSuggestModal from '../components/GoalSuggestModal.vue';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Clock,
  Copy,
  Globe,
  Loader2,
  Sparkles,
  Target,
  X,
} from 'lucide-vue-next';

const router = useRouter();
const queryClient = useQueryClient();
const authStore = useAuthStore();
const showModal = ref(false);
const modalIntent = ref('');
const copiedGoalId = ref<string | null>(null);
const activeGeneratingOptionId = ref<string | null>(null);

const quickGoalPrompts = [
  'Build a daily reading habit',
  'Practice travel conversations',
  'Learn food and restaurant words',
  'Read short news in my target language',
];

const { data, isLoading, isError, refetch } = useQuery({
  queryKey: ['goals', 'all'],
  queryFn: () => goalsApi.getAll().then((r) => r.data),
});

const goals = computed(() => data.value?.goals ?? []);
const activeGoal = computed(() => goals.value.find((goal) => goal.status === 'active'));
const pastGoals = computed(() => goals.value.filter((goal) => goal.status !== 'active'));
const completedCount = computed(() => goals.value.filter((goal) => goal.status === 'completed').length);

const { mutate: updateStatus, isPending: isUpdating } = useMutation({
  mutationFn: ({ id, status }: { id: string; status: 'active' | 'completed' | 'dismissed' }) =>
    goalsApi.updateStatus(id, status),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['goals'] });
  },
});

const generateReadMutation = useMutation({
  mutationFn: (option: GoalContentOption) =>
    generateApi.create({
      topic: option.topic || option.title,
      language: authStore.user?.settings?.targetLanguage || 'Spanish',
      difficulty: option.difficulty || authStore.user?.settings?.defaultDifficulty || 'intermediate',
      knownWordsRatio: authStore.user?.settings?.knownWordsRatio || 80,
      wordCount: Math.min(Math.max(option.estimatedMinutes * 18, 100), 350),
      includeLearningWords: true,
      includeLearnedWords: true,
      reuseExisting: true,
    }),
  onMutate: (option) => {
    activeGeneratingOptionId.value = option.id;
  },
  onSuccess: (response) => {
    activeGeneratingOptionId.value = null;
    router.push({
      path: `/read/${response.data.text.id}`,
      query: response.data.reused
        ? { reused: '1', strategy: response.data.reuseStrategy || 'existing' }
        : {},
    });
  },
  onError: () => {
    activeGeneratingOptionId.value = null;
  },
});

function parseActionData(goal: SavedGoal) {
  try {
    return JSON.parse(goal.actionData) as Record<string, unknown>;
  } catch {
    return {};
  }
}

const activeContentOptions = computed(() => {
  if (!activeGoal.value) return [];
  const actionData = parseActionData(activeGoal.value);
  const options = actionData.contentOptions;
  if (Array.isArray(options) && options.length >= 3) {
    return options.slice(0, 3) as GoalContentOption[];
  }
  return fallbackContentOptions(activeGoal.value);
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

function startGoal(goal: SavedGoal) {
  startContentOption(goalToContentOption(goal));
}

function startContentOption(option: GoalContentOption) {
  if (option.actionType === 'existing' && option.textId) {
    router.push(`/read/${option.textId}`);
    return;
  }
  if (option.actionType === 'generate') {
    generateReadMutation.mutate(option);
  }
}

async function copySearchQuery(goal: SavedGoal) {
  const q = parseActionData(goal).searchQuery;
  if (typeof q !== 'string') return;
  try {
    await navigator.clipboard.writeText(q);
    copiedGoalId.value = goal.id;
    setTimeout(() => {
      if (copiedGoalId.value === goal.id) copiedGoalId.value = null;
    }, 2000);
  } catch {
    // Clipboard failures are non-blocking.
  }
}

async function copyOptionSearch(option: GoalContentOption) {
  if (!option.searchQuery) return;
  try {
    await navigator.clipboard.writeText(option.searchQuery);
    copiedGoalId.value = option.id;
    setTimeout(() => {
      if (copiedGoalId.value === option.id) copiedGoalId.value = null;
    }, 2000);
  } catch {
    // Clipboard failures are non-blocking.
  }
}

function goalDetail(goal: SavedGoal) {
  const actionData = parseActionData(goal);
  if (goal.actionType === 'generate' && typeof actionData.topic === 'string') return actionData.topic;
  if (goal.actionType === 'existing' && typeof actionData.textTitle === 'string') return actionData.textTitle;
  if (goal.actionType === 'article' && typeof actionData.searchQuery === 'string') return actionData.searchQuery;
  return '';
}

function goalToContentOption(goal: SavedGoal): GoalContentOption {
  const actionData = parseActionData(goal);
  return {
    id: goal.id,
    title: goalDetail(goal) || goal.title,
    description: goal.description,
    targetWords: goal.targetWords,
    estimatedMinutes: goal.estimatedMinutes,
    actionType: goal.actionType,
    topic: typeof actionData.topic === 'string' ? actionData.topic : undefined,
    difficulty: typeof actionData.difficulty === 'string' ? actionData.difficulty : undefined,
    textId: typeof actionData.textId === 'string' ? actionData.textId : undefined,
    textTitle: typeof actionData.textTitle === 'string' ? actionData.textTitle : undefined,
    source: typeof actionData.source === 'string' ? actionData.source : undefined,
    searchQuery: typeof actionData.searchQuery === 'string' ? actionData.searchQuery : undefined,
  };
}

function fallbackContentOptions(goal: SavedGoal): GoalContentOption[] {
  const primary = goalToContentOption(goal);
  const topic = primary.topic || primary.textTitle || primary.searchQuery || goal.title;
  const difficulty = primary.difficulty || 'intermediate';
  return [
    primary,
    {
      id: `${goal.id}-related-read`,
      title: 'Related saved or new read',
      description: 'Find a matching saved read first, or create one only if needed.',
      targetWords: goal.targetWords,
      estimatedMinutes: goal.estimatedMinutes,
      actionType: 'generate',
      topic,
      difficulty,
    },
    {
      id: `${goal.id}-article`,
      title: 'Real-world article',
      description: 'Use an outside article for extra reading practice.',
      targetWords: goal.targetWords,
      estimatedMinutes: Math.max(10, goal.estimatedMinutes),
      actionType: 'article',
      source: 'News or learning article',
      searchQuery: topic,
    },
  ];
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

const typeLabels: Record<string, string> = {
  generate: 'AI read',
  existing: 'Library read',
  article: 'Find article',
};

const typeBadgeColors: Record<string, string> = {
  generate: 'bg-primary-50 text-primary-600',
  existing: 'bg-green-50 text-green-600',
  article: 'bg-purple-50 text-purple-600',
};

const statusColors: Record<string, string> = {
  completed: 'bg-green-50 text-green-700',
  dismissed: 'bg-gray-100 text-gray-600',
};
</script>

<template>
  <div class="max-w-6xl mx-auto space-y-8">
    <div class="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl sm:text-3xl font-bold text-gray-900">Goals</h1>
        <p class="text-gray-600 mt-1">Pick one focus, open a read, then mark the goal done when you finish.</p>
      </div>
      <button class="btn btn-primary gap-2 justify-center" @click="openGoalModal()">
        <Sparkles class="w-4 h-4" />
        Suggest a goal
      </button>
    </div>

    <div v-if="isLoading" class="card p-8 flex items-center justify-center gap-3 text-gray-500">
      <Loader2 class="w-5 h-5 animate-spin text-primary-600" />
      Loading goals...
    </div>

    <div v-else-if="isError" class="card p-8">
      <div class="flex items-start gap-3">
        <AlertCircle class="w-5 h-5 text-red-500 mt-0.5" />
        <div class="flex-1">
          <h2 class="font-semibold text-gray-900">Could not load goals</h2>
          <p class="text-sm text-gray-500 mt-1 mb-4">Try again to refresh your goals.</p>
          <button class="btn btn-secondary" @click="refetch()">Try again</button>
        </div>
      </div>
    </div>

    <template v-else>
      <section class="grid md:grid-cols-3 gap-4">
        <div class="card p-5">
          <div class="flex items-center gap-3 mb-2">
            <div class="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center text-primary-700 font-semibold">1</div>
            <h2 class="font-semibold text-gray-900">Choose a focus</h2>
          </div>
          <p class="text-sm text-gray-500">Tell Kontexi what you want to practice today.</p>
        </div>
        <div class="card p-5">
          <div class="flex items-center gap-3 mb-2">
            <div class="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-green-700 font-semibold">2</div>
            <h2 class="font-semibold text-gray-900">Open a read</h2>
          </div>
          <p class="text-sm text-gray-500">Use a saved text first, or create a new one when there is no good match.</p>
        </div>
        <div class="card p-5">
          <div class="flex items-center gap-3 mb-2">
            <div class="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 font-semibold">3</div>
            <h2 class="font-semibold text-gray-900">Finish and review</h2>
          </div>
          <p class="text-sm text-gray-500">Read, save useful words, then mark the goal done.</p>
        </div>
      </section>

      <div class="grid md:grid-cols-3 gap-4">
        <div class="card p-5">
          <p class="text-sm text-gray-500">Active goal</p>
          <p class="text-3xl font-bold text-gray-900 mt-2">{{ activeGoal ? 1 : 0 }}</p>
        </div>
        <div class="card p-5">
          <p class="text-sm text-gray-500">Completed</p>
          <p class="text-3xl font-bold text-gray-900 mt-2">{{ completedCount }}</p>
        </div>
        <div class="card p-5">
          <p class="text-sm text-gray-500">Total created</p>
          <p class="text-3xl font-bold text-gray-900 mt-2">{{ goals.length }}</p>
        </div>
      </div>

      <section class="card p-6">
        <div class="flex items-center justify-between gap-4 mb-5">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <Target class="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h2 class="text-lg font-semibold text-gray-900">Current Focus</h2>
              <p class="text-sm text-gray-500">Your next reading step.</p>
            </div>
          </div>
        </div>

        <div v-if="activeGoal" class="rounded-xl border border-primary-200 bg-primary-50/30 p-5">
          <div class="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2 mb-3">
                <span :class="['text-xs font-medium px-2 py-1 rounded-full', typeBadgeColors[activeGoal.actionType]]">
                  {{ typeLabels[activeGoal.actionType] }}
                </span>
                <span class="flex items-center gap-1 text-xs text-gray-500">
                  <Clock class="w-3 h-3" />
                  ~{{ activeGoal.estimatedMinutes }} min
                </span>
                <span class="flex items-center gap-1 text-xs text-gray-500">
                  <Target class="w-3 h-3" />
                  ~{{ activeGoal.targetWords }} words
                </span>
              </div>
              <h3 class="text-xl font-semibold text-gray-900">{{ activeGoal.title }}</h3>
              <p class="text-sm text-gray-600 mt-2 leading-relaxed">{{ activeGoal.description }}</p>
              <p v-if="goalDetail(activeGoal)" class="text-sm font-medium text-gray-700 mt-3">{{ goalDetail(activeGoal) }}</p>
              <p class="text-xs text-gray-500 italic mt-2">{{ activeGoal.why }}</p>

              <div class="mt-5">
                <div class="flex items-center justify-between gap-3 mb-3">
                  <h4 class="text-sm font-semibold text-gray-900">Choose one content</h4>
                  <span class="text-xs text-gray-500">{{ activeContentOptions.length }} options</span>
                </div>
                <div class="grid gap-3">
                  <article
                    v-for="option in activeContentOptions"
                    :key="option.id"
                    class="rounded-lg border border-white/80 bg-white p-3"
                  >
                    <div class="flex flex-col md:flex-row md:items-start justify-between gap-3">
                      <div class="min-w-0">
                        <div class="flex flex-wrap items-center gap-2 mb-1.5">
                          <span :class="['text-xs font-medium px-2 py-0.5 rounded-full', typeBadgeColors[option.actionType]]">
                            {{ typeLabels[option.actionType] }}
                          </span>
                          <span class="text-xs text-gray-400">~{{ option.estimatedMinutes }} min</span>
                        </div>
                        <h5 class="font-medium text-gray-900 truncate">{{ option.title }}</h5>
                        <p class="text-xs text-gray-500 mt-1 line-clamp-2">{{ option.description }}</p>
                      </div>
                      <button
                        v-if="option.actionType === 'article'"
                        class="btn btn-secondary gap-2 text-sm md:w-32 justify-center"
                        @click="copyOptionSearch(option)"
                      >
                        <Copy class="w-4 h-4" />
                        {{ copiedGoalId === option.id ? 'Copied' : 'Copy' }}
                      </button>
                      <button
                        v-else
                        class="btn btn-primary gap-2 text-sm md:w-32 justify-center"
                        :disabled="generateReadMutation.isPending.value"
                        @click="startContentOption(option)"
                      >
                        <Loader2
                          v-if="activeGeneratingOptionId === option.id"
                          class="w-4 h-4 animate-spin"
                        />
                        <component v-else :is="actionIcons[option.actionType]" class="w-4 h-4" />
                        {{ activeGeneratingOptionId === option.id ? 'Preparing...' : 'Open' }}
                      </button>
                    </div>
                  </article>
                </div>
              </div>
            </div>
            <div class="flex flex-col sm:flex-row lg:flex-col gap-2 lg:w-44">
              <button
                v-if="activeGoal.actionType === 'article'"
                class="btn btn-primary gap-2 justify-center"
                @click="copySearchQuery(activeGoal)"
              >
                <Copy class="w-4 h-4" />
                {{ copiedGoalId === activeGoal.id ? 'Copied' : actionLabels[activeGoal.actionType] }}
              </button>
              <button v-else class="btn btn-primary gap-2 justify-center" @click="startGoal(activeGoal)">
                <component :is="actionIcons[activeGoal.actionType]" class="w-4 h-4" />
                {{ actionLabels[activeGoal.actionType] }}
              </button>
              <button
                class="btn btn-secondary gap-2 justify-center"
                :disabled="isUpdating"
                @click="updateStatus({ id: activeGoal.id, status: 'completed' })"
              >
                <Loader2 v-if="isUpdating" class="w-4 h-4 animate-spin" />
                <CheckCircle2 v-else class="w-4 h-4 text-green-500" />
                Done
              </button>
              <button
                class="btn btn-secondary gap-2 justify-center"
                :disabled="isUpdating"
                @click="updateStatus({ id: activeGoal.id, status: 'dismissed' })"
              >
                <X class="w-4 h-4" />
                Dismiss
              </button>
            </div>
          </div>
        </div>

        <div v-else class="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6">
          <h3 class="font-semibold text-gray-900">No active goal yet</h3>
          <p class="text-sm text-gray-500 mt-1 mb-4">Start with a small reading goal and let Kontexi suggest the best next step.</p>
          <div class="flex flex-wrap gap-2 mb-5">
            <button
              v-for="prompt in quickGoalPrompts"
              :key="prompt"
              type="button"
              class="px-3 py-1.5 rounded-full bg-white hover:bg-gray-100 border border-gray-200 text-xs font-medium text-gray-600 transition-colors"
              @click="openGoalModal(prompt)"
            >
              {{ prompt }}
            </button>
          </div>
          <button class="btn btn-primary gap-2" @click="openGoalModal()">
            <Sparkles class="w-4 h-4" />
            Suggest a goal
          </button>
        </div>
      </section>

      <section class="card p-6">
        <div class="flex items-center justify-between gap-4 mb-5">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">Goal History</h2>
            <p class="text-sm text-gray-500 mt-1">Review what you finished or skipped.</p>
          </div>
        </div>

        <div v-if="pastGoals.length" class="divide-y divide-gray-100">
          <article v-for="goal in pastGoals" :key="goal.id" class="py-4 first:pt-0 last:pb-0">
            <div class="flex flex-col md:flex-row md:items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2 mb-1.5">
                  <span :class="['text-xs font-medium px-2 py-0.5 rounded-full', statusColors[goal.status]]">
                    {{ goal.status }}
                  </span>
                  <span :class="['text-xs font-medium px-2 py-0.5 rounded-full', typeBadgeColors[goal.actionType]]">
                    {{ typeLabels[goal.actionType] }}
                  </span>
                  <span class="text-xs text-gray-400">{{ new Date(goal.createdAt).toLocaleDateString() }}</span>
                </div>
                <h3 class="font-semibold text-gray-900">{{ goal.title }}</h3>
                <p class="text-sm text-gray-500 mt-1">{{ goal.description }}</p>
              </div>
              <button
                class="btn btn-secondary gap-2 text-sm md:w-36 justify-center"
                :disabled="isUpdating"
                @click="updateStatus({ id: goal.id, status: 'active' })"
              >
                <Target class="w-4 h-4" />
                Make active
              </button>
            </div>
          </article>
        </div>

        <div v-else class="rounded-xl bg-gray-50 p-8 text-center">
          <CheckCircle2 class="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p class="font-medium text-gray-700">No goal history yet</p>
          <p class="text-sm text-gray-500 mt-1">Completed and dismissed goals will appear here.</p>
        </div>
      </section>
    </template>

    <GoalSuggestModal
      v-if="showModal"
      :initial-intent="modalIntent"
      @close="showModal = false"
      @saved="onSaved"
    />
  </div>
</template>
