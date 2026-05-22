<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { ArrowLeft, ArrowRight, Zap } from 'lucide-vue-next';
import AuthLayout from '../components/AuthLayout.vue';

const router = useRouter();
const route = useRoute();

const targetLanguage = computed(() =>
  typeof route.query.targetLanguage === 'string' ? route.query.targetLanguage : 'Spanish'
);

const selectedLevel = ref<'beginner' | 'intermediate' | 'advanced'>(
  route.query.level === 'beginner' || route.query.level === 'intermediate' || route.query.level === 'advanced'
    ? route.query.level
    : 'beginner'
);

const levelCards = [
  {
    value: 'beginner' as const,
    title: 'Beginner',
    detail: 'Easy words, chill pace.',
    accent: 'from-emerald-500 to-teal-500',
  },
  {
    value: 'intermediate' as const,
    title: 'Intermediate',
    detail: 'Real talk, smoother flow.',
    accent: 'from-sky-500 to-cyan-500',
  },
  {
    value: 'advanced' as const,
    title: 'Advanced',
    detail: 'Nuance, style, depth.',
    accent: 'from-indigo-500 to-fuchsia-500',
  },
];

function continueStep() {
  router.push({
    path: '/register/setup/native',
    query: {
      targetLanguage: targetLanguage.value,
      level: selectedLevel.value,
      nativeLanguage:
        typeof route.query.nativeLanguage === 'string' ? route.query.nativeLanguage : undefined,
    },
  });
}
</script>

<template>
  <AuthLayout subtitle="Step 2 of 3">
    <div class="card p-8 sm:p-10">
      <p class="text-xs font-semibold uppercase tracking-[0.18em] text-primary-700">Step 2 of 3</p>
      <h2 class="mt-2 text-2xl font-bold text-gray-900">Pick your speed</h2>
      <p class="mt-1 text-sm text-gray-500">How does {{ targetLanguage }} feel?</p>

      <div class="my-8 h-1.5 rounded-full bg-gray-100">
        <div class="h-full w-2/3 rounded-full bg-primary-500" />
      </div>

      <div class="space-y-4">
        <button
          v-for="item in levelCards"
          :key="item.value"
          type="button"
          @click="selectedLevel = item.value"
          :class="[
            'w-full rounded-xl border px-5 py-5 text-left transition',
            selectedLevel === item.value
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
          ]"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-base font-semibold text-gray-900">{{ item.title }}</p>
              <p class="mt-1 text-xs text-gray-500">{{ item.detail }}</p>
            </div>
            <div class="rounded-md bg-gradient-to-r p-2 text-white" :class="item.accent">
              <Zap class="h-4 w-4" />
            </div>
          </div>
        </button>
      </div>

      <div class="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <RouterLink
          :to="{ path: '/register/setup/target', query: { targetLanguage, level: selectedLevel, nativeLanguage: route.query.nativeLanguage } }"
          class="btn btn-secondary w-full sm:w-auto"
        >
          <ArrowLeft class="mr-2 h-4 w-4" />
          Back
        </RouterLink>
        <button type="button" class="btn btn-primary w-full sm:w-auto" @click="continueStep">
          Continue
          <ArrowRight class="ml-2 h-4 w-4" />
        </button>
      </div>
    </div>
  </AuthLayout>
</template>
