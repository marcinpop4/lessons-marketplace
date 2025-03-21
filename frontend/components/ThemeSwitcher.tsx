import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface ThemeSwitcherProps {
  className?: string;
}

const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ className = '' }) => {
  const { themeName, setTheme, availableThemes } = useTheme();

  return (
    <div className={`theme-switcher ${className}`}>
      <select
        value={themeName}
        onChange={(e) => setTheme(e.target.value)}
        className="select text-sm"
        style={{
          backgroundColor: 'var(--color-gray-50)',
          color: 'var(--color-gray-800)',
          borderColor: 'var(--color-gray-200)',
          borderRadius: 'var(--radius-md, 0.375rem)',
        }}
      >
        {availableThemes.map((theme) => (
          <option key={theme} value={theme}>
            {theme.charAt(0).toUpperCase() + theme.slice(1)} Theme
          </option>
        ))}
      </select>
    </div>
  );
};

export default ThemeSwitcher; 