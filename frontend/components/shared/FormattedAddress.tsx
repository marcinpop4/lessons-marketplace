import React from 'react';
import { Address } from '@frontend/types/lesson';
import './FormattedAddress.css';

interface FormattedAddressProps {
  addressObject: Address;
  className?: string;
}

export const FormattedAddress: React.FC<FormattedAddressProps> = ({
  addressObject,
  className
}) => {
  const formatAddress = () => {
    const { street, city, state, postalCode } = addressObject;

    return [
      street,
      [city, state, postalCode].filter(Boolean).join(', ')
    ].filter(Boolean).join('\n');
  };

  return (
    <span className={className ? `formatted-address ${className}` : 'formatted-address'}>
      {formatAddress()}
    </span>
  );
}; 