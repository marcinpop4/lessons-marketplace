import React from 'react';

export type CardVariant = 'primary' | 'secondary' | 'accent';

export interface CardProps {
  title?: string;
  children: React.ReactNode;
  variant?: CardVariant;
  className?: string;
}

const Card: React.FC<CardProps> = ({
  title,
  children,
  variant = 'primary',
  className = '',
}) => {
  const baseClasses = `card card-${variant} ${className}`;
  
  return (
    <div className={baseClasses}>
      {title && (
        <div className="card-header">
          <h3 className="text-xl font-semibold">{title}</h3>
        </div>
      )}
      <div className="space-y-2">
        {children}
      </div>
    </div>
  );
};

export default Card; 