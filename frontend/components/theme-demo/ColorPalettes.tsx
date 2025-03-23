import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { ColorSwatch } from '../shared';

interface ColorPalettesProps {
  className?: string;
}

const ColorPalettes: React.FC<ColorPalettesProps> = ({
  className = ''
}) => {
  const { theme } = useTheme();
  
  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${className}`}>
      {/* Primary Colors */}
      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-primary">Primary Colors</h3>
        <div className="space-y-1">
          {Object.entries(theme.colors.primary).map(([shade, color]) => (
            <ColorSwatch 
              key={`primary-${shade}`}
              color={color}
              shade={shade}
              variant="primary"
            />
          ))}
        </div>
      </div>

      {/* Secondary Colors */}
      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-secondary">Secondary Colors</h3>
        <div className="space-y-1">
          {Object.entries(theme.colors.secondary).map(([shade, color]) => (
            <ColorSwatch 
              key={`secondary-${shade}`}
              color={color}
              shade={shade}
              variant="secondary"
            />
          ))}
        </div>
      </div>

      {/* Accent Colors */}
      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-accent">Accent Colors</h3>
        <div className="space-y-1">
          {Object.entries(theme.colors.accent).map(([shade, color]) => (
            <ColorSwatch 
              key={`accent-${shade}`}
              color={color}
              shade={shade}
              variant="accent"
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ColorPalettes; 