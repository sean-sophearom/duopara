import { defineStore } from 'pinia';
import { api } from '../lib/api';
import { queryClient } from '../main';

export interface User {
  id: string;
  email: string;
  name?: string;
  settings?: {
    targetLanguage: string;
    nativeLanguage: string;
    knownWordsRatio: number;
    defaultDifficulty: string;
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const STORAGE_KEY = 'duopara-auth';

function loadPersistedState(): Pick<AuthState, 'user' | 'token' | 'isAuthenticated'> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        user: parsed.user ?? null,
        token: parsed.token ?? null,
        isAuthenticated: parsed.isAuthenticated ?? false,
      };
    }
  } catch { /* ignore */ }
  return { user: null, token: null, isAuthenticated: false };
}

function persistState(state: Pick<AuthState, 'user' | 'isAuthenticated'>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    user: state.user,
    isAuthenticated: state.isAuthenticated,
  }));
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    ...loadPersistedState(),
    isLoading: false,
    error: null,
  }),

  actions: {
    async login(email: string, password: string) {
      this.isLoading = true;
      this.error = null;
      try {
        const response = await api.post('/auth/login', { email, password });
        const { user, token } = response.data;
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        this.user = user;
        this.token = token;
        this.isAuthenticated = true;
        persistState(this);
      } catch (error: any) {
        this.error = error.response?.data?.error || 'Login failed';
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    async register(email: string, password: string, name?: string) {
      this.isLoading = true;
      this.error = null;
      try {
        const response = await api.post('/auth/register', { email, password, name });
        const { user, token } = response.data;
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        this.user = user;
        this.token = token;
        this.isAuthenticated = true;
        persistState(this);
      } catch (error: any) {
        this.error = error.response?.data?.error || 'Registration failed';
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    logout() {
      api.post('/auth/logout').catch(() => {});
      delete api.defaults.headers.common['Authorization'];
      this.user = null;
      this.token = null;
      this.isAuthenticated = false;
      this.error = null;
      persistState(this);
      queryClient.clear();
    },

    async checkAuth() {
      if (!this.token) return;
      try {
        api.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
        const response = await api.get('/auth/me');
        this.user = response.data.user;
        this.isAuthenticated = true;
      } catch {
        this.logout();
      }
    },

    updateUser(userData: Partial<User>) {
      if (this.user) {
        this.user = { ...this.user, ...userData };
        persistState(this);
      }
    },

    clearError() {
      this.error = null;
    },
  },
});

// Initialize auth on import
const persisted = loadPersistedState();
if (persisted.token) {
  api.defaults.headers.common['Authorization'] = `Bearer ${persisted.token}`;
}
