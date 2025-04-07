import React from 'react';
import { Address } from '@shared/models/Address';
import { Card } from '@frontend/components/shared/Card';
import './AddressForm.css';

interface AddressFormProps {
  address: Address;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const AddressForm: React.FC<AddressFormProps> = ({ address, onChange }) => {
  return (
    <Card
      title="Lesson Location"
      variant="accent"
      className="lesson-request-card"
    >
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="addressObj.street">Street Address</label>
          <input
            type="text"
            id="addressObj.street"
            name="addressObj.street"
            value={address.street}
            onChange={onChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="addressObj.city">City</label>
          <input
            type="text"
            id="addressObj.city"
            name="addressObj.city"
            value={address.city}
            onChange={onChange}
            required
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="addressObj.state">State</label>
          <input
            type="text"
            id="addressObj.state"
            name="addressObj.state"
            value={address.state}
            onChange={onChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="addressObj.postalCode">Postal Code</label>
          <input
            type="text"
            id="addressObj.postalCode"
            name="addressObj.postalCode"
            value={address.postalCode}
            onChange={onChange}
            required
          />
        </div>
      </div>
    </Card>
  );
};

export default AddressForm; 