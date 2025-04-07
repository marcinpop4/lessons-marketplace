import React, { useState, useEffect } from 'react';
import { LessonRequest } from '@shared/models/LessonRequest';
import { getLessonRequestById } from '@frontend/api/lessonRequestApi';
import { FormattedDateTime, FormattedAddress } from '@frontend/components/shared';
import { formatDisplayLabel } from '@shared/models/LessonType';
import { Card } from '@frontend/components/shared/Card';
import './LessonRequestCard.css';

interface LessonRequestCardProps {
  lessonRequestId: string;
}

const LessonRequestCard: React.FC<LessonRequestCardProps> = ({ lessonRequestId }) => {
  const [lessonRequest, setLessonRequest] = useState<LessonRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLessonRequest = async () => {
      try {
        const request = await getLessonRequestById(lessonRequestId);
        setLessonRequest(request);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch lesson request');
      } finally {
        setLoading(false);
      }
    };

    fetchLessonRequest();
  }, [lessonRequestId]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!lessonRequest) {
    return <div>Lesson request not found</div>;
  }

  return (
    <Card
      title="Lesson Request Details"
      variant="primary"
      className="lesson-request-card"
    >
      <div className="lesson-request-details">
        <div className="lesson-request-detail">
          <span className="detail-label">Lesson Type:</span>
          <span className="detail-value">{formatDisplayLabel(lessonRequest.type)}</span>
        </div>

        <div className="lesson-request-detail">
          <span className="detail-label">Duration:</span>
          <span className="detail-value">{lessonRequest.durationMinutes} minutes</span>
        </div>

        <div className="lesson-request-detail">
          <span className="detail-label">Date & Time:</span>
          <span className="detail-value">
            <FormattedDateTime date={lessonRequest.startTime} />
          </span>
        </div>

        <div className="lesson-request-detail">
          <span className="detail-label">Location:</span>
          <span className="detail-value">
            <FormattedAddress address={lessonRequest.address} />
          </span>
        </div>
      </div>
    </Card>
  );
};

export default LessonRequestCard; 