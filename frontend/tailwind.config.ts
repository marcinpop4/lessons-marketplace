/** @type {import('tailwindcss').Config} */
import forms from '@tailwindcss/forms';
import { colors } from './theme';

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
      
      // Use colors from theme file
      primary: colors.primary,
      gray: colors.secondary, // Map secondary color to gray for backward compatibility
      secondary: colors.secondary,
      accent: colors.accent,
      red: colors.red,
      green: colors.green,
      purple: colors.purple,
      amber: colors.amber,
    },
    boxShadow: {
      none: 'none',
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
      // Custom shadows
      soft: '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
      card: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
      elevated: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      button: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
      cta: '0 10px 15px -3px rgba(240, 64, 0, 0.2), 0 4px 6px -2px rgba(240, 64, 0, 0.1)',
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