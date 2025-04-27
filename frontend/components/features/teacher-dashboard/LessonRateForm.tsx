import React, { useState, useEffect } from 'react';
import { LessonType, formatDisplayLabel } from '@shared/models/LessonType';
import { TeacherLessonHourlyRate } from '@shared/models/TeacherLessonHourlyRate.js';
import './LessonRateForm.css';

interface LessonRateFormProps {
  rate: TeacherLessonHourlyRate | null;
  onSubmit: (rate: Partial<TeacherLessonHourlyRate>) => void;
  onCancel: () => void;
}

const LessonRateForm: React.FC<LessonRateFormProps> = ({ rate, onSubmit, onCancel }) => {
  const [lessonType, setLessonType] = useState<LessonType>(rate?.type || LessonType.GUITAR);
  const [rateInDollars, setRateInDollars] = useState<string>(rate ? (rate.rateInCents / 100).toFixed(2) : '');
  const [rateError, setRateError] = useState<string | null>(null);

  useEffect(() => {
    setLessonType(rate?.type || LessonType.GUITAR);
    setRateInDollars(rate ? (rate.rateInCents / 100).toFixed(2) : '');
    setRateError(null);
  }, [rate]);

  const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d{0,2}$/.test(value) || value === '') {
      setRateInDollars(value);
      setRateError(null);
    } else {
      setRateError('Please enter a valid amount (e.g., 45.50)');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rateValue = parseFloat(rateInDollars);

    if (isNaN(rateValue) || rateValue <= 0) {
      setRateError('Please enter a valid positive rate.');
      return;
    }
    setRateError(null);

    const rateInCents = Math.round(rateValue * 100);

    onSubmit({ type: lessonType, rateInCents });
  };

  // Generate options from enum keys
  const lessonTypeOptions = Object.keys(LessonType).map((key) => ({
    value: LessonType[key as keyof typeof LessonType],
    label: formatDisplayLabel(key) // Use existing formatting function
  }));

  return (
    <div className="lesson-rate-form">
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="lessonType" className="block text-sm font-medium text-gray-700 mb-1">Lesson Type</label>
            <select
              id="lessonType"
              value={lessonType}
              onChange={(e) => setLessonType(e.target.value as LessonType)}
              className={`select select-bordered w-full ${rateError ? 'input-error' : ''}`}
              disabled={!!rate}
            >
              {lessonTypeOptions.map((option: { value: LessonType; label: string }) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="lessonRate">Rate ($/hour)</label>
            <div className="rate-input-wrapper">
              <span className="currency-symbol">$</span>
              <input
                id="lessonRate"
                type="text"
                placeholder="e.g., 50.00"
                value={rateInDollars}
                onChange={handleRateChange}
                className={rateError ? 'input-error' : ''}
              />
            </div>
            {rateError && <div className="error-message">{rateError}</div>}
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