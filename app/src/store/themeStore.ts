import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

const THEME_KEY = 'duopara_theme';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  colorScheme: 'light' | 'dark';
  isInitialized: boolean;
  setMode: (mode: ThemeMode) => Promise<void>;
  initialize: () => Promise<void>;
}

function resolveScheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') return Appearance.getColorScheme() || 'dark';
  return mode;
}

export const useThemeStore = create<ThemeState>()((set, get) => ({
  mode: 'dark',
  colorScheme: 'dark',
  isInitialized: false,

  initialize: async () => {
    try {
      const saved = (await AsyncStorage.getItem(THEME_KEY)) as ThemeMode | null;
      const mode = saved || 'dark';
      const colorScheme = resolveScheme(mode);
      Appearance.setColorScheme(mode === 'system' ? null : mode);
      set({ mode, colorScheme, isInitialized: true });
    } catch {
      set({ isInitialized: true });
    }

    Appearance.addChangeListener(({ colorScheme }) => {
      const { mode } = get();
      if (mode === 'system') {
        set({ colorScheme: colorScheme || 'dark' });
      }
    });
  },

  setMode: async (mode: ThemeMode) => {
    await AsyncStorage.setItem(THEME_KEY, mode);
    Appearance.setColorScheme(mode === 'system' ? null : mode);
    set({ mode, colorScheme: resolveScheme(mode) });
  },
}));
