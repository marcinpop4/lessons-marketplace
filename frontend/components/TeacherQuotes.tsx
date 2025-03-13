import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLessonQuotesByRequestId, acceptLessonQuote } from '../api/lessonQuotesApi';
import { getAvailableTeachers, createLessonQuote } from '../api/teacherQuoteApi';
import { getLessonRequestById } from '../api/lessonRequestApi';
import { createLessonFromQuote } from '../api/lessonApi';
import { LessonQuote, LessonRequest } from '../types/lesson';
import '../styles/TeacherQuotes.css';

interface TeacherQuotesProps {
  lessonRequestId: string;
  onBack: () => void;
}

const TeacherQuotes: React.FC<TeacherQuotesProps> = ({ lessonRequestId: propLessonRequestId, onBack }) => {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<LessonQuote[]>([]);
  const [lessonRequest, setLessonRequest] = useState<LessonRequest | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [acceptingQuote, setAcceptingQuote] = useState<string | null>(null);
  const [acceptSuccess, setAcceptSuccess] = useState<string | null>(null);
  const [generatingQuotes, setGeneratingQuotes] = useState<boolean>(false);
  const [creatingLesson, setCreatingLesson] = useState<boolean>(false);
  
  // Get lessonRequestId from URL params as a fallback
  const { lessonRequestId: paramLessonRequestId } = useParams<{ lessonRequestId: string }>();
  
  // Use the prop if available, otherwise use the URL param
  // Will throw error if both are undefined
  const effectiveLessonRequestId = propLessonRequestId || paramLessonRequestId;

  // Function to fetch quotes
  const fetchQuotes = async () => {
    if (!effectiveLessonRequestId) {
      setError('No lesson request ID provided');
      setLoading(false);
      return;
    }

    try {
      // Fetch the lesson request details
      const requestData = await getLessonRequestById(effectiveLessonRequestId);
      setLessonRequest(requestData);
      
      // Fetch quotes
      const quotesData = await getLessonQuotesByRequestId(effectiveLessonRequestId);
      setQuotes(quotesData);
      
      // If no quotes are found, automatically generate them
      if (quotesData.length === 0 && !generatingQuotes) {
        await generateQuotes();
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      // Set error instead of continuing with empty quotes
      setError('Failed to fetch quotes. Please try again.');
      setQuotes([]);
    } finally {
      setLoading(false);
    }
  };

  // Function to generate quotes from available teachers
  const generateQuotes = async () => {
    if (!effectiveLessonRequestId) {
      setError('No lesson request ID provided');
      return;
    }

    setGeneratingQuotes(true);
    setError(null);

    try {
      // 1. Get the lesson request details if not already loaded
      const lessonRequestData = lessonRequest || await getLessonRequestById(effectiveLessonRequestId);
      if (!lessonRequest) {
        setLessonRequest(lessonRequestData);
      }
      
      // 2. Get available teachers for this lesson type (limit to 5)
      const teachers = await getAvailableTeachers(lessonRequestData.type, 5);
      
      if (teachers.length === 0) {
        setError('No teachers available for this lesson type.');
        setGeneratingQuotes(false);
        return;
      }
      
      // Ensure we only use up to 5 teachers
      const teachersToUse = teachers.slice(0, 5);
      
      // 3. Create quotes for each teacher
      const createdQuotes: LessonQuote[] = [];
      
      for (const teacher of teachersToUse) {
        try {
          // Calculate cost based on hourly rate and duration
          // Check if hourly rate exists, throw error if not
          const hourlyRate = teacher.lessonHourlyRates[lessonRequestData.type];
          if (hourlyRate === undefined) {
            throw new Error(`Teacher ${teacher.id} does not have a rate for ${lessonRequestData.type} lessons`);
          }
          
          const costInCents = Math.round((hourlyRate * lessonRequestData.durationMinutes) / 60);
          
          // Create a quote
          const quote = await createLessonQuote(
            effectiveLessonRequestId,
            teacher.id,
            costInCents
          );
          
          createdQuotes.push(quote);
        } catch (quoteErr) {
          console.error(`Error creating quote for teacher ${teacher.id}:`, quoteErr);
          // Continue with other teachers if one fails
        }
      }
      
      // 4. Fetch all quotes again to get the updated list
      await fetchQuotes();
    } catch (err) {
      console.error('Error generating quotes:', err);
      setError('Failed to generate quotes. Please try again.');
    } finally {
      setGeneratingQuotes(false);
    }
  };

  // Fetch quotes on mount and when lessonRequestId changes
  useEffect(() => {
    fetchQuotes();
  }, [effectiveLessonRequestId]);

  // Format price for display
  const formatPrice = (priceInCents: number): string => {
    return `$${(priceInCents / 100).toFixed(2)}`;
  };

  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Handle accepting a quote
  const handleAcceptQuote = async (quoteId: string) => {
    if (!quoteId) {
      setError('Invalid quote ID');
      return;
    }
    
    try {
      setAcceptingQuote(quoteId);
      
      // Accept the quote - this will also expire all other quotes for this lesson request
      await acceptLessonQuote(quoteId);
      setAcceptSuccess(quoteId);
      
      // Create a lesson from the accepted quote
      setCreatingLesson(true);
      const lesson = await createLessonFromQuote(quoteId);
      
      // Redirect to the lesson confirmation page
      navigate(`/lesson-confirmation/${lesson.id}`);
    } catch (err) {
      console.error('Error accepting quote:', err);
      setError('Failed to accept quote. Please try again.');
      setAcceptingQuote(null);
      setCreatingLesson(false);
    }
  };

  if (loading) {
    return <div className="teacher-quotes-loading">Loading quotes...</div>;
  }

  if (error) {
    return (
      <div className="teacher-quotes-error">
        <p>{error}</p>
        <button onClick={onBack} className="back-button">Go Back</button>
      </div>
    );
  }

  if (quotes.length === 0) {
    return (
      <div className="teacher-quotes-empty">
        <h2>No Quotes Available Yet</h2>
        <p>Would you like to request quotes from available teachers?</p>
        <button 
          className="generate-quotes-button" 
          onClick={generateQuotes}
          disabled={generatingQuotes}
        >
          {generatingQuotes ? 'Generating Quotes...' : 'Get Quotes from Teachers'}
        </button>
        <button onClick={onBack} className="back-button">Back to Lesson Request</button>
      </div>
    );
  }

  return (
    <div className="teacher-quotes-container">
      <h2>Teacher Quotes</h2>
      
      {/* Lesson Request Details Card */}
      {lessonRequest && (
        <div className="lesson-request-card">
          <h3>Lesson Request Details</h3>
          <div className="lesson-request-details">
            <p><strong>Lesson Type:</strong> {lessonRequest.type}</p>
            <p><strong>Duration:</strong> {lessonRequest.durationMinutes} minutes</p>
            <p><strong>Date:</strong> {formatDate(lessonRequest.startTime)}</p>
            <p><strong>Location:</strong> {lessonRequest.address}</p>
          </div>
        </div>
      )}
      
      <p className="teacher-quotes-subheading">Compare offers from our teachers:</p>
      
      {/* Teacher Quotes Grid */}
      <div className="quotes-grid">
        {quotes.map((quote) => {
          // Validate required properties exist before rendering
          if (!quote.teacher || !quote.lessonRequest || !quote.id) {
            console.error('Invalid quote data:', quote);
            return null; // Skip rendering this quote
          }
          
          // Store the ID in a local variable to ensure TypeScript knows it's not undefined
          const quoteId = quote.id;
          
          return (
            <div key={quoteId} className="quote-card">
              <div className="quote-header">
                <h3>{quote.teacher.firstName}</h3>
                <p className="quote-price">{formatPrice(quote.costInCents)}</p>
              </div>
              
              <div className="quote-details">
                <p className="quote-rate"><strong>Rate:</strong> {formatPrice(quote.costInCents * 60 / quote.lessonRequest.durationMinutes)}/hr</p>
              </div>
              
              <div className="quote-footer">
                {acceptSuccess === quoteId ? (
                  <div className="success-message">Quote accepted!</div>
                ) : (
                  <button 
                    className="accept-quote-button" 
                    onClick={() => handleAcceptQuote(quoteId)}
                    disabled={acceptingQuote === quoteId || acceptSuccess !== null || creatingLesson}
                  >
                    {acceptingQuote === quoteId ? 'Processing...' : creatingLesson ? 'Creating...' : 'Accept Quote'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      <button onClick={onBack} className="back-button">Back to Lesson Request</button>
    </div>
  );
};

export default TeacherQuotes; 