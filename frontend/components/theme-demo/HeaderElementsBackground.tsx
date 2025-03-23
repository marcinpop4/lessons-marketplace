import React from 'react';

interface HeaderElementsBackgroundProps {
  className?: string;
}

const HeaderElementsBackground: React.FC<HeaderElementsBackgroundProps> = ({ 
  className = '' 
}) => {
  return (
    <div className={`p-6 border border-gray-200 border-dashed rounded-lg ${className}`}>
      <div className="mb-2 text-sm text-gray-500">Headers against main content background:</div>
      <div className="space-y-4">
        <h1>H1: Main Page Title</h1>
        <h2>H2: Section Heading</h2>
        <h3>H3: Subsection Heading</h3>
        <h4>H4: Group Heading</h4>
        <h5>H5: Minor Heading</h5>
        <h6>H6: Detail Heading</h6>
        
        <div className="space-y-2 pt-4 border-t border-gray-200">
          <p className="text-primary">Primary text variation</p>
          <p className="text-secondary">Secondary text variation</p>
          <p className="text-accent">Accent text variation</p>
        </div>
      </div>
    </div>
  );
};

export default HeaderElementsBackground; 