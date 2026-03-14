import { useThemeStore } from '../store/themeStore';

const palette = {
  light: {
    owl50: '#f8fafc', owl100: '#ffffff', owl200: '#f1f5f9', owl300: '#e2e8f0',
    owl400: '#94a3b8', owl500: '#64748b', owl600: '#475569', owl700: '#334155',
    owl800: '#1e293b', owl900: '#0f172a',
    statusBar: 'dark-content' as const,
    colorScheme: 'light' as const,
  },
  dark: {
    owl50: '#0f0f0f', owl100: '#1a1a1a', owl200: '#252525', owl300: '#333333',
    owl400: '#555555', owl500: '#888888', owl600: '#a0a0a0', owl700: '#cccccc',
    owl800: '#e8e8e8', owl900: '#f5f5f5',
    statusBar: 'light-content' as const,
    colorScheme: 'dark' as const,
  },
} as const;

export function useThemeColors() {
  const colorScheme = useThemeStore((s) => s.colorScheme);
  return palette[colorScheme];
}
