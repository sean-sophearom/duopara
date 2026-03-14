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
        // Duolingo-inspired Green (Primary)
        primary: {
          50: 'var(--primary-50)',
          100: 'var(--primary-100)',
          200: 'var(--primary-200)',
          300: 'var(--primary-300)',
          400: '#58cc02',
          500: '#58cc02',
          600: '#6dd616',
          700: '#82e02e',
          800: '#a3ea6b',
          900: '#d4f5b0',
        },
        // Blue (Secondary/Info)
        secondary: {
          50: 'var(--secondary-50)',
          100: 'var(--secondary-100)',
          200: 'var(--secondary-200)',
          300: 'var(--secondary-300)',
          400: '#1cb0f6',
          500: '#1cb0f6',
          600: '#40bff8',
          700: '#6dd0fa',
          800: '#9ae0fc',
          900: '#d0f0fe',
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
