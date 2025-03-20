import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLessonById } from '../api/lessonApi';
import { Lesson, LessonQuote, Teacher, LessonRequest, Address } from '../types/lesson';
import '../styles/LessonConfirmation.css';

// Extended lesson type that includes the quote data
interface LessonWithDetails extends Lesson {
  quote: LessonQuote & {
    teacher: Teacher;
    lessonRequest: LessonRequest;
  };
}

const LessonConfirmation: React.FC = () => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  
  const [lesson, setLesson] = useState<LessonWithDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch lesson data
  useEffect(() => {
    const fetchLesson = async () => {
      if (!lessonId) {
        setError('No lesson ID provided');
        setLoading(false);
        return;
      }
      
      try {
        const lessonData = await getLessonById(lessonId);
        setLesson(lessonData as LessonWithDetails);
      } catch (err) {
        console.error('Error fetching lesson:', err);
        setError('Failed to load lesson details. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchLesson();
  }, [lessonId]);
  
  // Format price for display
  const formatPrice = (priceInCents: number): string => {
    return `$${(priceInCents / 100).toFixed(2)}`;
  };
  
  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Format address for display
  const formatAddress = (address: Address): string => {
    if (!address) return 'No address provided';
    return `${address.street}, ${address.city}, ${address.state} ${address.postalCode}, ${address.country}`;
  };
  
  // Handle creating a new lesson request
  const handleCreateNewLesson = () => {
    navigate('/lesson-request');
  };
  
  if (loading) {
    return <div className="lesson-confirmation-loading">Loading lesson details...</div>;
  }
  
  if (error || !lesson) {
    return (
      <div className="lesson-confirmation-error">
        <h2>Error</h2>
        <p>{error || 'Failed to load lesson details'}</p>
        <button onClick={handleCreateNewLesson} className="new-lesson-button">Create a New Lesson</button>
      </div>
    );
  }
  
  // Extract quote, teacher and lesson request from the lesson data
  const { quote } = lesson;
  const { teacher, lessonRequest } = quote;
  
  return (
    <div className="lesson-confirmation-container">
      <div className="confirmation-header">
        <div className="confirmation-header-content">
          <div className="confirmation-icon">✓</div>
          <div className="confirmation-text">
            <h2>Lesson Confirmed!</h2>
            <p>Your lesson has been successfully booked and confirmed.</p>
          </div>
        </div>
        <button 
          className="new-lesson-button"
          onClick={handleCreateNewLesson}
        >
          Book Another Lesson
        </button>
      </div>
      
      <div className="lesson-details-section">
        <div className="lesson-details-card">
          <h3>Lesson Details</h3>
          
          <div className="lesson-info">
            <div className="info-columns">
              <div className="info-column">
                <div className="info-item">
                  <div className="info-label">Teacher</div>
                  <div className="info-value">{teacher?.firstName} {teacher?.lastName}</div>
                </div>
                
                <div className="info-item">
                  <div className="info-label">Lesson Type</div>
                  <div className="info-value">{lessonRequest?.type}</div>
                </div>
                
                <div className="info-item">
                  <div className="info-label">Date</div>
                  <div className="info-value">{lessonRequest?.startTime ? formatDate(lessonRequest.startTime) : 'Not specified'}</div>
                </div>
              </div>
              
              <div className="info-column">
                <div className="info-item">
                  <div className="info-label">Duration</div>
                  <div className="info-value">{lessonRequest?.durationMinutes} minutes</div>
                </div>
                
                <div className="info-item">
                  <div className="info-label">Location</div>
                  <div className="info-value">{lessonRequest?.address ? formatAddress(lessonRequest.address) : 'No address specified'}</div>
                </div>
                
                <div className="info-item">
                  <div className="info-label">Price</div>
                  <div className="info-value">{quote?.costInCents ? formatPrice(quote.costInCents) : 'Not specified'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="confirmation-footer">
          <p className="teacher-contact-note">Your teacher will contact you shortly to confirm the details.</p>
        </div>
      </div>
    </div>
  );
};

export default LessonConfirmation; 