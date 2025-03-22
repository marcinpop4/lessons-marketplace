// CACHE-BUSTER: 20250320101632
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLessonById } from '../api/lessonApi';
import { Lesson, LessonQuote, Teacher, LessonRequest, Address } from '../types/lesson';

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
  
  // Calculate hourly rate
  const calculateHourlyRate = (costInCents: number, durationMinutes: number): number => {
    return Math.round(costInCents * 60 / durationMinutes);
  };

  // Format hourly rate for display
  const formatHourlyRate = (quote: LessonQuote): string => {
    if (!quote.lessonRequest) return 'Not available';
    const hourlyRate = calculateHourlyRate(quote.costInCents, quote.lessonRequest.durationMinutes);
    return `${formatPrice(hourlyRate)}/hour`;
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
    return (
      <div className="card card-primary">
        <div className="card-body">
          <p className="text-center">Loading lesson details...</p>
        </div>
      </div>
    );
  }
  
  if (error || !lesson) {
    return (
      <div className="card card-primary">
        <div className="card-body">
          <div className="alert alert-error mb-4">
            <p>{error || 'Failed to load lesson details'}</p>
          </div>
          <button onClick={handleCreateNewLesson} className="btn btn-primary w-full">
            Create a New Lesson
          </button>
        </div>
      </div>
    );
  }
  
  // Extract quote, teacher and lesson request from the lesson data
  const { quote } = lesson;
  const { teacher, lessonRequest } = quote;
  
  return (
    <div className="space-y-6">
      <div className="card card-primary">
        <div className="card-header">
          <h3 className="text-xl font-semibold">Lesson Confirmed</h3>
        </div>
        <div className="card-body">
          <div className="alert alert-success mb-6">
            Your lesson has been successfully booked and confirmed.
          </div>
          
          <div className="card card-secondary">
            <div className="card-header">
              <h3 className="text-lg font-semibold">Lesson Details</h3>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium">Teacher</p>
                    <p>{teacher?.firstName} {teacher?.lastName}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium">Lesson Type</p>
                    <p>{lessonRequest?.type}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium">Date</p>
                    <p>{lessonRequest?.startTime ? formatDate(lessonRequest.startTime) : 'Not specified'}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium">Duration</p>
                    <p>{lessonRequest?.durationMinutes} minutes</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium">Location</p>
                    <p>{lessonRequest?.address ? formatAddress(lessonRequest.address) : 'No address specified'}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium">Price</p>
                    <div className="space-y-1">
                      <p>Rate: {formatHourlyRate(quote)}</p>
                      <p>Lesson Price: {formatPrice(quote.costInCents)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6">
            <p className="text-sm text-center mb-4">Your teacher will contact you shortly to confirm the details.</p>
            <button 
              onClick={handleCreateNewLesson}
              className="btn btn-primary w-full"
            >
              Book Another Lesson
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LessonConfirmation; 