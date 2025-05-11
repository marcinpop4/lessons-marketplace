import React from 'react';
import { Link } from 'react-router-dom';

export type CardVariant = 'primary' | 'secondary' | 'accent';

export interface CardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  variant?: CardVariant;
  className?: string;
  headingLevel?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  titleLinkTo?: string;
}

const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  children,
  variant = 'primary',
  className = '',
  headingLevel = 'h3',
  titleLinkTo,
}) => {
  const baseClasses = `card card-${variant} ${className}`;
  const HeadingTag = headingLevel;

  // Ensure good contrast in both light and dark modes for all heading levels
  const headingClasses = 'text-gray-900 dark:text-gray-100 font-semibold';
  const linkClasses = 'text-blue-600 hover:underline dark:text-blue-400';
  const subtitleClasses = 'text-sm text-gray-700 dark:text-gray-300';

  return (
    <div className={baseClasses}>
      {(title || subtitle) && (
        <div className="card-header">
          {title && (
            <HeadingTag className={`${headingClasses} ${headingLevel === 'h1' ? 'text-2xl' : headingLevel === 'h2' ? 'text-xl' : 'text-lg'}`}>
              {titleLinkTo ? (
                <Link to={titleLinkTo} className={linkClasses}>
                  {title}
                </Link>
              ) : (
                title
              )}
            </HeadingTag>
          )}
          {subtitle && <p className={subtitleClasses}>{subtitle}</p>}
        </div>
      )}
      <div className="space-y-2">
        {children}
      </div>
    </div>
  );
};

export default Card; 