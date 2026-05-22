<script setup lang="ts">
import { ref } from 'vue';
import { goalsApi, type GoalSuggestion } from '../lib/api';
import {
  X,
  Sparkles,
  Loader2,
  BookOpen,
  Globe,
  Clock,
  Target,
  ChevronRight,
  RotateCcw,
  CheckCircle2,
} from 'lucide-vue-next';

const props = defineProps<{
  initialIntent?: string;
}>();

const emit = defineEmits<{
  close: [];
  saved: [];
}>();

type Step = 'input' | 'loading' | 'results';

const step = ref<Step>('input');
const intent = ref(props.initialIntent || '');
const suggestions = ref<GoalSuggestion[]>([]);
const error = ref('');
const saving = ref(false);
const savingIndex = ref<number | null>(null);

const exampleIntents = [
  'I want something easy to read every day',
  'Help me practice restaurant and food words',
  'I want to understand short news articles',
];

async function suggest() {
  if (!intent.value.trim()) return;
  error.value = '';
  step.value = 'loading';
  try {
    const res = await goalsApi.suggest(intent.value.trim());
    suggestions.value = res.data.suggestions;
    step.value = 'results';
  } catch {
    error.value = 'Could not generate suggestions. Please try again.';
    step.value = 'input';
  }
}

async function pickGoal(s: GoalSuggestion, index: number) {
  if (saving.value) return;
  saving.value = true;
  savingIndex.value = index;
  error.value = '';
  try {
    const actionData: Record<string, unknown> = {};
    if (s.actionType === 'generate') {
      actionData.topic = s.topic ?? '';
      actionData.difficulty = s.difficulty ?? 'intermediate';
    } else if (s.actionType === 'existing') {
      actionData.textId = s.textId ?? '';
      actionData.textTitle = s.textTitle ?? '';
    } else {
      actionData.source = s.source ?? '';
      actionData.searchQuery = s.searchQuery ?? '';
    }
    actionData.contentOptions = s.contentOptions ?? [];

    await goalsApi.save({
      title: s.title,
      description: s.description,
      why: s.why,
      targetWords: s.targetWords,
      estimatedMinutes: s.estimatedMinutes,
      actionType: s.actionType,
      actionData,
    });
    emit('saved');
  } catch {
    error.value = 'Failed to save goal. Please try again.';
  } finally {
    saving.value = false;
    savingIndex.value = null;
  }
}

function reset() {
  step.value = 'input';
  suggestions.value = [];
  error.value = '';
}

const actionLabels: Record<string, string> = {
  generate: 'Find or create read',
  existing: 'Read from library',
  article: 'Find article',
};

const actionIcons: Record<string, any> = {
  generate: Sparkles,
  existing: BookOpen,
  article: Globe,
};

const actionColors: Record<string, string> = {
  generate: 'text-primary-600 bg-primary-50',
  existing: 'text-green-600 bg-green-50',
  article: 'text-purple-600 bg-purple-50',
};
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal-content max-w-xl w-full">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center">
            <Sparkles class="w-4.5 h-4.5 text-primary-600" />
          </div>
          <div>
            <h2 class="text-lg font-semibold text-gray-900">Choose Today&rsquo;s Focus</h2>
            <p class="text-xs text-gray-400 mt-0.5">Pick one clear reading step</p>
          </div>
        </div>
        <button @click="emit('close')" class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Step: Input -->
      <div v-if="step === 'input'" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">
            What do you want to achieve?
          </label>
          <textarea
            v-model="intent"
            placeholder="e.g. I want to learn travel vocabulary so I can get around in Spain..."
            rows="3"
            class="input resize-none"
            @keydown.meta.enter="suggest"
            @keydown.ctrl.enter="suggest"
          />
          <p class="text-xs text-gray-400 mt-1.5">Be as specific as you like — topic, situation, skill, or goal.</p>
        </div>

        <div>
          <p class="text-xs font-medium text-gray-500 mb-2">Quick starts</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="example in exampleIntents"
              :key="example"
              type="button"
              class="px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-xs font-medium text-gray-600 transition-colors"
              @click="intent = example"
            >
              {{ example }}
            </button>
          </div>
        </div>

        <div v-if="error" class="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {{ error }}
        </div>

        <div class="flex justify-end gap-2 pt-1">
          <button class="btn btn-secondary" @click="emit('close')">Cancel</button>
          <button
            class="btn btn-primary gap-2"
            :disabled="!intent.trim()"
            @click="suggest"
          >
            <Sparkles class="w-4 h-4" />
            Suggest goals
          </button>
        </div>
      </div>

      <!-- Step: Loading -->
      <div v-else-if="step === 'loading'" class="py-12 flex flex-col items-center gap-4 text-gray-500">
        <Loader2 class="w-8 h-8 text-primary-500 animate-spin" />
        <div class="text-center">
          <p class="text-sm font-medium text-gray-700">Finding a good next read&hellip;</p>
          <p class="text-xs text-gray-400 mt-1">Balancing your language, level, and recent practice.</p>
        </div>
      </div>

      <!-- Step: Results -->
      <div v-else-if="step === 'results'" class="space-y-3">
        <p class="text-sm text-gray-500 mb-4">Pick one. You can change it later from Goals.</p>

        <div
          v-for="(s, i) in suggestions"
          :key="i"
          :class="[
            'border border-gray-200 rounded-xl p-4 hover:border-primary-200 hover:bg-primary-50/30 transition-all group',
            saving ? 'cursor-default' : 'cursor-pointer',
            saving && savingIndex !== i ? 'opacity-60' : ''
          ]"
          @click="pickGoal(s, i)"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1.5 flex-wrap">
                <span
                  :class="['inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full', actionColors[s.actionType]]"
                >
                  <component :is="actionIcons[s.actionType]" class="w-3 h-3" />
                  {{ actionLabels[s.actionType] }}
                </span>
                <span class="flex items-center gap-1 text-xs text-gray-400">
                  <Clock class="w-3 h-3" />
                  ~{{ s.estimatedMinutes }} min
                </span>
                <span class="flex items-center gap-1 text-xs text-gray-400">
                  <Target class="w-3 h-3" />
                  ~{{ s.targetWords }} new words
                </span>
              </div>

              <h3 class="font-semibold text-gray-900 text-sm">{{ s.title }}</h3>
              <p class="text-sm text-gray-500 mt-0.5 leading-relaxed">{{ s.description }}</p>
              <p class="text-xs text-gray-400 mt-1.5 italic">{{ s.why }}</p>
              <div v-if="s.contentOptions?.length" class="mt-3 rounded-lg bg-gray-50 p-3">
                <p class="text-xs font-semibold text-gray-500 mb-2">3 reading options included</p>
                <div class="space-y-1.5">
                  <div
                    v-for="option in s.contentOptions.slice(0, 3)"
                    :key="option.id"
                    class="flex items-center gap-2 text-xs text-gray-600"
                  >
                    <component :is="actionIcons[option.actionType]" class="w-3 h-3 text-gray-400 shrink-0" />
                    <span class="truncate">{{ option.title }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="shrink-0 mt-1">
              <Loader2 v-if="saving && savingIndex === i" class="w-5 h-5 text-primary-500 animate-spin" />
              <CheckCircle2 v-else-if="savingIndex === i" class="w-5 h-5 text-green-500" />
              <ChevronRight
                v-else
                class="w-5 h-5 text-gray-300 group-hover:text-primary-500 transition-colors"
              />
            </div>
          </div>
          <button
            type="button"
            class="btn btn-primary gap-1.5 mt-4 w-full justify-center text-sm"
            :disabled="saving"
            @click.stop="pickGoal(s, i)"
          >
            <Loader2 v-if="saving && savingIndex === i" class="w-3.5 h-3.5 animate-spin" />
            <Sparkles v-else class="w-3.5 h-3.5" />
            {{ saving && savingIndex === i ? 'Setting goal...' : 'Set this goal' }}
          </button>
        </div>

        <div v-if="error" class="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {{ error }}
        </div>

        <div class="flex items-center justify-between pt-2">
          <button class="btn btn-secondary gap-1.5 text-sm" :disabled="saving" @click="reset">
            <RotateCcw class="w-3.5 h-3.5" />
            Try again
          </button>
          <button class="btn btn-secondary text-sm" :disabled="saving" @click="emit('close')">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>
