import React from 'react';

interface HeaderElementsBackgroundProps {
  className?: string;
}

const HeaderElementsBackground: React.FC<HeaderElementsBackgroundProps> = ({
  className = ''
}) => {
  return (
    <div className={`p-6 border border-gray-200 border-dashed rounded-lg ${className}`}>
      <div className="mb-2 text-sm text-secondary">Headers against main content background:</div>
      <div className="space-y-4">
        <h1>H1: Main Page Title</h1>
        <h2>H2: Section Heading</h2>
        <h3>H3: Subsection Heading</h3>
        <h4>H4: Group Heading</h4>
        <h5>H5: Minor Heading</h5>
        <h6>H6: Detail Heading</h6>

        <div className="space-y-2 pt-4 border-t border-gray-200">
          <div className="text-sm text-secondary mb-2">Muted heading variants:</div>
          <h4 className="muted">Muted group heading</h4>
          <h5 className="muted">Muted minor heading</h5>
          <h6 className="muted">Muted detail heading</h6>
        </div>
      </div>
    </div>
  );
};

export default HeaderElementsBackground; 