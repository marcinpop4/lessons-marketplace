import React, { useState } from 'react';
import { LessonQuote } from '@shared/models/LessonQuote';
import { createLessonFromQuote } from '@frontend/api/lessonApi';
import './TeacherQuoteCard.css';

interface TeacherQuoteCardProps {
  quote: LessonQuote;
  onAccept: (lessonId: string) => void;
}

const TeacherQuoteCard: React.FC<TeacherQuoteCardProps> = ({ quote, onAccept }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    setLoading(true);
    setError(null);

    try {
      const lesson = await createLessonFromQuote(quote.id);
      onAccept(lesson.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept quote');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card card-accent teacher-quote-card">
      <div className="card-header">
        <h3>{quote.teacher.firstName} {quote.teacher.lastName}</h3>
      </div>
      <div className="card-body">
        <div className="quote-details">
          <div className="quote-detail">
            <span className="detail-label">Cost:</span>
            <span className="detail-value">{quote.getFormattedCost()}</span>
          </div>

          <div className="quote-detail">
            <span className="detail-label">Hourly Rate:</span>
            <span className="detail-value">
              ${(quote.hourlyRateInCents / 100).toFixed(2)}/hour
            </span>
          </div>

          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}
        </div>

        <div className="quote-actions">
          <button
            onClick={handleAccept}
            disabled={loading || !quote.isValid()}
            className="btn btn-accent"
          >
            {loading ? 'Accepting...' : 'Accept Quote'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeacherQuoteCard; 