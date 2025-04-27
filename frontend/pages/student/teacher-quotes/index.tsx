import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TeacherQuotesList from '@frontend/components/features/teacher-quotes/TeacherQuotesList';
import LessonRequestCard from '@frontend/components/features/teacher-quotes/LessonRequestCard';
import { getLessonRequestById } from '@frontend/api/lessonRequestApi';
import { LessonRequest } from '@shared/models/LessonRequest';
import { LessonQuote } from '@shared/models/LessonQuote';
import './teacher-quotes.css';

const TeacherQuotesPage: React.FC = () => {
  const navigate = useNavigate();
  const { lessonRequestId } = useParams<{ lessonRequestId: string }>();
  const [error, setError] = useState<string | null>(null);
  const [lessonRequest, setLessonRequest] = useState<LessonRequest | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch lesson request details
  useEffect(() => {
    const fetchLessonRequest = async () => {
      if (!lessonRequestId) return;

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
    navigate(`/student/lesson-confirmation/${lessonId}`);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="alert alert-error">
          {error}
        </div>
        <button onClick={handleBack} className="btn btn-secondary">
          Back to Lesson Request
        </button>
      </div>
    );
  }

  if (!lessonRequest || !lessonRequestId) {
    return (
      <div className="error-container">
        <div className="alert alert-error">
          Lesson request not found
        </div>
        <button onClick={handleBack} className="btn btn-secondary">
          Back to Lesson Request
        </button>
      </div>
    );
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