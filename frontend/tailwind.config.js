/** @type {import('tailwindcss').Config} */
import forms from '@tailwindcss/forms';

export default {
  content: [
    './index.html',
    './**/*.{js,ts,jsx,tsx}',
  ],
  presets: [],
  theme: {
    // v4 requires fully defined colors with no auto-generated shades
    colors: {
      white: '#ffffff',
      black: '#000000',
      transparent: 'transparent',
      current: 'currentColor',
      
      // Updated primary color to a rich teal
      primary: {
        50: '#eefcfc',
        100: '#d6f7f7',
        200: '#b0efef',
        300: '#7de4e4',
        400: '#47d3d3',
        500: '#2abebe',
        600: '#1a9f9f',
        700: '#197f7f',
        800: '#196767',
        900: '#1a5555',
        950: '#083838',
      },
      
      // Warmer gray palette with slight teal undertones
      gray: {
        50: '#f8fafa',
        100: '#f0f4f4',
        200: '#e2e9e9',
        300: '#cedada',
        400: '#a9bcbc',
        500: '#8aa0a0',
        600: '#6e8484',
        700: '#5a6c6c',
        800: '#445454',
        900: '#2c3838',
        950: '#1a2424',
      },
      
      // More vivid coral accent for better visibility and clickability
      accent: {
        50: '#fff5f1',
        100: '#ffe8df',
        200: '#ffd0bc',
        300: '#ffb090',
        400: '#ff7d4d',
        500: '#ff5722',
        600: '#f04000',
        700: '#cc3300',
        800: '#a82900',
        900: '#8a2300',
        950: '#461100',
      },
      
      // Richer red for alerts
      red: {
        50: '#fff1f2',
        100: '#ffe4e7',
        200: '#fececd',
        300: '#fba7ab',
        400: '#f66e76',
        500: '#ee414b',
        600: '#d91e29',
        700: '#b5161f',
        800: '#95161e',
        900: '#7c171e',
        950: '#43080c',
      },
      
      // More vibrant green
      green: {
        50: '#effef7',
        100: '#dafeef',
        200: '#b8f9dc',
        300: '#85f2c4',
        400: '#43e19d',
        500: '#1fc881',
        600: '#13a467',
        700: '#138255',
        800: '#146647',
        900: '#13543c',
        950: '#052e1f',
      },
      
      // Additional palette colors for rich UI
      purple: {
        50: '#f6f3ff',
        100: '#ede9fe',
        200: '#dcd1fd',
        300: '#c3adfc',
        400: '#a37af8',
        500: '#8a4cf3',
        600: '#7832e5',
        700: '#6821c8',
        800: '#571ca4',
        900: '#491b87',
        950: '#2d0f61',
      },
      
      amber: {
        50: '#fffce8',
        100: '#fff8c2',
        200: '#ffef88',
        300: '#ffe14a',
        400: '#ffd01f',
        500: '#f5b800',
        600: '#dc8f00',
        700: '#b36302',
        800: '#934d08',
        900: '#7a3d0c',
        950: '#432009',
      },
    },
    extend: {
      fontFamily: {
        sans: ['Inter var', 'system-ui', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
        '112': '28rem',
        '128': '32rem',
      },
      borderRadius: {
        '4xl': '2rem',
        'large': '1rem',
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        'elevated': '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'button': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'cta': '0 10px 15px -3px rgba(240, 64, 0, 0.2), 0 4px 6px -2px rgba(240, 64, 0, 0.1)',
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-in': 'slide-in 0.3s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'pulse-light': 'pulse-light 2s infinite',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in': {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'pulse-light': {
          '0%': { opacity: '1', boxShadow: '0 10px 15px -3px rgba(240, 64, 0, 0.2), 0 4px 6px -2px rgba(240, 64, 0, 0.1)' },
          '50%': { opacity: '0.92', boxShadow: '0 15px 20px -3px rgba(240, 64, 0, 0.3), 0 8px 8px -2px rgba(240, 64, 0, 0.2)' },
          '100%': { opacity: '1', boxShadow: '0 10px 15px -3px rgba(240, 64, 0, 0.2), 0 4px 6px -2px rgba(240, 64, 0, 0.1)' },
        },
      },
    },
  },
  plugins: [forms],
} 