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
          50: '#0a2e0a',
          100: '#143d14',
          200: '#1e5c1e',
          300: '#2d7a2d',
          400: '#58cc02',
          500: '#58cc02',
          600: '#6dd616',
          700: '#82e02e',
          800: '#a3ea6b',
          900: '#d4f5b0',
        },
        // Blue (Secondary/Info)
        secondary: {
          50: '#0a1e2e',
          100: '#0f2840',
          200: '#163d5c',
          300: '#1e5a8a',
          400: '#1cb0f6',
          500: '#1cb0f6',
          600: '#40bff8',
          700: '#6dd0fa',
          800: '#9ae0fc',
          900: '#d0f0fe',
        },
        // Golden Yellow (Streak/Warning)
        warning: {
          50: '#2e2400',
          100: '#3d3000',
          200: '#5c4a00',
          300: '#8a7000',
          400: '#ffc800',
          500: '#ffc800',
          600: '#ffd633',
          700: '#ffe066',
          800: '#ffeb99',
          900: '#fff5cc',
        },
        // Red (Error/Wrong)
        danger: {
          50: '#2e0a0a',
          100: '#3d1a1a',
          200: '#5c2222',
          300: '#8a3333',
          400: '#ff4b4b',
          500: '#ff4b4b',
          600: '#ff6b6b',
          700: '#ff8a8a',
          800: '#ffaaaa',
          900: '#ffd5d5',
        },
        // Dark mode grays (inverted for dark-first design)
        owl: {
          50: '#0f0f0f',
          100: '#1a1a1a',
          200: '#252525',
          300: '#333333',
          400: '#555555',
          500: '#888888',
          600: '#a0a0a0',
          700: '#cccccc',
          800: '#e8e8e8',
          900: '#f5f5f5',
        },
      },
    },
  },
  plugins: [],
};
