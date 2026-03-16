/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Nunito_400Regular'],
        medium: ['Nunito_600SemiBold'],
        bold: ['Nunito_700Bold'],
        extrabold: ['Nunito_800ExtraBold'],
      },
      colors: {
        // Blue (Primary)
        primary: {
          50: 'var(--primary-50)',
          100: 'var(--primary-100)',
          200: 'var(--primary-200)',
          300: 'var(--primary-300)',
          400: '#3b82f6',
          500: '#2563eb',
          600: '#60a5fa',
          700: '#93c5fd',
          800: '#bfdbfe',
          900: '#dbeafe',
        },
        // Purple (Secondary)
        secondary: {
          50: 'var(--secondary-50)',
          100: 'var(--secondary-100)',
          200: 'var(--secondary-200)',
          300: 'var(--secondary-300)',
          400: '#7c3aed',
          500: '#8b5cf6',
          600: '#a78bfa',
          700: '#c4b5fd',
          800: '#ddd6fe',
          900: '#ede9fe',
        },
        // Golden Yellow (Streak/Warning)
        warning: {
          50: 'var(--warning-50)',
          100: 'var(--warning-100)',
          200: 'var(--warning-200)',
          300: 'var(--warning-300)',
          400: '#ffc800',
          500: '#ffc800',
          600: '#ffd633',
          700: '#ffe066',
          800: '#ffeb99',
          900: '#fff5cc',
        },
        // Red (Error/Wrong)
        danger: {
          50: 'var(--danger-50)',
          100: 'var(--danger-100)',
          200: 'var(--danger-200)',
          300: 'var(--danger-300)',
          400: '#ff4b4b',
          500: '#ff4b4b',
          600: '#ff6b6b',
          700: '#ff8a8a',
          800: '#ffaaaa',
          900: '#ffd5d5',
        },
        // Theme-aware grays (semantically ordered)
        owl: {
          50: 'var(--owl-50)',
          100: 'var(--owl-100)',
          200: 'var(--owl-200)',
          300: 'var(--owl-300)',
          400: 'var(--owl-400)',
          500: 'var(--owl-500)',
          600: 'var(--owl-600)',
          700: 'var(--owl-700)',
          800: 'var(--owl-800)',
          900: 'var(--owl-900)',
        },
      },
    },
  },
  plugins: [],
};
