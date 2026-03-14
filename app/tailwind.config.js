/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Duolingo-inspired Green (Primary)
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#58cc02', // Duolingo green
          500: '#58cc02',
          600: '#4caf00',
          700: '#3d8c00',
          800: '#326d00',
          900: '#1a4301',
        },
        // Blue (Secondary/Info)
        secondary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#1cb0f6', // Duolingo blue
          500: '#1cb0f6',
          600: '#1899d6',
          700: '#0c7bba',
          800: '#0a5c8a',
          900: '#073d5c',
        },
        // Golden Yellow (Streak/Warning)
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#ffc800', // Duolingo gold
          500: '#ffc800',
          600: '#d4a500',
          700: '#a78300',
          800: '#7a6000',
          900: '#4d3d00',
        },
        // Red (Error/Wrong)
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#ff4b4b', // Duolingo red
          500: '#ff4b4b',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        // Clean grays
        owl: {
          50: '#f7f7f7',
          100: '#efefef',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#afafaf',
          500: '#777777',
          600: '#4b4b4b',
          700: '#3c3c3c',
          800: '#2b2b2b',
          900: '#1a1a1a',
        },
      },
    },
  },
  plugins: [],
};
