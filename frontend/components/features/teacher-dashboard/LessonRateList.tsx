import React from 'react';
import { formatDisplayLabel } from '@shared/models/LessonType';
// import './LessonRateList.css'; // Consider removing if Card and Button handle styling
import { TeacherLessonHourlyRate } from '@shared/models/TeacherLessonHourlyRate.js';
import Card from '@frontend/components/shared/Card/Card'; // <-- IMPORT STANDARD CARD
import Button from '@frontend/components/shared/Button/Button'; // <-- IMPORT STANDARD BUTTON


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
      // Keep this simple text or enhance with a standard Alert component later if desired
      <div className="text-center py-4">
        <p className="text-gray-600 dark:text-gray-400">No lesson rates have been set up yet.</p>
        <p className="text-gray-500 dark:text-gray-300 text-sm">Add your first lesson rate to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6"> {/* Increased spacing between cards */}
      {rates.map(rate => {
        // Use the isActive method from the model instance
        const isActive = rate.isActive();
        return (
          <Card
            key={rate.id}
            title={formatDisplayLabel(rate.type)}
            variant="secondary"
          // Removed className={`rate-item-${isActive ? 'active' : 'inactive'}`} as it's not standard
          >
            {/* Body Content - Styled as per user example */}
            <div className="space-y-1 mb-4"> {/* Container for attributes list */}
              {/* Hourly Rate */}
              <p className="text-sm text-gray-700 dark:text-gray-300 card-attribute">
                <span className="font-semibold mr-1">Hourly Rate:</span>
                {formatAmount(rate)}
              </p>

              {/* Status */}
              <p className="text-sm text-gray-700 dark:text-gray-300 card-attribute">
                <span className="font-semibold mr-1">Status:</span>
                <span className={`${isActive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {isActive ? 'Active' : 'Inactive'}
                </span>
              </p>

              {/* Status Changed */}
              {!isActive && rate.currentStatus?.createdAt && (
                <p className="text-sm text-gray-700 dark:text-gray-300 card-attribute">
                  <span className="font-semibold mr-1">Status Changed:</span>
                  {formatDate(rate.currentStatus.createdAt)}
                </p>
              )}
            </div>

            {/* Actions Footer - Removed border and adjusted spacing */}
            <div className="flex justify-end space-x-2">
              <Button
                onClick={() => onEdit(rate)}
                variant="primary"
                size="sm"
                title="Edit rate"
              >
                Edit
              </Button>
              <Button
                onClick={() => onToggleActive(rate)}
                variant="secondary"
                size="sm"
                title={isActive ? 'Deactivate rate' : 'Activate rate'}
              >
                {isActive ? 'Deactivate' : 'Activate'}
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default LessonRateList; 