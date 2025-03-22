import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLessonById } from '@frontend/api/lessonApi';
import { Lesson, LessonQuote, Teacher, LessonRequest } from '@frontend/types/lesson';
import { LessonDetails } from '@frontend/components/features/lesson-confirmation';
import { AxiosError } from 'axios';
import './lesson-confirmation.css';

interface LessonWithDetails extends Lesson {
  quote: LessonQuote & {
    teacher: Teacher;
    lessonRequest: LessonRequest;
  }
}

const LessonConfirmation: React.FC = () => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  
  const [lesson, setLesson] = React.useState<LessonWithDetails | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  
  React.useEffect(() => {
    const fetchLesson = async () => {
      if (!lessonId) {
        setError('No lesson ID provided');
        setLoading(false);
        return;
      }
      
      // Log the lesson ID we're trying to fetch
      console.log('Attempting to fetch lesson with ID:', lessonId);
      
      try {
        const lessonData = await getLessonById(lessonId);
        
        // Validate the response structure
        if (!lessonData || !lessonData.quote) {
          console.error('Invalid lesson data received:', lessonData);
          setError('Invalid lesson data received from the server.');
          setLoading(false);
          return;
        }
        
        setLesson(lessonData as LessonWithDetails);
      } catch (err) {
        console.error('Error fetching lesson:', err);
        
        // Handle specific error cases
        if (err instanceof AxiosError) {
          const statusCode = err.response?.status;
          const responseData = err.response?.data;
          
          // Log detailed error information
          console.error('API Error Details:', { 
            status: statusCode,
            data: responseData,
            config: err.config,
            url: err.config?.url
          });
          
          if (statusCode === 404) {
            setError('Lesson not found. It may have been cancelled or deleted.');
          } else if (statusCode === 401) {
            setError('You are not authorized to view this lesson. Please log in again.');
            // Optionally redirect to login
            navigate('/auth');
          } else {
            setError(responseData?.message || 'Failed to load lesson details. Please try again.');
          }
        } else {
          setError('An unexpected error occurred. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchLesson();
  }, [lessonId, navigate]);
  
  const handleCreateNewLesson = () => {
    navigate('/lesson-request');
  };
  
  if (loading) {
    return (
      <div className="lesson-confirmation">
        <p className="text-center">Loading lesson details...</p>
      </div>
    );
  }
  
  if (error || !lesson) {
    return (
      <div className="lesson-confirmation">
        <div role="alert" className="alert alert-error">
          <p>{error || 'Failed to load lesson details'}</p>
        </div>
        <button onClick={handleCreateNewLesson} className="btn btn-primary w-full mt-4">
          Create a New Lesson
        </button>
      </div>
    );
  }
  
  const { quote } = lesson;
  const { teacher, lessonRequest } = quote;
  
  return (
    <div className="lesson-confirmation">
      <div role="alert" className="alert alert-success mb-6">
        Your lesson has been successfully booked and confirmed.
      </div>
      
      <LessonDetails
        teacher={teacher}
        lessonRequest={lessonRequest}
        quote={quote}
      />
      
      <div className="confirmation-actions mt-6">
        <p className="confirmation-message text-center mb-4">
          Your teacher will contact you soon with further instructions.
        </p>
        <button onClick={handleCreateNewLesson} className="btn btn-primary w-full">
          Book Another Lesson
        </button>
      </div>
    </div>
  );
};

export default LessonConfirmation; 