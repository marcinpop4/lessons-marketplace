import React, { useState, useEffect, useCallback } from 'react';
import { LessonQuote } from '@shared/models/LessonQuote';
import { LessonType } from '@shared/models/LessonType';
import { getLessonQuotesByRequestId } from '@frontend/api/lessonQuotesApi';
import { createLessonQuotes } from '@frontend/api/teacherQuoteApi';
import TeacherQuoteCard from './TeacherQuoteCard';
import './TeacherQuotesList.css';
import { useAuth } from '@frontend/contexts/AuthContext';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const loadAndGenerateQuotes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let existingQuotes = await getLessonQuotesByRequestId(lessonRequestId);

      if (existingQuotes.length === 0 && user?.userType === 'STUDENT') {
        const generatedQuotes = await createLessonQuotes(lessonRequestId, lessonType);

        if (generatedQuotes.length === 0) {
          setError('Sorry, no available teachers could provide a quote for this lesson type at this time.');
          setQuotes([]);
        } else {
          setQuotes(generatedQuotes);
        }
      } else {
        setQuotes(existingQuotes);
        if (existingQuotes.length === 0 && user?.userType !== 'STUDENT') {
          console.warn('TeacherQuotesList loaded with no existing quotes for a non-student user.');
          setError('No quotes found for this request.');
        }
      }
    } catch (err) {
      console.error("Error loading or generating quotes:", err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load or generate quotes';
      setError(errorMessage);
      onError(errorMessage);
      setQuotes([]);
    } finally {
      setLoading(false);
    }
  }, [lessonRequestId, lessonType, onError, user?.userType]);

  useEffect(() => {
    loadAndGenerateQuotes();
  }, [loadAndGenerateQuotes]);

  const handleQuoteAccepted = (lessonId: string) => {
    onQuoteAccepted(lessonId);
  };

  if (loading) {
    return <div className="loading-spinner">Loading quotes...</div>;
  }

  if (error) {
    return (
      <div className="alert alert-error teacher-quotes-list">
        <p>{error}</p>
      </div>
    );
  }

  if (quotes.length === 0) {
    return (
      <div className="alert alert-info teacher-quotes-list">
        <p>No quotes are currently available for this lesson request.</p>
      </div>
    );
  }

  return (
    <div className="teacher-quotes-list">
      <div className="quotes-grid">
        {quotes.map(quote => (
          <TeacherQuoteCard
            key={quote.id}
            quote={quote}
            onAccept={handleQuoteAccepted}
          />
        ))}
      </div>
    </div>
  );
};

export default TeacherQuotesList; 