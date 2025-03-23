import React from 'react';
import { Alert } from '../shared/Alert';

interface AlertsShowcaseProps {
  className?: string;
}

const AlertsShowcase: React.FC<AlertsShowcaseProps> = ({
  className = ''
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      <Alert
        type="success"
        title="Success Alert"
        message="This is a success message that can be used to confirm an action."
      />
      
      <Alert
        type="error"
        title="Error Alert"
        message="This is an error message that can be used to indicate a problem."
      />
      
      <Alert
        type="success"
        message="This is a success alert without a title."
      />
      
      <Alert
        type="error"
        message="This is an error alert without a title."
      />
      
      <Alert
        type="success"
        title="Closable Success Alert"
        message="This success alert includes a close button that can be clicked."
        onClose={() => alert('Close button clicked')}
      />
      
      <Alert
        type="error"
        title="Closable Error Alert"
        message="This error alert includes a close button that can be clicked."
        onClose={() => alert('Close button clicked')}
      />
    </div>
  );
};

export default AlertsShowcase; 