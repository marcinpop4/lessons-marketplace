import React from 'react';
import './FormattedDateTime.css';

interface FormattedDateTimeProps {
  timestamp: string;
  className?: string;
}

export const FormattedDateTime: React.FC<FormattedDateTimeProps> = ({ 
  timestamp,
  className
}) => {
  const formatDateTime = () => {
    const dateObj = new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    }).format(dateObj);
  };

  return (
    <span className={`formatted-datetime ${className || ''}`}>
      {formatDateTime()}
    </span>
  );
}; 