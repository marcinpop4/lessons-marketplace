import React from 'react';
import { LessonQuote } from '@shared/models/LessonQuote';
import { FormattedDateTime } from '@frontend/components/shared';
import { FormattedAddress } from '@frontend/components/shared';
import './LessonDetails.css';

interface LessonDetailsProps {
  quote: LessonQuote;
}

const LessonDetails: React.FC<LessonDetailsProps> = ({ quote }) => {
  return (
    <div className="card card-accent lesson-details">
      <div className="card-header lesson-details-header">
        <h3>Lesson Details</h3>
      </div>
      <div className="lesson-details-grid">
        <div className="lesson-detail-item lesson-detail-teacher">
          <p className="lesson-detail-label">Teacher</p>
          <p className="lesson-detail-value">{quote.teacher.firstName} {quote.teacher.lastName}</p>
        </div>

        <div className="lesson-detail-item lesson-detail-cost">
          <p className="lesson-detail-label">Cost</p>
          <p className="lesson-detail-value">{quote.getFormattedCost()}</p>
        </div>

        <div className="lesson-detail-item lesson-detail-datetime">
          <p className="lesson-detail-label">Date & Time</p>
          <p className="lesson-detail-value">
            <FormattedDateTime date={quote.lessonRequest.startTime} />
          </p>
        </div>

        <div className="lesson-detail-item lesson-detail-duration">
          <p className="lesson-detail-label">Duration</p>
          <p className="lesson-detail-value">{quote.lessonRequest.durationMinutes} minutes</p>
        </div>

        <div className="lesson-detail-item lesson-detail-location">
          <p className="lesson-detail-label">Location</p>
          <p className="lesson-detail-value">
            <FormattedAddress address={quote.lessonRequest.address} />
          </p>
        </div>

        <div className="lesson-detail-item lesson-detail-expiry">
          <p className="lesson-detail-label">Quote Expires</p>
          <p className="lesson-detail-value">
            <FormattedDateTime date={quote.expiresAt} />
          </p>
        </div>
      </div>
    </div>
  );
};

export default LessonDetails; 