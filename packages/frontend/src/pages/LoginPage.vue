<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../store/authStore';
import { Loader2 } from 'lucide-vue-next';
import AuthLayout from '../components/AuthLayout.vue';
import ErrorAlert from '../components/ErrorAlert.vue';

const email = ref('');
const password = ref('');
const authStore = useAuthStore();
const router = useRouter();

async function handleSubmit() {
  try {
    await authStore.login(email.value, password.value);
    router.push('/dashboard');
  } catch {
    // Error is handled by the store
  }
}
</script>

<template>
  <AuthLayout subtitle="Learn languages through personalized reading">
    <div class="card p-8">
      <h2 class="text-2xl font-semibold text-center mb-6">Welcome back</h2>

      <ErrorAlert v-if="authStore.error" :error="authStore.error" @dismiss="authStore.clearError()" />

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            id="email"
            type="email"
            v-model="email"
            class="input"
            placeholder="you@example.com"
            required
          />
        </div>

        <div>
          <label for="password" class="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            id="password"
            type="password"
            v-model="password"
            class="input"
            placeholder="••••••••"
            required
          />
        </div>

        <button type="submit" :disabled="authStore.isLoading" class="btn btn-primary w-full py-3">
          <template v-if="authStore.isLoading">
            <Loader2 class="w-5 h-5 animate-spin mr-2" />
            Signing in...
          </template>
          <template v-else>Sign in</template>
        </button>
      </form>

      <p class="text-center text-gray-600 mt-6">
        Don't have an account?
        <RouterLink to="/register" class="text-primary-600 hover:text-primary-700 font-medium">
          Sign up
        </RouterLink>
      </p>
    </div>
  </AuthLayout>
</template>
