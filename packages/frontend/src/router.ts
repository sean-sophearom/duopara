import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from './store/authStore';

const router = createRouter({
  history: createWebHistory(import.meta.env.VITE_BASE_PATH || '/'),
  routes: [
    {
      path: '/login',
      component: () => import('./pages/AuthChoicePage.vue'),
      meta: { requiresGuest: true },
    },
    {
      path: '/login/form',
      component: () => import('./pages/LoginPage.vue'),
      meta: { requiresGuest: true },
    },
    {
      path: '/register/setup',
      redirect: '/register/setup/target',
      meta: { requiresGuest: true },
    },
    {
      path: '/register/setup/target',
      component: () => import('./pages/RegisterSetupTargetPage.vue'),
      meta: { requiresGuest: true },
    },
    {
      path: '/register/setup/level',
      component: () => import('./pages/RegisterSetupLevelPage.vue'),
      meta: { requiresGuest: true },
    },
    {
      path: '/register/setup/native',
      component: () => import('./pages/RegisterSetupNativePage.vue'),
      meta: { requiresGuest: true },
    },
    {
      path: '/register',
      component: () => import('./pages/RegisterPage.vue'),
      meta: { requiresGuest: true },
    },
    {
      path: '/',
      component: () => import('./components/AppLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        { path: '', redirect: '/dashboard' },
        { path: 'dashboard', component: () => import('./pages/DashboardPage.vue') },
        { path: 'goals', component: () => import('./pages/GoalsPage.vue') },
        { path: 'generate', component: () => import('./pages/GeneratePage.vue') },
        { path: 'read/:textId', component: () => import('./pages/ReadPage/ReadPage.vue') },
        { path: 'history', component: () => import('./pages/HistoryPage.vue') },
        { path: 'vocabulary', component: () => import('./pages/VocabularyPage.vue') },
        { path: 'vocabulary/packs', component: () => import('./pages/VocabularyPacksPage.vue') },
        { path: 'practice', component: () => import('./pages/PracticePage.vue') },
        { path: 'settings', component: () => import('./pages/SettingsPage.vue') },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
});

router.beforeEach((to) => {
  const authStore = useAuthStore();

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return '/login';
  }

  if (to.meta.requiresGuest && authStore.isAuthenticated) {
    return '/dashboard';
  }
});

export { router };
