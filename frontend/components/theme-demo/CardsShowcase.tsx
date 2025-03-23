import React from 'react';
import { Card } from '../shared/Card';

interface CardsShowcaseProps {
  className?: string;
}

const CardsShowcase: React.FC<CardsShowcaseProps> = ({
  className = ''
}) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${className}`}>
      <Card variant="primary" title="Primary Card">
        <p>
          This is a primary-themed card with customizable content.
        </p>
        <p className="text-sm mt-2">
          It's styled with the primary color theme.
        </p>
      </Card>
      
      <Card variant="secondary" title="Secondary Card">
        <p>
          This is a secondary-themed card with customizable content.
        </p>
        <p className="text-sm mt-2">
          It's styled with the secondary color theme.
        </p>
      </Card>
      
      <Card variant="accent" title="Accent Card">
        <p>
          This is an accent-themed card with customizable content.
        </p>
        <p className="text-sm mt-2">
          It's styled with the accent color theme.
        </p>
      </Card>
    </div>
  );
};

export default CardsShowcase; 