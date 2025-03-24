/**
 * Theme Configuration
 * This file serves as a single source of truth for the application's theme.
 * To change the entire color palette, simply modify or swap the active theme.
 */

export interface ColorScale {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
}

export interface ThemeColors {
  primary: ColorScale;
  secondary: ColorScale; // Uses 'gray' in the current theme
  accent: ColorScale;
  red: ColorScale;
  green: ColorScale;
  purple: ColorScale;
  amber: ColorScale;
}

export interface Theme {
  name: string;
  colors: ThemeColors;
}

// Default Theme (Teal, Gray, Coral)
export const defaultTheme: Theme = {
  name: 'Default',
  colors: {
    // Rich teal primary
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
    
    // Warmer gray secondary with slight teal undertones
    secondary: {
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
    
    // Vivid coral accent
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
    
    // Supporting colors
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
  }
};

// Purple Theme Example
export const purpleTheme: Theme = {
  name: 'Purple',
  colors: {
    primary: {
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
    secondary: {
      50: '#f9f9fb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d2d6dc',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
      950: '#0c1222',
    },
    accent: {
      50: '#fff5f2',
      100: '#ffece6',
      200: '#ffcfc0',
      300: '#ffa799',
      400: '#ff7961',
      500: '#ff4d37',
      600: '#ea2b15',
      700: '#c41d0e',
      800: '#a11c11',
      900: '#851c14',
      950: '#470b07',
    },
    // Keep the same supporting colors
    red: defaultTheme.colors.red,
    green: defaultTheme.colors.green,
    purple: defaultTheme.colors.purple,
    amber: defaultTheme.colors.amber,
  }
};

// Blue Theme Example
export const blueTheme: Theme = {
  name: 'Blue',
  colors: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      950: '#172554',
    },
    secondary: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
      950: '#020617',
    },
    accent: {
      50: '#fff7ed',
      100: '#ffedd5',
      200: '#fed7aa',
      300: '#fdba74',
      400: '#fb923c',
      500: '#f97316',
      600: '#ea580c',
      700: '#c2410c',
      800: '#9a3412',
      900: '#7c2d12',
      950: '#431407',
    },
    // Keep the same supporting colors
    red: defaultTheme.colors.red,
    green: defaultTheme.colors.green,
    purple: defaultTheme.colors.purple,
    amber: defaultTheme.colors.amber,
  }
};

// Active theme - this is what gets exported and used by the application
// To change themes, simply change this export to a different theme
export const activeTheme: Theme = defaultTheme;

// Export individual colors for easier access
export const colors = activeTheme.colors; 