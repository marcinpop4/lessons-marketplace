import React from 'react';
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

const LessonRateList: React.FC<Props> = ({ rates, onToggleActive, onEdit }) => {
  // Format the amount in dollars
  const formatAmount = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  // Format date to a readable format
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };
  
  // Format lesson type for display
  const formatLessonType = (type: string): string => {
    const typeName = type.charAt(0) + type.slice(1).toLowerCase();
    return typeName;
  };
  
  if (rates.length === 0) {
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
      
      <div className="overflow-x-auto">
        <table className="rates-table w-full">
          <thead>
            <tr>
              <th>Lesson Type</th>
              <th>Rate</th>
              <th>Status</th>
              <th>Last Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rates.map((rate) => (
              <tr key={rate.id} className={!rate.isActive ? 'inactive-rate' : ''}>
                <td>{formatLessonType(rate.type)}</td>
                <td>{formatAmount(rate.rateInCents)}/hr</td>
                <td>
                  <span className={`status-badge ${rate.isActive ? 'active' : 'inactive'}`}>
                    {rate.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>{formatDate(rate.updatedAt)}</td>
                <td className="actions">
                  <button
                    onClick={() => onEdit(rate)}
                    className="btn-edit"
                    aria-label="Edit lesson rate"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onToggleActive(rate)}
                    className={`btn-toggle ${rate.isActive ? 'deactivate' : 'activate'}`}
                    aria-label={rate.isActive ? 'Deactivate lesson rate' : 'Activate lesson rate'}
                  >
                    {rate.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LessonRateList; 