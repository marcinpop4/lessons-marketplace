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
  
  // Build the card classes based on variant
  const getCardClasses = () => {
    const baseClasses = `card card-${variant} ${className}`;
    return baseClasses;
  };
  
  return (
    <div className={getCardClasses()}>
      {title && (
        <div className="card-header">
          <h3 className="text-xl font-semibold">
            <span className="mr-2">
              {variant === 'primary' && '🌊'}
              {variant === 'accent' && '🔥'}
              {variant === 'secondary' && '✨'}
            </span>
            {title}
          </h3>
        </div>
      )}
      <div className="space-y-2">
        {children}
      </div>
      <div className="text-xs text-secondary mt-4 pt-2 border-t border-secondary-200">
        Current theme: {themeName}
      </div>
    </div>
  );
};

export default ThemedCard; 