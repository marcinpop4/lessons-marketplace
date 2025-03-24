import React, { useState, useEffect } from 'react';
import { LessonType } from '@shared/models/LessonType';
import './LessonRateForm.css';

// Valid lesson types based on the API requirements
const VALID_LESSON_TYPES = ['VOICE', 'GUITAR', 'BASS', 'DRUMS'];

interface LessonRate {
  id: string;
  type: string;
  rateInCents: number;
  isActive: boolean;
  deactivatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  rate: LessonRate | null;
  onSubmit: (rate: Partial<LessonRate>) => void;
  onCancel: () => void;
}

const LessonRateForm: React.FC<Props> = ({ rate, onSubmit, onCancel }) => {
  const [type, setType] = useState('');
  const [rateInCents, setRateInCents] = useState('');
  const [amountInDollars, setAmountInDollars] = useState('');
  const [errors, setErrors] = useState<{type?: string, rate?: string}>({});
  
  // Reset form when rate changes (for editing)
  useEffect(() => {
    if (rate) {
      setType(rate.type);
      // Convert cents to dollars for display
      const dollars = (rate.rateInCents / 100).toFixed(2);
      setAmountInDollars(dollars);
      setRateInCents(rate.rateInCents.toString());
    } else {
      setType('');
      setAmountInDollars('');
      setRateInCents('');
    }
    setErrors({});
  }, [rate]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAmountInDollars(value);
    
    // Convert dollars to cents
    if (value) {
      const cents = Math.round(parseFloat(value) * 100);
      setRateInCents(cents.toString());
    } else {
      setRateInCents('');
    }
  };

  const validateForm = () => {
    const newErrors: {type?: string, rate?: string} = {};
    
    if (!type.trim()) {
      newErrors.type = 'Lesson type is required';
    } else {
      // We're using enum keys directly, so check if it's one of those
      const validTypes = Object.keys(LessonType);
      if (!validTypes.includes(type)) {
        newErrors.type = `Type must be a valid lesson type`;
      }
    }
    
    if (!amountInDollars) {
      newErrors.rate = 'Rate is required';
    } else if (isNaN(parseFloat(amountInDollars)) || parseFloat(amountInDollars) <= 0) {
      newErrors.rate = 'Rate must be a positive number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    onSubmit({
      type,
      rateInCents: parseInt(rateInCents, 10)
    });
    
    // Reset form if not editing
    if (!rate) {
      setType('');
      setAmountInDollars('');
      setRateInCents('');
    }
  };

  // Helper to format lesson type name for display
  const formatLessonTypeName = (key: string): string => {
    return key.charAt(0) + key.slice(1).toLowerCase();
  };

  return (
    <div className="lesson-rate-form">
      <h3 className="text-lg font-medium mb-4">
        {rate ? 'Edit Lesson Rate' : 'Add New Rate'}
      </h3>
      
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="lessonType">Lesson Type</label>
            <select
              id="lessonType"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className={errors.type ? 'select-error' : ''}
            >
              <option value="">Select a lesson type</option>
              {Object.keys(LessonType).map(key => (
                <option key={key} value={key}>
                  {formatLessonTypeName(key)}
                </option>
              ))}
            </select>
            {errors.type && <div className="error-message">{errors.type}</div>}
          </div>
          
          <div className="form-group">
            <label htmlFor="lessonRate">Rate ($/hour)</label>
            <div className="rate-input-wrapper">
              <span className="currency-symbol">$</span>
              <input
                id="lessonRate"
                type="number"
                step="0.01"
                min="0"
                value={amountInDollars}
                onChange={handleAmountChange}
                placeholder="0.00"
                className={errors.rate ? 'input-error' : ''}
              />
            </div>
            {errors.rate && <div className="error-message">{errors.rate}</div>}
          </div>
        </div>
        
        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            {rate ? 'Update Rate' : 'Add Rate'}
          </button>
          {rate && (
            <button 
              type="button" 
              onClick={onCancel} 
              className="btn btn-secondary ml-2"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default LessonRateForm; 