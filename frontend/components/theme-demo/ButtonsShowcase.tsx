import React from 'react';
import { Button } from '../shared/Button';

interface ButtonsShowcaseProps {
  className?: string;
}

const ButtonsShowcase: React.FC<ButtonsShowcaseProps> = ({
  className = ''
}) => {
  return (
    <div className={`card card-primary ${className}`}>
      <div className="card-header">
        <h3 className="text-xl font-semibold">Buttons</h3>
      </div>
      <div className="space-y-6">
        <div>
          <h4 className="text-lg font-medium mb-3">Primary Buttons</h4>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary">Primary</Button>
            <Button variant="primary" size="sm">Small</Button>
            <Button variant="primary" size="lg">Large</Button>
            <Button variant="primary" disabled>Disabled</Button>
          </div>
        </div>
        
        <div>
          <h4 className="text-lg font-medium mb-3">Secondary Buttons</h4>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary">Secondary</Button>
            <Button variant="secondary" size="sm">Small</Button>
            <Button variant="secondary" size="lg">Large</Button>
            <Button variant="secondary" disabled>Disabled</Button>
          </div>
        </div>
        
        <div>
          <h4 className="text-lg font-medium mb-3">Accent Buttons</h4>
          <div className="flex flex-wrap gap-2">
            <Button variant="accent">Accent</Button>
            <Button variant="accent" size="sm">Small</Button>
            <Button variant="accent" size="lg">Large</Button>
            <Button variant="accent" disabled>Disabled</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ButtonsShowcase; 