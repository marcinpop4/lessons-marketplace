import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface ThemedCardProps {
  title?: string;
  children: React.ReactNode;
  variant?: 'primary' | 'accent' | 'secondary';
  className?: string;
}

/**
 * A card component that demonstrates theme usage
 */
const ThemedCard: React.FC<ThemedCardProps> = ({
  title,
  children,
  variant = 'primary',
  className = '',
}) => {
  const { themeName } = useTheme();
  
  // Determine CSS classes based on variant
  const getBorderColor = () => {
    switch (variant) {
      case 'primary': return 'border-primary-200';
      case 'accent': return 'border-accent-200';
      case 'secondary': return 'border-gray-200';
      default: return 'border-primary-200';
    }
  };
  
  const getTextColor = () => {
    switch (variant) {
      case 'primary': return 'text-primary-700';
      case 'accent': return 'text-accent-700';
      case 'secondary': return 'text-gray-700';
      default: return 'text-primary-700';
    }
  };
  
  const getIconColor = () => {
    switch (variant) {
      case 'primary': return 'text-primary-500';
      case 'accent': return 'text-accent-500';
      case 'secondary': return 'text-gray-500';
      default: return 'text-primary-500';
    }
  };
  
  // Determine background color based on theme and variant
  const getBackgroundColor = () => {
    if (themeName === 'dark') {
      switch (variant) {
        case 'primary': return 'var(--color-primary-900)';
        case 'accent': return 'var(--color-accent-900)';
        case 'secondary': return 'var(--color-gray-800)';
        default: return 'var(--color-gray-800)';
      }
    }
    return 'white';
  };
  
  return (
    <div 
      className={`card ${getBorderColor()} ${className} rounded-xl transition-all duration-300 hover:scale-[1.01]`}
      style={{ 
        boxShadow: 'var(--shadow-card)',
        borderRadius: 'var(--radius-xl, 0.75rem)',
        backgroundColor: getBackgroundColor(),
        transition: 'background-color 0.3s ease, box-shadow 0.3s ease, transform 0.3s ease',
        borderColor: themeName === 'dark' ? 'var(--color-gray-700)' : 'var(--color-gray-200)',
      }}
    >
      {title && (
        <h3 className={`card-title ${getTextColor()} mb-3 flex items-center`}>
          <span className={`mr-2 ${getIconColor()}`}>
            {variant === 'primary' && '🌊'}
            {variant === 'accent' && '🔥'}
            {variant === 'secondary' && '✨'}
          </span>
          {title}
        </h3>
      )}
      <div className="space-y-2">
        {children}
      </div>
      <div className="absolute bottom-0 right-0 h-8 w-8 opacity-10">
        <div 
          className="h-16 w-16 rounded-full transform translate-x-1/2 translate-y-1/2"
          style={{
            backgroundColor: `var(--color-${variant === 'secondary' ? 'gray' : variant}-200)`
          }}
        />
      </div>
      <div className="text-xs text-gray-400 mt-4 pt-2 border-t border-gray-100">
        Current theme: {themeName}
      </div>
    </div>
  );
};

export default ThemedCard; 