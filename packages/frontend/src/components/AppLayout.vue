<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';
import { useMutation, useQuery } from '@tanstack/vue-query';
import { useAuthStore } from '../store/authStore';
import { settingsApi } from '../lib/api';
import {
  getLanguageFlag,
  getNativeLanguageOptions,
  type LanguageOptionsResponse,
} from '../lib/languageMeta';
import {
  LayoutDashboard,
  BookOpen,
  History,
  BookMarked,
  Settings,
  LogOut,
  Menu,
  X,
  Gamepad2,
  PackagePlus,
  Target,
} from 'lucide-vue-next';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/goals', icon: Target, label: 'Goals' },
  { to: '/generate', icon: BookOpen, label: 'Reads' },
  {
    to: '/vocabulary',
    icon: BookMarked,
    label: 'Vocabulary',
    children: [{ to: '/vocabulary/packs', icon: PackagePlus, label: 'Preset Packs' }],
  },
  { to: '/practice', icon: Gamepad2, label: 'Practice' },
  { to: '/history', icon: History, label: 'History' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

const sidebarOpen = ref(false);
const showTargetPicker = ref(false);
const showNativePicker = ref(false);
const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();

const { data: languageConfig } = useQuery({
  queryKey: ['language-config'],
  queryFn: () => settingsApi.getLanguages().then((r) => r.data as LanguageOptionsResponse),
});

const targetLanguage = computed(() => authStore.user?.settings?.targetLanguage || 'Spanish');
const nativeLanguage = computed(() => authStore.user?.settings?.nativeLanguage || 'English');
const languageOptions = computed(() =>
  (languageConfig.value?.languages || []).filter((lang) => !sameLanguage(lang.code, nativeLanguage.value))
);
const nativeLanguageOptions = computed(() =>
  getNativeLanguageOptions(languageConfig.value?.languages || [], languageConfig.value?.nativeLanguages)
    .filter((lang) => !sameLanguage(lang.code, targetLanguage.value))
);

const updateSettings = useMutation({
  mutationFn: settingsApi.update,
  onSuccess: (response) => {
    authStore.updateUser({ settings: response.data.settings });
  },
});

const targetLanguageName = computed(() => {
  const found = languageConfig.value?.languages.find((lang) => lang.code === targetLanguage.value);
  return found?.name || targetLanguage.value;
});

const nativeLanguageName = computed(() => {
  const found = nativeLanguageOptions.value.find((lang) => lang.code === nativeLanguage.value);
  return found?.name || nativeLanguage.value;
});

function setTargetLanguage(code: string) {
  if (sameLanguage(code, nativeLanguage.value)) return;
  updateSettings.mutate({ targetLanguage: code });
  showTargetPicker.value = false;
}

function setNativeLanguage(code: string) {
  if (sameLanguage(code, targetLanguage.value)) return;
  updateSettings.mutate({ nativeLanguage: code });
  showNativePicker.value = false;
}

function sameLanguage(a: string | undefined, b: string | undefined) {
  return a?.trim().toLowerCase() === b?.trim().toLowerCase();
}

function closeLanguagePickers() {
  showTargetPicker.value = false;
  showNativePicker.value = false;
}

watch(
  () => route.fullPath,
  () => {
    closeLanguagePickers();
  }
);

function handleLogout() {
  authStore.logout();
  router.push('/login');
}
</script>

<template>
  <div class="min-h-dvh bg-gray-50">
    <!-- Mobile header -->
    <header class="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-30 flex items-center px-4">
      <button @click="sidebarOpen = true" class="p-2 hover:bg-gray-100 rounded-lg">
        <Menu class="w-6 h-6" />
      </button>
      <div class="flex items-center gap-2 ml-4">
        <BookOpen class="w-6 h-6 text-primary-600" />
        <span class="font-bold text-lg">Kontexi</span>
      </div>
    </header>

    <!-- Mobile sidebar overlay -->
    <div
      v-if="sidebarOpen"
      class="lg:hidden fixed inset-0 bg-black/50 z-40"
      @click="sidebarOpen = false; closeLanguagePickers()"
    />

    <!-- Sidebar -->
    <aside
      class="fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-50 transform transition-transform duration-200 ease-in-out lg:translate-x-0"
      :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <div class="flex flex-col h-full">
        <!-- Logo -->
        <div class="h-16 flex items-center justify-between px-4 border-b border-gray-200">
          <div class="flex items-center gap-2">
            <BookOpen class="w-7 h-7 text-primary-600" />
            <span class="font-bold text-xl">Kontexi</span>
          </div>
          <button @click="sidebarOpen = false" class="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 p-4 space-y-1">
          <div v-for="item in navItems" :key="item.to">
            <RouterLink
              :to="item.to"
              @click="sidebarOpen = false; closeLanguagePickers()"
              :class="[
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                route.path === item.to || route.path.startsWith(item.to + '/')
                  ? 'bg-primary-50 text-primary-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              ]"
            >
              <component :is="item.icon" class="w-5 h-5" />
              {{ item.label }}
            </RouterLink>
            <div v-if="item.children && route.path.startsWith(item.to)" class="mt-1 ml-8 space-y-1">
              <RouterLink
                v-for="child in item.children"
                :key="child.to"
                :to="child.to"
                @click="sidebarOpen = false; closeLanguagePickers()"
                :class="[
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors',
                  route.path === child.to
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                ]"
              >
                <component :is="child.icon" class="w-4 h-4" />
                {{ child.label }}
              </RouterLink>
            </div>
          </div>
        </nav>

        <!-- User section -->
        <div class="p-4 border-t border-gray-200">
          <div class="mb-3 space-y-2">
            <div class="relative">
              <button
                type="button"
                @click="showTargetPicker = !showTargetPicker; showNativePicker = false"
                class="w-full flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-left transition hover:border-gray-300 hover:bg-white"
              >
                <div class="min-w-0">
                  <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">Target</p>
                  <p class="truncate text-sm font-medium text-gray-900">
                    {{ getLanguageFlag(targetLanguage) }} {{ targetLanguageName }}
                  </p>
                </div>
                <span class="text-gray-400">▾</span>
              </button>

              <div
                v-if="showTargetPicker"
                class="absolute inset-x-0 bottom-full mb-2 max-h-56 overflow-auto rounded-lg border border-gray-200 bg-white p-1 shadow-lg"
              >
                <button
                  v-for="lang in languageOptions"
                  :key="lang.code"
                  type="button"
                  @click="setTargetLanguage(lang.code)"
                  class="w-full rounded-md px-3 py-2 text-left text-sm transition hover:bg-primary-50"
                  :class="targetLanguage === lang.code ? 'bg-primary-50 text-primary-800' : 'text-gray-700'"
                >
                  {{ getLanguageFlag(lang.code) }} {{ lang.name }}
                </button>
              </div>
            </div>

            <div class="relative">
              <button
                type="button"
                @click="showNativePicker = !showNativePicker; showTargetPicker = false"
                class="w-full flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-left transition hover:border-gray-300 hover:bg-white"
              >
                <div class="min-w-0">
                  <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">Native</p>
                  <p class="truncate text-sm font-medium text-gray-900">
                    {{ getLanguageFlag(nativeLanguage) }} {{ nativeLanguageName }}
                  </p>
                </div>
                <span class="text-gray-400">▾</span>
              </button>

              <div
                v-if="showNativePicker"
                class="absolute inset-x-0 bottom-full mb-2 max-h-56 overflow-auto rounded-lg border border-gray-200 bg-white p-1 shadow-lg"
              >
                <button
                  v-for="lang in nativeLanguageOptions"
                  :key="lang.code"
                  type="button"
                  @click="setNativeLanguage(lang.code)"
                  class="w-full rounded-md px-3 py-2 text-left text-sm transition hover:bg-primary-50"
                  :class="nativeLanguage === lang.code ? 'bg-primary-50 text-primary-800' : 'text-gray-700'"
                >
                  {{ getLanguageFlag(lang.code) }} {{ lang.name }}
                </button>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-3 px-4 py-2 mb-2">
            <div class="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
              <span class="text-primary-700 font-medium">
                {{ authStore.user?.name?.[0] || authStore.user?.email?.[0] || 'U' }}
              </span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 truncate">
                {{ authStore.user?.name || 'User' }}
              </p>
              <p class="text-xs text-gray-500 truncate">{{ authStore.user?.email }}</p>
            </div>
          </div>
          <button
            @click="handleLogout"
            class="w-full flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <LogOut class="w-5 h-5" />
            Log out
          </button>
        </div>
      </div>
    </aside>

    <!-- Main content -->
    <main class="lg:pl-64 pt-16 lg:pt-0 min-h-dvh flex">
      <div class="p-4 lg:p-8 flex-1 min-w-0">
        <RouterView />
      </div>
    </main>
  </div>
</template>
