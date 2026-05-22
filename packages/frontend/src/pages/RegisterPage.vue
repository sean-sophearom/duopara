<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../store/authStore';
import { Loader2 } from 'lucide-vue-next';
import AuthLayout from '../components/AuthLayout.vue';
import ErrorAlert from '../components/ErrorAlert.vue';
import { settingsApi } from '../lib/api';
import { getLanguageFlag } from '../lib/languageMeta';

const name = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const validationError = ref('');
const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();

const selectedTargetLanguage = computed(() =>
  typeof route.query.targetLanguage === 'string' ? route.query.targetLanguage : 'Spanish'
);
const selectedNativeLanguage = computed(() =>
  typeof route.query.nativeLanguage === 'string' ? route.query.nativeLanguage : 'English'
);
const selectedLevel = computed(() => {
  const value = route.query.level;
  return value === 'beginner' || value === 'intermediate' || value === 'advanced'
    ? value
    : 'beginner';
});

async function handleSubmit() {
  validationError.value = '';

  if (password.value !== confirmPassword.value) {
    validationError.value = 'Passwords do not match';
    return;
  }

  if (password.value.length < 6) {
    validationError.value = 'Password must be at least 6 characters';
    return;
  }

  try {
    await authStore.register(email.value, password.value, name.value || undefined);

    try {
      const response = await settingsApi.update({
        targetLanguage: selectedTargetLanguage.value,
        nativeLanguage: selectedNativeLanguage.value,
        defaultDifficulty: selectedLevel.value,
      });
      authStore.updateUser({ settings: response.data.settings });
    } catch {
      // Keep registration successful even if preference save fails.
    }

    router.push('/dashboard');
  } catch {
    // Error is handled by the store
  }
}

const displayError = computed(() => validationError.value || authStore.error);

function dismissError() {
  validationError.value = '';
  authStore.clearError();
}
</script>

<template>
  <AuthLayout subtitle="Start your language learning journey">
    <div class="card p-8">
      <h2 class="text-2xl font-semibold text-center mb-6">Create an account</h2>

      <div class="mb-6 rounded-xl border border-primary-200 bg-primary-50 p-3">
        <p class="text-xs font-semibold uppercase tracking-wide text-primary-700">Your setup</p>
        <div class="mt-2 grid gap-2 sm:grid-cols-3">
          <div class="rounded-lg bg-white px-3 py-2 text-sm">
            <p class="text-gray-500">Target</p>
            <p class="font-semibold text-gray-900">{{ getLanguageFlag(selectedTargetLanguage) }} {{ selectedTargetLanguage }}</p>
          </div>
          <div class="rounded-lg bg-white px-3 py-2 text-sm">
            <p class="text-gray-500">Level</p>
            <p class="font-semibold capitalize text-gray-900">{{ selectedLevel }}</p>
          </div>
          <div class="rounded-lg bg-white px-3 py-2 text-sm">
            <p class="text-gray-500">Native</p>
            <p class="font-semibold text-gray-900">{{ getLanguageFlag(selectedNativeLanguage) }} {{ selectedNativeLanguage }}</p>
          </div>
        </div>
        <RouterLink
          :to="{
            path: '/register/setup/target',
            query: {
              targetLanguage: selectedTargetLanguage,
              nativeLanguage: selectedNativeLanguage,
              level: selectedLevel,
            },
          }"
          class="mt-2 inline-block text-xs font-medium text-primary-700 hover:text-primary-800"
        >
          Change preferences
        </RouterLink>
      </div>

      <ErrorAlert v-if="displayError" :error="displayError!" @dismiss="dismissError" />

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div>
          <label for="name" class="block text-sm font-medium text-gray-700 mb-1">Name (optional)</label>
          <input id="name" type="text" v-model="name" class="input" placeholder="Your name" />
        </div>

        <div>
          <label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input id="email" type="email" v-model="email" class="input" placeholder="you@example.com" required />
        </div>

        <div>
          <label for="password" class="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input id="password" type="password" v-model="password" class="input" placeholder="••••••••" required minlength="6" />
        </div>

        <div>
          <label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
          <input id="confirmPassword" type="password" v-model="confirmPassword" class="input" placeholder="••••••••" required />
        </div>

        <button type="submit" :disabled="authStore.isLoading" class="btn btn-primary w-full py-3">
          <template v-if="authStore.isLoading">
            <Loader2 class="w-5 h-5 animate-spin mr-2" />
            Creating account...
          </template>
          <template v-else>Create account</template>
        </button>
      </form>

      <p class="text-center text-gray-600 mt-6">
        Already have an account?
        <RouterLink to="/login/form" class="text-primary-600 hover:text-primary-700 font-medium">
          Sign in
        </RouterLink>
      </p>
    </div>
  </AuthLayout>
</template>
