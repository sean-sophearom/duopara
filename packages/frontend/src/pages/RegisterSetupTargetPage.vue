<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { useQuery } from '@tanstack/vue-query';
import { ArrowLeft, ArrowRight, Compass } from 'lucide-vue-next';
import AuthLayout from '../components/AuthLayout.vue';
import { settingsApi } from '../lib/api';
import {
  getLanguageFlag,
  getLanguageShortCode,
  type LanguageOption,
} from '../lib/languageMeta';

const router = useRouter();
const route = useRoute();

const { data: languages } = useQuery({
  queryKey: ['languages'],
  queryFn: () => settingsApi.getLanguages().then((r) => r.data.languages as LanguageOption[]),
});

const selectedTargetLanguage = ref(
  typeof route.query.targetLanguage === 'string' ? route.query.targetLanguage : 'Spanish'
);

const languageOptions = computed(() =>
  (languages.value || []).length > 0
    ? (languages.value || [])
    : [
        { code: 'Spanish', name: 'Spanish', nativeName: 'Espanol' },
        { code: 'French', name: 'French', nativeName: 'Francais' },
      ]
);

function continueStep() {
  const nativeLanguage =
    typeof route.query.nativeLanguage === 'string' && !sameLanguage(route.query.nativeLanguage, selectedTargetLanguage.value)
      ? route.query.nativeLanguage
      : undefined;

  router.push({
    path: '/register/setup/level',
    query: {
      targetLanguage: selectedTargetLanguage.value,
      nativeLanguage,
      level: typeof route.query.level === 'string' ? route.query.level : undefined,
    },
  });
}

function sameLanguage(a: string | undefined, b: string | undefined) {
  return a?.trim().toLowerCase() === b?.trim().toLowerCase();
}
</script>

<template>
  <AuthLayout subtitle="Step 1 of 3">
    <div class="card p-8 sm:p-10">
      <p class="text-xs font-semibold uppercase tracking-[0.18em] text-primary-700">Step 1 of 3</p>
      <h2 class="mt-2 text-2xl font-bold text-gray-900">Pick your language</h2>
      <p class="mt-1 text-sm text-gray-500">Quick pick. Big fun.</p>

      <div class="my-8 h-1.5 rounded-full bg-gray-100">
        <div class="h-full w-1/3 rounded-full bg-primary-500" />
      </div>

      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <button
          v-for="lang in languageOptions"
          :key="lang.code"
          type="button"
          @click="selectedTargetLanguage = lang.code"
          :class="[
            'rounded-2xl border px-4 py-5 text-center transition',
            selectedTargetLanguage === lang.code
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
        <RouterLink to="/login" class="btn btn-secondary w-full sm:w-auto">
          <ArrowLeft class="mr-2 h-4 w-4" />
          Back
        </RouterLink>
        <button type="button" class="btn btn-primary w-full sm:w-auto" @click="continueStep">
          Continue
          <ArrowRight class="ml-2 h-4 w-4" />
        </button>
      </div>

      <p class="mt-4 flex items-center justify-center gap-1 text-xs text-gray-500">
        <Compass class="h-3.5 w-3.5" />
        You can always change this later in settings.
      </p>
    </div>
  </AuthLayout>
</template>
