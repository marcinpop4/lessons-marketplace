import React from 'react';
import { formatDisplayLabel } from '@shared/models/LessonType';
import './LessonRateList.css';

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
  rates: LessonRate[];
  onToggleActive: (rate: LessonRate) => void;
  onEdit: (rate: LessonRate) => void;
}

const LessonRateList: React.FC<Props> = ({ rates = [], onToggleActive, onEdit }) => {
  // Format the amount in dollars
  const formatAmount = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  // Format date to a readable format
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (!rates || rates.length === 0) {
    return (
      <div className="lesson-rate-list">
        <h3 className="text-lg font-medium mb-4">Your Lesson Rates</h3>
        <div className="empty-state">
          <p>No lesson rates have been set up yet.</p>
          <p>Add your first lesson rate to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="lesson-rate-list">
      <h3 className="text-lg font-medium mb-4">Your Lesson Rates</h3>
      <div className="rates-grid">
        {rates.map(rate => (
          <div key={rate.id} className={`rate-card ${rate.isActive ? 'active' : 'inactive'}`}>
            <div className="rate-header">
              <h4>{formatDisplayLabel(rate.type)}</h4>
              <div className="rate-actions">
                <button
                  onClick={() => onEdit(rate)}
                  className="edit-button"
                  title="Edit rate"
                >
                  Edit
                </button>
                <button
                  onClick={() => onToggleActive(rate)}
                  className={`toggle-button ${rate.isActive ? 'deactivate' : 'activate'}`}
                  title={rate.isActive ? 'Deactivate rate' : 'Activate rate'}
                >
                  {rate.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
            <div className="rate-details">
              <p className="rate-amount">{formatAmount(rate.rateInCents)}/hour</p>
              <p className="rate-status">
                Status: <span className={rate.isActive ? 'active' : 'inactive'}>
                  {rate.isActive ? 'Active' : 'Inactive'}
                </span>
              </p>
              {rate.deactivatedAt && (
                <p className="deactivation-date">
                  Deactivated: {formatDate(rate.deactivatedAt)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LessonRateList; 