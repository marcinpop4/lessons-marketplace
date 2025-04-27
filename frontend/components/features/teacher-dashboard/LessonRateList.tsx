import React from 'react';
import { formatDisplayLabel } from '@shared/models/LessonType';
import './LessonRateList.css';

// Import the shared model instead of the local interface
import { TeacherLessonHourlyRate } from '@shared/models/TeacherLessonHourlyRate.js';

// Remove the local LessonRate interface
/*
interface LessonRate {
  id: string;
  type: string;
  rateInCents: number;
  isActive: boolean;
  deactivatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
*/

interface Props {
  // Use the shared model type
  rates: TeacherLessonHourlyRate[];
  onToggleActive: (rate: TeacherLessonHourlyRate) => void;
  onEdit: (rate: TeacherLessonHourlyRate) => void;
}

// Use the shared model type
const LessonRateList: React.FC<Props> = ({ rates = [], onToggleActive, onEdit }) => {
  // Format the amount in dollars - use the getter from the model
  const formatAmount = (rateInstance: TeacherLessonHourlyRate) => {
    return rateInstance.getFormattedRate(); // Use the model's method
  };

  // Format date to a readable format
  const formatDate = (date: Date | string | undefined) => { // Accept Date object too
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString(); // Ensure it's a Date object
  };

  if (!rates || rates.length === 0) {
    return (
      <div className="lesson-rate-list">
        <div className="empty-state">
          <p>No lesson rates have been set up yet.</p>
          <p>Add your first lesson rate to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="lesson-rate-list">
      <div className="rates-grid">
        {rates.map(rate => {
          // Use the isActive method from the model instance
          const isActive = rate.isActive();
          return (
            // Use isActive variable for class
            <div key={rate.id} className={`rate-card ${isActive ? 'active' : 'inactive'}`}>
              <div className="rate-header">
                <h4>{formatDisplayLabel(rate.type)}</h4>
                <div className="rate-actions">
                  <button
                    onClick={() => onEdit(rate)}
                    className="btn btn-primary btn-sm"
                    title="Edit rate"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onToggleActive(rate)}
                    className={`btn btn-secondary btn-sm`}
                    // Use isActive variable for title and text
                    title={isActive ? 'Deactivate rate' : 'Activate rate'}
                  >
                    {isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
              <div className="rate-details">
                {/* Pass the rate instance to formatAmount */}
                <p className="rate-amount">{formatAmount(rate)}/hour</p>
                <p className="rate-status">
                  {/* Use isActive variable */}
                  Status: <span className={isActive ? 'active' : 'inactive'}>
                    {isActive ? 'Active' : 'Inactive'}
                  </span>
                </p>
                {/* Access currentStatus.createdAt for potential deactivation date display? */}
                {/* The old `deactivatedAt` property doesn't exist on the shared model */}
                {/* We might need to check currentStatus.status === INACTIVE and display currentStatus.createdAt */}
                {!isActive && rate.currentStatus?.createdAt && (
                  <p className="deactivation-date">
                    {/* Display status change date if inactive */}
                    Status Changed: {formatDate(rate.currentStatus.createdAt)}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
};

export default LessonRateList; 