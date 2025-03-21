import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ThemeProvider, { useTheme } from '../contexts/ThemeContext';
import { themes } from '../theme';

// Test component that uses the theme
const TestComponent = () => {
  const { theme, themeName, setTheme, availableThemes } = useTheme();
  
  return (
    <div>
      <h1 data-testid="theme-name">{themeName}</h1>
      <div data-testid="primary-color">{theme.colors.primary[500]}</div>
      <select 
        data-testid="theme-select"
        value={themeName}
        onChange={(e) => setTheme(e.target.value)}
      >
        {availableThemes.map(name => (
          <option key={name} value={name}>{name}</option>
        ))}
      </select>
    </div>
  );
};

describe('ThemeContext', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });
  
  it('provides the default theme when no theme is stored', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    
    expect(screen.getByTestId('theme-name')).toHaveTextContent('default');
    expect(screen.getByTestId('primary-color')).toHaveTextContent(themes.default.colors.primary[500]);
  });
  
  it('allows changing the theme', async () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    
    // Initial state is default theme
    expect(screen.getByTestId('theme-name')).toHaveTextContent('default');
    
    // Change to dark theme
    fireEvent.change(screen.getByTestId('theme-select'), { target: { value: 'dark' } });
    
    // Check if theme was changed
    expect(screen.getByTestId('theme-name')).toHaveTextContent('dark');
    expect(screen.getByTestId('primary-color')).toHaveTextContent(themes.dark.colors.primary[500]);
    
    // Verify theme was stored in localStorage
    await waitFor(() => {
      expect(localStorage.getItem('theme')).toBe('dark');
    });
  });
  
  it('loads the theme from localStorage on initialization', () => {
    // Set theme in localStorage
    localStorage.setItem('theme', 'warm');
    
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    
    // Check if theme from localStorage was loaded
    expect(screen.getByTestId('theme-name')).toHaveTextContent('warm');
    expect(screen.getByTestId('primary-color')).toHaveTextContent(themes.warm.colors.primary[500]);
  });
  
  it('sets CSS variables on the document root when theme changes', async () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );
    
    // Change to dark theme
    fireEvent.change(screen.getByTestId('theme-select'), { target: { value: 'dark' } });
    
    // Check if CSS variables were set
    await waitFor(() => {
      const root = document.documentElement;
      expect(root.style.getPropertyValue('--color-primary-500')).toBe(themes.dark.colors.primary[500]);
      expect(root.style.getPropertyValue('--shadow-card')).toBe(themes.dark.shadows.card);
    });
  });
}); 