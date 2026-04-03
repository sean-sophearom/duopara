<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../store/authStore';
import { Loader2 } from 'lucide-vue-next';
import AuthLayout from '../components/AuthLayout.vue';
import ErrorAlert from '../components/ErrorAlert.vue';

const name = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const validationError = ref('');
const authStore = useAuthStore();
const router = useRouter();

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
        <RouterLink to="/login" class="text-primary-600 hover:text-primary-700 font-medium">
          Sign in
        </RouterLink>
      </p>
    </div>
  </AuthLayout>
</template>
