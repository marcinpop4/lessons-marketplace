import React, { useState } from 'react';
import { LessonQuote } from '@shared/models/LessonQuote';
import { createLessonFromQuote } from '@frontend/api/lessonApi';
import { Card } from '@frontend/components/shared/Card';
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
    <Card
      title={`${quote.teacher.firstName} ${quote.teacher.lastName} - ${quote.getFormattedCost()}`}
      variant="accent"
      className="teacher-quote-card"
    >
      <div className="quote-details">

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
    </Card>
  );
};

export default TeacherQuoteCard; 