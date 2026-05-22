<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { useQuery } from '@tanstack/vue-query';
import { ArrowLeft, CheckCircle2, Languages } from 'lucide-vue-next';
import AuthLayout from '../components/AuthLayout.vue';
import { settingsApi } from '../lib/api';
import { getLanguageFlag, getNativeLanguageOptions, type LanguageOption } from '../lib/languageMeta';

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

const { data: languages } = useQuery({
  queryKey: ['languages'],
  queryFn: () => settingsApi.getLanguages().then((r) => r.data.languages as LanguageOption[]),
});

const nativeLanguageOptions = computed(() => {
  return getNativeLanguageOptions(languages.value || []);
});

const selectedNativeLanguage = ref(
  typeof route.query.nativeLanguage === 'string' ? route.query.nativeLanguage : 'English'
);

function continueToCreateAccount() {
  router.push({
    path: '/register',
    query: {
      targetLanguage: targetLanguage.value,
      level: selectedLevel.value,
      nativeLanguage: selectedNativeLanguage.value,
    },
  });
}
</script>

<template>
  <AuthLayout subtitle="Step 3 of 3">
    <div class="card p-8 sm:p-10">
      <p class="text-xs font-semibold uppercase tracking-[0.18em] text-primary-700">Step 3 of 3</p>
      <h2 class="mt-2 text-2xl font-bold text-gray-900">Choose your native language</h2>
      <p class="mt-1 text-sm text-gray-500">Used for translations and hints while you read.</p>

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
            'rounded-xl border px-4 py-4 text-left transition',
            selectedNativeLanguage === lang.code
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
          ]"
        >
          <p class="text-sm font-semibold text-gray-900">{{ getLanguageFlag(lang.code) }} {{ lang.name }}</p>
          <p class="truncate text-xs text-gray-500">{{ lang.nativeName || lang.name }}</p>
        </button>
      </div>

      <div class="mt-8 rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 text-sm text-gray-700">
        <p class="font-semibold text-gray-900">Your setup</p>
        <p class="mt-1">
          Learn <strong>{{ targetLanguage }}</strong> at
          <strong class="capitalize"> {{ selectedLevel }}</strong> level, with translations in
          <strong>{{ selectedNativeLanguage }}</strong>.
        </p>
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
          Continue to create account
        </button>
      </div>

      <p class="mt-4 flex items-center justify-center gap-1 text-xs text-gray-500">
        <Languages class="h-3.5 w-3.5" />
        You can switch both languages anytime in the sidebar.
      </p>
    </div>
  </AuthLayout>
</template>
