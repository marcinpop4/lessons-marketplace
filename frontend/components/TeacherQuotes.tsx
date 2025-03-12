import React, { useState, useEffect } from 'react';
import { LessonRequest, LessonType, LessonQuote } from '../types/lesson';
import { TeacherWithRates, getAvailableTeachers, createLessonQuote, bookLesson } from '../api/teacherQuoteApi';
import { getLessonRequestById } from '../api/lessonRequestApi';
import '../styles/TeacherQuotes.css';

interface TeacherQuotesProps {
  lessonRequestId: string;
  onBack: () => void;
}

// Helper function to format date for display
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' at ' + 
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Helper function to format currency
const formatCurrency = (cents: number): string => {
  return `$${(cents / 100).toFixed(2)}`;
};

// Helper function to calculate lesson cost
const calculateLessonCost = (hourlyRate: number, durationMinutes: number): number => {
  return Math.round((hourlyRate * durationMinutes) / 60);
};

// Interface for teacher quote data
interface TeacherQuoteData {
  quoteId: string;
  teacher: TeacherWithRates;
  lessonCost: number;
}

const TeacherQuotes: React.FC<TeacherQuotesProps> = ({ lessonRequestId, onBack }) => {
  const [teacherQuotes, setTeacherQuotes] = useState<TeacherQuoteData[]>([]);
  const [lessonRequest, setLessonRequest] = useState<LessonRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingStatuses, setBookingStatuses] = useState<{ [quoteId: string]: 'idle' | 'loading' | 'success' | 'error' }>({});

  // Fetch lesson request, teachers, and create quotes
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Step 1: Fetch the lesson request details
        console.log('Fetching lesson request details...');
        const request = await getLessonRequestById(lessonRequestId);
        setLessonRequest(request);
        
        // Step 2: Fetch available teachers for the lesson type
        console.log('Fetching available teachers...');
        const availableTeachers = await getAvailableTeachers(request.type);
        
        if (availableTeachers.length === 0) {
          setLoading(false);
          return; // No teachers available, will show the "no teachers" message
        }
        
        // Step 3: Create quotes for each teacher
        console.log('Creating quotes for teachers...');
        const createdQuotes: TeacherQuoteData[] = [];
        const newBookingStatuses: { [quoteId: string]: 'idle' | 'loading' | 'success' | 'error' } = {};
        
        // Process teachers sequentially to avoid race conditions
        for (const teacher of availableTeachers) {
          try {
            // Calculate cost based on teacher's hourly rate and lesson duration
            const hourlyRate = teacher.lessonHourlyRates[request.type] || 0;
            const lessonCost = calculateLessonCost(hourlyRate, request.durationMinutes);
            
            // Create the quote in the database
            const quoteResult = await createLessonQuote(
              lessonRequestId,
              teacher.id,
              lessonCost
            );
            
            // Only add successfully created quotes
            if (quoteResult && quoteResult.id) {
              createdQuotes.push({
                quoteId: quoteResult.id,
                teacher,
                lessonCost
              });
              
              // Initialize booking status for this quote
              newBookingStatuses[quoteResult.id] = 'idle';
            }
          } catch (quoteErr) {
            console.error(`Error creating quote for teacher ${teacher.id}:`, quoteErr);
            // We don't add this teacher to the list if quote creation failed
          }
        }
        
        // Step 4: Update state with only the successfully created quotes
        setTeacherQuotes(createdQuotes);
        setBookingStatuses(newBookingStatuses);
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load teacher quotes.';
        setError(errorMessage);
        console.error('Error loading teacher quotes:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [lessonRequestId]);

  // Handle booking a lesson with a selected quote
  const handleBookLesson = async (quoteId: string) => {
    if (!quoteId) return;
    
    try {
      // Update booking status for this quote
      setBookingStatuses(prev => ({
        ...prev,
        [quoteId]: 'loading'
      }));
      
      // Book the lesson using the quote
      await bookLesson(quoteId);
      
      // Update booking status to success
      setBookingStatuses(prev => ({
        ...prev,
        [quoteId]: 'success'
      }));
    } catch (err) {
      console.error('Error booking lesson:', err);
      
      // Update booking status to error
      setBookingStatuses(prev => ({
        ...prev,
        [quoteId]: 'error'
      }));
    }
  };

  if (loading) {
    return (
      <div className="teacher-quotes-container">
        <div className="loading-message">Loading teacher quotes...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="teacher-quotes-container">
        <div className="error-message">Error: {error}</div>
        <button className="back-button" onClick={onBack}>Go Back</button>
      </div>
    );
  }

  if (!lessonRequest) {
    return (
      <div className="teacher-quotes-container">
        <div className="error-message">Could not find lesson request.</div>
        <button className="back-button" onClick={onBack}>Go Back</button>
      </div>
    );
  }

  if (teacherQuotes.length === 0) {
    return (
      <div className="teacher-quotes-container">
        <div className="teacher-quotes-header">
          <h2>Available Teachers</h2>
        </div>
        
        <div className="lesson-details">
          <div className="lesson-details-title">Lesson Details</div>
          <div className="lesson-detail-item">
            <span className="lesson-detail-label">Type:</span>
            <span>{lessonRequest.type}</span>
          </div>
          <div className="lesson-detail-item">
            <span className="lesson-detail-label">Date & Time:</span>
            <span>{formatDate(lessonRequest.startTime)}</span>
          </div>
          <div className="lesson-detail-item">
            <span className="lesson-detail-label">Duration:</span>
            <span>{lessonRequest.durationMinutes} minutes</span>
          </div>
          <div className="lesson-detail-item">
            <span className="lesson-detail-label">Location:</span>
            <span>{lessonRequest.address}</span>
          </div>
        </div>
        
        <div className="no-teachers-message">
          No available teachers for {lessonRequest.type} lessons at this time.
        </div>
        
        <button className="back-button" onClick={onBack}>Go Back</button>
      </div>
    );
  }

  return (
    <div className="teacher-quotes-container">
      <div className="teacher-quotes-header">
        <h2>Available Teachers</h2>
        <p>Choose a teacher for your {lessonRequest.type} lesson</p>
      </div>
      
      <div className="lesson-details">
        <div className="lesson-details-title">Lesson Details</div>
        <div className="lesson-detail-item">
          <span className="lesson-detail-label">Type:</span>
          <span>{lessonRequest.type}</span>
        </div>
        <div className="lesson-detail-item">
          <span className="lesson-detail-label">Date & Time:</span>
          <span>{formatDate(lessonRequest.startTime)}</span>
        </div>
        <div className="lesson-detail-item">
          <span className="lesson-detail-label">Duration:</span>
          <span>{lessonRequest.durationMinutes} minutes</span>
        </div>
        <div className="lesson-detail-item">
          <span className="lesson-detail-label">Location:</span>
          <span>{lessonRequest.address}</span>
        </div>
      </div>
      
      <div className="teacher-cards-grid">
        {teacherQuotes.map((quoteData) => {
          const { quoteId, teacher, lessonCost } = quoteData;
          const bookingStatus = bookingStatuses[quoteId] || 'idle';
          
          return (
            <div key={quoteId} className="teacher-card">
              <div className="teacher-name">{teacher.firstName} {teacher.lastName}</div>
              <div className="teacher-rate">
                Rate: {formatCurrency(teacher.lessonHourlyRates[lessonRequest.type] || 0)} per hour
              </div>
              <div className="lesson-cost">
                Lesson Cost: {formatCurrency(lessonCost)}
              </div>
              
              {bookingStatus === 'success' ? (
                <div className="success-message">
                  Lesson booked successfully!
                </div>
              ) : bookingStatus === 'error' ? (
                <div className="error-message">
                  Failed to book lesson. Please try again.
                </div>
              ) : (
                <button 
                  className="book-button"
                  onClick={() => handleBookLesson(quoteId)}
                  disabled={bookingStatus === 'loading' || Object.values(bookingStatuses).includes('success')}
                >
                  {bookingStatus === 'loading' ? 'Booking...' : 'Book Lesson'}
                </button>
              )}
            </div>
          );
        })}
      </div>
      
      <button className="back-button" onClick={onBack}>Go Back</button>
    </div>
  );
};

export default TeacherQuotes; 