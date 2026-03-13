import { create } from 'zustand';
import { api, setAuthToken, loadAuthToken } from '../lib/api';
import * as SecureStore from 'expo-secure-store';

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
  isInitialized: boolean;
  error: string | null;
  
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  initialize: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  error: null,

  initialize: async () => {
    try {
      const token = await loadAuthToken();
      if (token) {
        // Verify token is still valid
        try {
          const response = await api.get('/auth/me');
          set({
            user: response.data.user,
            token,
            isAuthenticated: true,
            isInitialized: true,
          });
        } catch {
          // Token invalid, clear it
          await setAuthToken(null);
          set({ isAuthenticated: false, isInitialized: true });
        }
      } else {
        set({ isInitialized: true });
      }
    } catch {
      set({ isInitialized: true });
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user, token } = response.data;
      
      await setAuthToken(token);
      
      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Login failed',
        isLoading: false
      });
      throw error;
    }
  },

  register: async (email: string, password: string, name?: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/register', { email, password, name });
      const { user, token } = response.data;
      
      await setAuthToken(token);
      
      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.error || 'Registration failed',
        isLoading: false
      });
      throw error;
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore logout errors
    }
    await setAuthToken(null);
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null
    });
  },

  checkAuth: async () => {
    const { token } = get();
    if (!token) {
      set({ isAuthenticated: false });
      return;
    }
    
    try {
      const response = await api.get('/auth/me');
      set({
        user: response.data.user,
        isAuthenticated: true
      });
    } catch {
      await setAuthToken(null);
      set({
        user: null,
        token: null,
        isAuthenticated: false
      });
    }
  },

  updateUser: (userData: Partial<User>) => {
    const { user } = get();
    if (user) {
      set({ user: { ...user, ...userData } });
    }
  },

  clearError: () => set({ error: null }),
}));
