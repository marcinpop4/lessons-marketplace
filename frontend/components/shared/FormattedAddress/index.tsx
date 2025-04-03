import React from 'react';
import { Address } from '@shared/models/Address';
import './FormattedAddress.css';

interface FormattedAddressProps {
  address: Address;
}

const FormattedAddress: React.FC<FormattedAddressProps> = ({ address }) => {
  if (!(address instanceof Address)) {
    throw new Error('FormattedAddress: Invalid address provided');
  }

  return (
    <span className="formatted-address">
      {address.toString()}
    </span>
  );
};

export { FormattedAddress };
export default FormattedAddress; 