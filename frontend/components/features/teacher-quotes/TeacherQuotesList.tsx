import React, { useState, useEffect } from 'react';
import { LessonQuote } from '@shared/models/LessonQuote';
import { LessonType } from '@shared/models/LessonType';
import { getLessonQuotesByRequestId } from '@frontend/api/lessonQuotesApi';
import { createLessonQuotes } from '@frontend/api/teacherQuoteApi';
import TeacherQuoteCard from './TeacherQuoteCard';
import './TeacherQuotesList.css';

interface TeacherQuotesListProps {
  lessonRequestId: string;
  lessonType: LessonType;
  onQuoteAccepted: (lessonId: string) => void;
  onError: (error: string) => void;
}

const TeacherQuotesList: React.FC<TeacherQuotesListProps> = ({
  lessonRequestId,
  lessonType,
  onQuoteAccepted,
  onError
}) => {
  const [quotes, setQuotes] = useState<LessonQuote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuotes = async () => {
    try {
      const quotesData = await getLessonQuotesByRequestId(lessonRequestId);
      setQuotes(quotesData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch quotes';
      setError(errorMessage);
      onError(errorMessage);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, [lessonRequestId]);

  const handleCreateQuotes = async () => {
    setLoading(true);
    setError(null);

    try {
      const newQuotes = await createLessonQuotes(lessonRequestId, lessonType);

      if (newQuotes.length === 0) {
        setError('No more teachers available for quotes');
        return;
      }

      // Update the quotes list
      setQuotes(prevQuotes => [...prevQuotes, ...newQuotes]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create quotes';
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleQuoteAccepted = (lessonId: string) => {
    onQuoteAccepted(lessonId);
  };

  return (
    <div className="teacher-quotes-list">
      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {quotes.length === 0 ? (
        <div className="no-quotes">
          <p>No quotes available yet.</p>
          <button
            onClick={handleCreateQuotes}
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? 'Creating Quotes...' : 'Get Quotes'}
          </button>
        </div>
      ) : (
        <>
          <div className="quotes-grid">
            {quotes.map(quote => (
              <TeacherQuoteCard
                key={quote.id}
                quote={quote}
                onAccept={handleQuoteAccepted}
              />
            ))}
          </div>
          {quotes.length < 5 && (
            <div className="get-more-quotes">
              <button
                onClick={handleCreateQuotes}
                disabled={loading}
                className="btn btn-secondary"
              >
                {loading ? 'Creating Quotes...' : 'Get More Quotes'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TeacherQuotesList; 