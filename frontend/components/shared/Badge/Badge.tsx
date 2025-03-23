import React from 'react';

export type BadgeVariant = 'primary' | 'success' | 'warning' | 'accent';

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({ 
  label, 
  variant = 'primary',
  className = '' 
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-primary-100 text-primary-800';
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'accent':
        return 'bg-accent-100 text-accent-800';
      default:
        return 'bg-primary-100 text-primary-800';
    }
  };

  const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
  const variantClasses = getVariantClasses();
  
  return (
    <span className={`${baseClasses} ${variantClasses} ${className}`}>
      {label}
    </span>
  );
};

export default Badge; 