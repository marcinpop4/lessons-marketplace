import React from 'react';
import { LessonQuote, LessonRequest } from '@frontend/types/lesson';
import { formatCurrency } from '@frontend/utils/currencyFormatter';
import { FormattedDateTime, FormattedAddress } from '@frontend/components/shared';
import { formatDisplayLabel } from '@shared/models/LessonType';
import './LessonDetails.css';

interface LessonDetailsProps {
  teacher: {
    firstName: string;
    lastName: string;
  };
  lessonRequest: LessonRequest;
  quote: LessonQuote;
}

const LessonDetails: React.FC<LessonDetailsProps> = ({
  teacher,
  lessonRequest,
  quote
}) => {
  const calculateHourlyRate = (costInCents: number, durationMinutes: number): number => {
    return Math.round(costInCents * 60 / durationMinutes);
  };

  const formatHourlyRate = (quote: LessonQuote): string => {
    const hourlyRate = calculateHourlyRate(quote.costInCents, lessonRequest.durationMinutes);
    return `${formatCurrency(hourlyRate)}/hour`;
  };

  return (
    <div className="card card-primary">
      <div className="card-header">
        <h3>Lesson Details</h3>
      </div>
      <div className="card-body">
        <div className="lesson-details-grid">
          <div className="lesson-detail-group">
            <div className="lesson-detail-item">
              <p className="lesson-detail-label">Teacher</p>
              <p className="lesson-detail-value">{teacher.firstName} {teacher.lastName}</p>
            </div>

            <div className="lesson-detail-item">
              <p className="lesson-detail-label">Lesson Type</p>
              <p className="lesson-detail-value">{formatDisplayLabel(lessonRequest.type)}</p>
            </div>

            <div className="lesson-detail-item">
              <p className="lesson-detail-label">Date & Time</p>
              <p className="lesson-detail-value">
                <FormattedDateTime timestamp={lessonRequest.startTime} />
              </p>
            </div>
          </div>

          <div className="lesson-detail-group">
            <div className="lesson-detail-item">
              <p className="lesson-detail-label">Duration</p>
              <p className="lesson-detail-value">{lessonRequest.durationMinutes} minutes</p>
            </div>

            <div className="lesson-detail-item">
              <p className="lesson-detail-label">Location</p>
              <p className="lesson-detail-value">
                <FormattedAddress addressObject={lessonRequest.address}
                />
              </p>
            </div>

            <div className="lesson-detail-item">
              <p className="lesson-detail-label">Price</p>
              <div className="price-details">
                <p className="lesson-detail-value">Rate: {formatHourlyRate(quote)}</p>
                <p className="lesson-detail-value">Lesson Price: {formatCurrency(quote.costInCents)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LessonDetails; 