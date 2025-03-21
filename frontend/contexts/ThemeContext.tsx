import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Theme } from '../types/theme';
import { defaultTheme, themes } from '../theme/index';

// Theme context type
interface ThemeContextType {
  theme: Theme;
  themeName: string;
  setTheme: (themeName: string) => void;
  availableThemes: string[];
}

// Create the context with a default value
const defaultThemeContext: ThemeContextType = {
  theme: defaultTheme,
  themeName: 'default',
  setTheme: () => {},
  availableThemes: Object.keys(themes),
};

const ThemeContext = createContext<ThemeContextType>(defaultThemeContext);

// Get local storage theme or default
const getInitialTheme = (): string => {
  if (typeof window !== 'undefined') {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme && themes[savedTheme] ? savedTheme : 'default';
  }
  return 'default';
};

// Theme provider props
interface ThemeProviderProps {
  children: ReactNode;
}

// Theme provider component
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themeName, setThemeName] = useState<string>(getInitialTheme());
  const [theme, setThemeObj] = useState<Theme>(themes[themeName] || defaultTheme);

  // Apply CSS variables to document root
  useEffect(() => {
    const root = document.documentElement;
    // Set the data-theme attribute on the body
    document.body.setAttribute('data-theme', themeName);
    
    // Set primary color variables
    Object.entries(theme.colors.primary).forEach(([shade, value]) => {
      root.style.setProperty(`--color-primary-${shade}`, value);
    });
    
    // Set secondary color variables
    Object.entries(theme.colors.secondary).forEach(([shade, value]) => {
      root.style.setProperty(`--color-secondary-${shade}`, value);
      root.style.setProperty(`--color-gray-${shade}`, value); // For backward compatibility
    });
    
    // Set accent color variables
    Object.entries(theme.colors.accent).forEach(([shade, value]) => {
      root.style.setProperty(`--color-accent-${shade}`, value);
    });
    
    // Set other color variables (red, green, etc.)
    ['red', 'green', 'purple', 'amber'].forEach(colorName => {
      Object.entries(theme.colors[colorName as keyof typeof theme.colors]).forEach(([shade, value]) => {
        root.style.setProperty(`--color-${colorName}-${shade}`, value);
      });
    });

    // Set shadow variables
    Object.entries(theme.shadows).forEach(([key, value]) => {
      root.style.setProperty(`--shadow-${key}`, value);
    });

    // Set border radius variables
    Object.entries(theme.borderRadius).forEach(([key, value]) => {
      root.style.setProperty(`--radius-${key}`, value);
    });

    // Save theme to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', themeName);
    }
  }, [theme, themeName]);

  // Function to change theme
  const setTheme = (name: string) => {
    if (themes[name]) {
      setThemeName(name);
      setThemeObj(themes[name]);
    }
  };

  return (
    <ThemeContext.Provider 
      value={{ 
        theme, 
        themeName, 
        setTheme, 
        availableThemes: Object.keys(themes) 
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use the theme
export const useTheme = () => useContext(ThemeContext);

export default ThemeProvider; 