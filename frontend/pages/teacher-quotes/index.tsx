import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TeacherQuotesList from '../../components/features/teacher-quotes/TeacherQuotesList';
import LessonRequestCard from '../../components/features/teacher-quotes/LessonRequestCard';
import './teacher-quotes.css';

const TeacherQuotesPage: React.FC = () => {
  const navigate = useNavigate();
  const { lessonRequestId } = useParams<{ lessonRequestId: string }>();
  const [error, setError] = useState<string | null>(null);

  // Redirect if no lessonRequestId is provided
  useEffect(() => {
    if (!lessonRequestId) {
      navigate('/dashboard');
    }
  }, [lessonRequestId, navigate]);

  const handleBack = () => {
    navigate('/lesson-request');
  };

  const handleQuoteAccepted = (lessonId: string) => {
    navigate(`/lesson-confirmation/${lessonId}`);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  // Don't render the main content if there's no lessonRequestId
  if (!lessonRequestId) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="teacher-quotes-page">
      <div className="teacher-quotes-header">
        <h2>Teacher Quotes</h2>
        <p>Review quotes from our qualified teachers for your lesson request.</p>
      </div>

      {error && (
        <div role="alert" className="alert alert-error mb-4">
          {error}
        </div>
      )}

      <div className="teacher-quotes-container">
        <div className="teacher-quotes-sidebar">
          <LessonRequestCard lessonRequestId={lessonRequestId} />
          <div className="teacher-quotes-actions">
            <button 
              onClick={handleBack}
              className="btn btn-secondary"
            >
              Back to Lesson Request
            </button>
          </div>
        </div>

        <TeacherQuotesList 
          lessonRequestId={lessonRequestId}
          onQuoteAccepted={handleQuoteAccepted}
          onError={handleError}
        />
      </div>
    </div>
  );
};

export default TeacherQuotesPage; 