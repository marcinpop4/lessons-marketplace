import React, { useState, useEffect } from 'react';
import { LessonRequest } from '@frontend/types/lesson';
import { getLessonRequestById } from '@frontend/api/lessonRequestApi';
import { FormattedAddress, FormattedDateTime } from '@frontend/components/shared';
import './LessonRequestCard.css';

interface LessonRequestCardProps {
  lessonRequestId: string; // Make required since we need it
}

const LessonRequestCard: React.FC<LessonRequestCardProps> = ({ lessonRequestId }) => {
  const [lessonRequest, setLessonRequest] = useState<LessonRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLessonRequest = async () => {
      if (!lessonRequestId) {
        setError('Lesson request ID is required');
        setLoading(false);
        return;
      }

      try {
        const data = await getLessonRequestById(lessonRequestId);
        if (!data) {
          throw new Error('Lesson request not found');
        }
        if (!data.address) {
          throw new Error('Lesson request address is missing');
        }
        setLessonRequest(data);
      } catch (err) {
        console.error('Error fetching lesson request:', err);
        setError(err instanceof Error ? err.message : 'Failed to load lesson request details');
      } finally {
        setLoading(false);
      }
    };

    fetchLessonRequest();
  }, [lessonRequestId]);

  if (loading) {
    return (
      <div className="card card-primary lesson-request-card">
        <div className="card-body">
          <p className="text-center">Loading lesson request details...</p>
        </div>
      </div>
    );
  }

  if (error || !lessonRequest) {
    return (
      <div className="card card-primary lesson-request-card">
        <div className="card-body">
          <p className="text-center text-error">{error || 'Failed to load lesson request'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card card-primary lesson-request-card">
      <div className="card-header">
        <h3>Lesson Request Details</h3>
      </div>
      <div className="card-body">
        <div className="lesson-request-details">
          <div className="lesson-request-detail">
            <span className="detail-label">Lesson Type:</span>
            <span className="detail-value">{lessonRequest.type}</span>
          </div>

          <div className="lesson-request-detail">
            <span className="detail-label">Duration:</span>
            <span className="detail-value">{lessonRequest.durationMinutes} minutes</span>
          </div>

          <div className="lesson-request-detail">
            <span className="detail-label">Date & Time:</span>
            <span className="detail-value">
              <FormattedDateTime timestamp={lessonRequest.startTime} />
            </span>
          </div>

          <div className="lesson-request-detail">
            <span className="detail-label">Location:</span>
            <span className="detail-value">
              <FormattedAddress addressObject={lessonRequest.address} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LessonRequestCard; 