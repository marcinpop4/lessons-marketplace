import React from 'react';
import { ThemedCard } from '../shared';

interface HeaderElementsCardProps {
  className?: string;
}

const HeaderElementsCard: React.FC<HeaderElementsCardProps> = ({ 
  className = ''
}) => {
  return (
    <ThemedCard title="Header Elements in Card" variant="primary" className={className}>
      <div className="space-y-4">
        <div>
          <h1 className="mb-2">H1: Main Page Title</h1>
          <div className="text-xs mb-4">
            <code className="bg-secondary-100 px-1 py-0.5 rounded">text-3xl font-bold</code>
          </div>
          
          <h2 className="mb-2">H2: Section Heading</h2>
          <div className="text-xs mb-4">
            <code className="bg-secondary-100 px-1 py-0.5 rounded">text-2xl font-bold</code>
          </div>
          
          <h3 className="mb-2">H3: Subsection Heading</h3>
          <div className="text-xs mb-4">
            <code className="bg-secondary-100 px-1 py-0.5 rounded">text-xl font-semibold</code>
          </div>
          
          <h4 className="mb-2">H4: Group Heading</h4>
          <div className="text-xs mb-4">
            <code className="bg-secondary-100 px-1 py-0.5 rounded">text-lg font-medium</code>
          </div>
          
          <h5 className="mb-2">H5: Minor Heading</h5>
          <div className="text-xs mb-4">
            <code className="bg-secondary-100 px-1 py-0.5 rounded">text-base font-medium</code>
          </div>
          
          <h6 className="mb-2">H6: Detail Heading</h6>
          <div className="text-xs mb-4">
            <code className="bg-secondary-100 px-1 py-0.5 rounded">text-sm font-medium</code>
          </div>
        </div>
        
        <div className="border-t border-secondary-200 pt-4">
          <h4 className="text-sm font-medium mb-2">Theme-specific Variations</h4>
          <div className="space-y-2">
            <p className="text-primary">Primary text variation</p>
            <p className="text-secondary">Secondary text variation</p>
            <p className="text-accent">Accent text variation</p>
          </div>
        </div>
      </div>
    </ThemedCard>
  );
};

export default HeaderElementsCard; 