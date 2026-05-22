<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { useQuery } from '@tanstack/vue-query';
import { ArrowLeft, CheckCircle2, Languages } from 'lucide-vue-next';
import AuthLayout from '../components/AuthLayout.vue';
import { settingsApi } from '../lib/api';
import {
  getLanguageFlag,
  getLanguageShortCode,
  getNativeLanguageOptions,
  type LanguageOptionsResponse,
} from '../lib/languageMeta';

const router = useRouter();
const route = useRoute();

const targetLanguage = computed(() =>
  typeof route.query.targetLanguage === 'string' ? route.query.targetLanguage : 'Spanish'
);

const selectedLevel = computed(() => {
  const value = route.query.level;
  return value === 'beginner' || value === 'intermediate' || value === 'advanced'
    ? value
    : 'beginner';
});

const { data: languageConfig } = useQuery({
  queryKey: ['language-config'],
  queryFn: () => settingsApi.getLanguages().then((r) => r.data as LanguageOptionsResponse),
});

const nativeLanguageOptions = computed(() => {
  return getNativeLanguageOptions(
    languageConfig.value?.languages || [],
    languageConfig.value?.nativeLanguages
  ).filter((lang) => !sameLanguage(lang.code, targetLanguage.value));
});

const selectedNativeLanguage = ref(
  typeof route.query.nativeLanguage === 'string' ? route.query.nativeLanguage : 'English'
);

function continueToCreateAccount() {
  if (sameLanguage(selectedNativeLanguage.value, targetLanguage.value)) {
    selectedNativeLanguage.value = nativeLanguageOptions.value[0]?.code || 'English';
  }

  router.push({
    path: '/register',
    query: {
      targetLanguage: targetLanguage.value,
      level: selectedLevel.value,
      nativeLanguage: selectedNativeLanguage.value,
    },
  });
}

function sameLanguage(a: string | undefined, b: string | undefined) {
  return a?.trim().toLowerCase() === b?.trim().toLowerCase();
}
</script>

<template>
  <AuthLayout subtitle="Step 3 of 3">
    <div class="card p-8 sm:p-10">
      <p class="text-xs font-semibold uppercase tracking-[0.18em] text-primary-700">Step 3 of 3</p>
      <h2 class="mt-2 text-2xl font-bold text-gray-900">Pick your native</h2>
      <p class="mt-1 text-sm text-gray-500">Hints, fast and easy.</p>

      <div class="my-8 h-1.5 rounded-full bg-gray-100">
        <div class="h-full w-full rounded-full bg-primary-500" />
      </div>

      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <button
          v-for="lang in nativeLanguageOptions"
          :key="lang.code"
          type="button"
          @click="selectedNativeLanguage = lang.code"
          :class="[
            'rounded-2xl border px-4 py-5 text-center transition',
            selectedNativeLanguage === lang.code
              ? 'border-primary-500 bg-primary-50 shadow-sm'
              : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
          ]"
        >
          <div class="flex items-center justify-center gap-4">
            <span class="inline-flex h-10 w-12 items-center justify-center text-4xl">
              {{ getLanguageFlag(lang.code) }}
            </span>
            <p class="text-base font-extrabold tracking-wide text-gray-900">{{ getLanguageShortCode(lang.code) }}</p>
          </div>
        </button>
      </div>

      <div class="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <RouterLink
          :to="{ path: '/register/setup/level', query: { targetLanguage, level: selectedLevel, nativeLanguage: selectedNativeLanguage } }"
          class="btn btn-secondary w-full sm:w-auto"
        >
          <ArrowLeft class="mr-2 h-4 w-4" />
          Back
        </RouterLink>
        <button type="button" class="btn btn-primary w-full sm:w-auto" @click="continueToCreateAccount">
          <CheckCircle2 class="mr-2 h-4 w-4" />
          Create account
        </button>
      </div>

      <p class="mt-4 flex items-center justify-center gap-1 text-xs text-gray-500">
        <Languages class="h-3.5 w-3.5" />
        You can always change this later in settings.
      </p>
    </div>
  </AuthLayout>
</template>
