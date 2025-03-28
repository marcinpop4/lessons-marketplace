import React from 'react';
import { useTheme } from '../../../contexts/ThemeContext';

interface ColorSwatchProps {
  color: string;
  shade: string;
  variant: 'primary' | 'secondary' | 'accent' | 'gray';
  className?: string;
}

/**
 * ColorSwatch Component
 * 
 * Note: We use a minimal inline style for the background color because:
 * 1. Tailwind doesn't support dynamic color values directly
 * 2. The color is a prop that changes for each swatch
 * 3. Setting backgroundColor directly is the most performant approach 
 *    without creating many unused classes
 */
const ColorSwatch: React.FC<ColorSwatchProps> = ({ color, shade, variant, className = '' }) => {
  const { themeName } = useTheme();
  const isDark = themeName === 'dark';
  
  // Border classes based on theme and variant
  const borderClass = isDark 
    ? {
        primary: 'border-primary-600',
        secondary: 'border-secondary-600',
        accent: 'border-accent-600',
        gray: 'border-gray-600'
      }[variant]
    : {
        primary: 'border-primary-300',
        secondary: 'border-secondary-300',
        accent: 'border-accent-300',
        gray: 'border-gray-300'
      }[variant];
  
  // Shadow class based on theme
  const shadowClass = isDark ? 'shadow-md' : 'shadow-sm';
  
  return (
    <div className={`flex items-center h-10 ${className}`}>
      <div 
        className={`w-10 h-10 rounded-md mr-3 border ${borderClass} ${shadowClass}`}
        style={{ backgroundColor: color }}
        data-color={color}
        aria-label={`Color ${shade}: ${color}`}
      />
      <span 
        className="text-sm font-normal color-palette-item"
        data-shade={shade}
      >
        {shade}: {color}
      </span>
    </div>
  );
};

export default ColorSwatch; 