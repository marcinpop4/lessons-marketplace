import React, { useState, useEffect } from 'react';
import { LessonType, formatDisplayLabel } from '@shared/models/LessonType';
import { TeacherLessonHourlyRate } from '@shared/models/TeacherLessonHourlyRate.js';
import Card from '@frontend/components/shared/Card/Card';
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
    <div className="max-w-md">
      <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-3">Add New Rate</h3>
      <Card variant="secondary" className="p-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            <div>
              <label htmlFor="lessonType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Lesson Type</label>
              <select
                id="lessonType"
                value={lessonType}
                onChange={(e) => setLessonType(e.target.value as LessonType)}
                className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                disabled={!!rate}
              >
                {lessonTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="lessonRate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rate ($/hour)</label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <div className="px-3 inline-flex items-center border border-r-0 border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800 rounded-l-md">
                  <span className="text-gray-500 dark:text-gray-400 sm:text-sm">$</span>
                </div>
                <input
                  id="lessonRate"
                  type="text"
                  placeholder="50.00"
                  value={rateInDollars}
                  onChange={handleRateChange}
                  className={`flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md sm:text-sm border ${rateError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`} />
              </div>
              {rateError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{rateError}</p>}
            </div>
          </div>

          <div className="pt-2">
            {rate ? (
              <div className="flex justify-end space-x-3">
                <button type="button" onClick={onCancel} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Update Rate
                </button>
              </div>
            ) : (
              <button type="submit" className="btn btn-primary w-full">
                Add Rate
              </button>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
};

export default LessonRateForm; 