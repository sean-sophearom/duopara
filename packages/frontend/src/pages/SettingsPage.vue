<script setup lang="ts">
import { ref, watch } from 'vue';
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import { settingsApi } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { Check, Loader2, Save, ShieldAlert } from 'lucide-vue-next';

const authStore = useAuthStore();
const queryClient = useQueryClient();

const targetLanguage = ref(authStore.user?.settings?.targetLanguage || 'Spanish');
const nativeLanguage = ref(authStore.user?.settings?.nativeLanguage || 'English');
const knownWordsRatio = ref(authStore.user?.settings?.knownWordsRatio || 80);
const defaultDifficulty = ref(authStore.user?.settings?.defaultDifficulty || 'intermediate');
const saved = ref(false);

const highlightLearned = ref(localStorage.getItem('duopara.highlightLearned') !== 'false');
const highlightLearning = ref(localStorage.getItem('duopara.highlightLearning') !== 'false');
const highlightNew = ref(localStorage.getItem('duopara.highlightNew') !== 'false');

function setHighlight(key: string, refVal: ReturnType<typeof ref<boolean>>, value: boolean) {
  localStorage.setItem(key, String(value));
  refVal.value = value;
}

const highlightToggles = [
  {
    label: 'Learned words',
    description: 'Words you have marked as fully learned',
    swatch: 'bg-green-200',
    ref: highlightLearned,
    key: 'duopara.highlightLearned',
  },
  {
    label: 'Learning words',
    description: 'Words you have added to your learning list',
    swatch: 'bg-yellow-200',
    ref: highlightLearning,
    key: 'duopara.highlightLearning',
  },
  {
    label: 'New words',
    description: "Words the text introduced that you haven't seen before",
    swatch: 'bg-primary-200',
    ref: highlightNew,
    key: 'duopara.highlightNew',
  },
];

const { data: languages } = useQuery({
  queryKey: ['languages'],
  queryFn: () => settingsApi.getLanguages().then(r => r.data.languages),
});

const { data: settings } = useQuery({
  queryKey: ['settings'],
  queryFn: () => settingsApi.get().then(r => r.data.settings),
});

watch(settings, (s) => {
  if (s) {
    targetLanguage.value = s.targetLanguage;
    nativeLanguage.value = s.nativeLanguage;
    knownWordsRatio.value = s.knownWordsRatio;
    defaultDifficulty.value = s.defaultDifficulty;
  }
});

const updateMutation = useMutation({
  mutationFn: settingsApi.update,
  onSuccess: (response) => {
    queryClient.invalidateQueries({ queryKey: ['settings'] });
    authStore.updateUser({ settings: response.data.settings });
    saved.value = true;
    setTimeout(() => (saved.value = false), 2000);
  },
});

function handleSave() {
  updateMutation.mutate({
    targetLanguage: targetLanguage.value,
    nativeLanguage: nativeLanguage.value,
    knownWordsRatio: knownWordsRatio.value,
    defaultDifficulty: defaultDifficulty.value,
  });
}

const nativeLangOptions = [{ code: 'English', name: 'English' }];
const difficultyLevels = ['beginner', 'intermediate', 'advanced'];
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <div class="mb-8">
      <h1 class="text-2xl sm:text-3xl font-bold text-gray-900">Settings</h1>
      <p class="text-gray-600 mt-1">Configure your learning preferences</p>
    </div>

    <div class="card p-6 space-y-8">
      <!-- Language settings -->
      <div>
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Language Settings</h2>
        <div class="grid md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Target Language</label>
            <p class="text-xs text-gray-500 mb-2">The language you're learning</p>
            <select v-model="targetLanguage" class="input">
              <option v-for="lang in languages" :key="lang.code" :value="lang.code">
                {{ lang.name }} ({{ lang.nativeName }})
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Native Language</label>
            <p class="text-xs text-gray-500 mb-2">Your native language for translations</p>
            <select v-model="nativeLanguage" class="input">
              <option v-for="lang in nativeLangOptions" :key="lang.code" :value="lang.code">{{ lang.name }}</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Generation defaults -->
      <div class="border-t border-gray-200 pt-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Generation Defaults</h2>
        <div class="space-y-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Default Difficulty</label>
            <div class="flex gap-2">
              <button
                v-for="level in difficultyLevels" :key="level" type="button"
                @click="defaultDifficulty = level"
                :class="[
                  'flex-1 py-2 px-4 rounded-lg border transition-colors capitalize',
                  defaultDifficulty === level
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-300 hover:border-gray-400'
                ]"
              >
                {{ level }}
              </button>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Default Vocabulary Mix</label>
            <p class="text-xs text-gray-500 mb-3">The default ratio of known words to new words in generated texts</p>
            <div class="flex items-center gap-4">
              <input type="range" min="50" max="95" step="5" v-model.number="knownWordsRatio" class="flex-1" />
              <span class="text-sm font-medium text-gray-900 w-28 text-right">{{ knownWordsRatio }}% known</span>
            </div>
            <div class="flex justify-between text-xs text-gray-500 mt-1">
              <span>More challenging</span>
              <span>More comfortable</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Reading highlights -->
      <div class="border-t border-gray-200 pt-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-1">Reading Highlights</h2>
        <p class="text-sm text-gray-500 mb-4">Choose which word types are highlighted while reading</p>
        <div class="space-y-4">
          <div v-for="toggle in highlightToggles" :key="toggle.label" class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <span :class="['inline-block w-3 h-3 rounded-sm shrink-0', toggle.swatch]" />
              <div>
                <p class="text-sm font-medium text-gray-900">{{ toggle.label }}</p>
                <p class="text-xs text-gray-500">{{ toggle.description }}</p>
              </div>
            </div>
            <button
              type="button"
              @click="setHighlight(toggle.key, toggle.ref, !toggle.ref.value)"
              :class="['relative inline-flex h-6 w-11 items-center rounded-full transition-colors', toggle.ref.value ? 'bg-primary-600' : 'bg-gray-200']"
            >
              <span :class="['inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform', toggle.ref.value ? 'translate-x-6' : 'translate-x-1']" />
            </button>
          </div>
        </div>
      </div>

      <!-- Account info -->
      <div class="border-t border-gray-200 pt-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4">Account</h2>
        <div class="space-y-3">
          <div class="flex items-center justify-between py-2">
            <span class="text-sm text-gray-600">Email</span>
            <span class="text-sm font-medium text-gray-900">{{ authStore.user?.email }}</span>
          </div>
          <div v-if="authStore.user?.name" class="flex items-center justify-between py-2">
            <span class="text-sm text-gray-600">Name</span>
            <span class="text-sm font-medium text-gray-900">{{ authStore.user.name }}</span>
          </div>
        </div>

        <div class="mt-4 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <ShieldAlert class="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
          <p class="text-xs text-amber-800 leading-relaxed">
            <strong>Keep your credentials safe.</strong>
            Never share your password or account access with others.
            If you suspect your account has been compromised, change your password immediately.
          </p>
        </div>
      </div>

      <!-- Save button -->
      <div class="border-t border-gray-200 pt-6">
        <button @click="handleSave" :disabled="updateMutation.isPending.value" class="btn btn-primary w-full sm:w-auto">
          <template v-if="updateMutation.isPending.value">
            <Loader2 class="w-4 h-4 animate-spin mr-2" /> Saving...
          </template>
          <template v-else-if="saved">
            <Check class="w-4 h-4 mr-2" /> Saved!
          </template>
          <template v-else>
            <Save class="w-4 h-4 mr-2" /> Save Settings
          </template>
        </button>
      </div>
    </div>
  </div>
</template>
