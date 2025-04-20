import React from 'react';
import { useNavigate } from 'react-router-dom';
import LessonRequestForm from '@frontend/components/features/lesson-request/LessonRequestForm';
import { Card } from '@frontend/components/shared/Card';
import './lesson-request.css';

const LessonRequestPage: React.FC = () => {
  const navigate = useNavigate();

  const handleSubmitSuccess = (lessonRequestId: string) => {
    navigate(`/student/teacher-quotes/${lessonRequestId}`);
  };

  return (
    <div className="lesson-request-page">
      <div className="page-header">
        <h1>Request a Lesson</h1>
        <p>Fill out the form below to request a lesson with one of our qualified teachers.</p>
      </div>
      <div className="lesson-request-content">
        <LessonRequestForm onSubmitSuccess={handleSubmitSuccess} />
      </div>
    </div>
  );
};

export default LessonRequestPage; 