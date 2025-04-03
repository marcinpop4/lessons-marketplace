import React from 'react';
import './FormattedDateTime.css';

interface FormattedDateTimeProps {
  date: Date;
}

const FormattedDateTime: React.FC<FormattedDateTimeProps> = ({ date }) => {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('FormattedDateTime: Invalid date provided');
  }

  const formatDateTime = () => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    }).format(date);
  };

  return (
    <span className="formatted-datetime">
      {formatDateTime()}
    </span>
  );
};

export { FormattedDateTime };
export default FormattedDateTime; 