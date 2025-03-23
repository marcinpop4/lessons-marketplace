import React from 'react';
import { Badge } from '../shared/Badge';

interface BadgesShowcaseProps {
  className?: string;
}

const BadgesShowcase: React.FC<BadgesShowcaseProps> = ({
  className = ''
}) => {
  return (
    <div className={`flex flex-wrap gap-4 ${className}`}>
      <Badge variant="primary" label="Primary" />
      <Badge variant="success" label="Success" />
      <Badge variant="warning" label="Warning" />
      <Badge variant="accent" label="Accent" />

      <Badge variant="primary" label="New" />
      <Badge variant="success" label="Completed" />
      <Badge variant="warning" label="Pending" />
      <Badge variant="accent" label="Featured" />
    </div>
  );
};

export default BadgesShowcase; 