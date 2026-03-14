import { useThemeStore } from '../store/themeStore';

const palette = {
  light: {
    owl50: '#f8fafc', owl100: '#ffffff', owl200: '#f1f5f9', owl300: '#e2e8f0',
    owl400: '#78849a', owl500: '#5b6b82', owl600: '#475569', owl700: '#334155',
    owl800: '#1e293b', owl900: '#0f172a',
    statusBar: 'dark-content' as const,
    colorScheme: 'light' as const,
  },
  dark: {
    owl50: '#1c1c1e', owl100: '#2c2c2e', owl200: '#3a3a3c', owl300: '#48484a',
    owl400: '#8e8e93', owl500: '#a1a1a6', owl600: '#c7c7cc', owl700: '#d1d1d6',
    owl800: '#e5e5ea', owl900: '#f2f2f7',
    statusBar: 'light-content' as const,
    colorScheme: 'dark' as const,
  },
} as const;

export function useThemeColors() {
  const colorScheme = useThemeStore((s) => s.colorScheme);
  return palette[colorScheme];
}
