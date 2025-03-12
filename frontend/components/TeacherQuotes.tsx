import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getLessonQuotesByRequestId, acceptLessonQuote } from '../api/lessonQuotesApi';
import { getAvailableTeachers, createLessonQuote } from '../api/teacherQuoteApi';
import { getLessonRequestById } from '../api/lessonRequestApi';
import { LessonQuote } from '../types/lesson';
import '../styles/TeacherQuotes.css';

interface TeacherQuotesProps {
  lessonRequestId: string;
  onBack: () => void;
}

const TeacherQuotes: React.FC<TeacherQuotesProps> = ({ lessonRequestId: propLessonRequestId, onBack }) => {
  const [quotes, setQuotes] = useState<LessonQuote[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [acceptingQuote, setAcceptingQuote] = useState<string | null>(null);
  const [acceptSuccess, setAcceptSuccess] = useState<string | null>(null);
  const [generatingQuotes, setGeneratingQuotes] = useState<boolean>(false);
  
  // Get lessonRequestId from URL params as a fallback
  const { lessonRequestId: paramLessonRequestId } = useParams<{ lessonRequestId: string }>();
  
  // Use the prop if available, otherwise use the URL param
  const effectiveLessonRequestId = propLessonRequestId || paramLessonRequestId || '';

  // Function to fetch quotes
  const fetchQuotes = async () => {
    if (!effectiveLessonRequestId) {
      setError('No lesson request ID provided');
      setLoading(false);
      return;
    }

    try {
      const quotesData = await getLessonQuotesByRequestId(effectiveLessonRequestId);
      setQuotes(quotesData);
      
      // If no quotes are found, automatically generate them
      if (quotesData.length === 0 && !generatingQuotes) {
        await generateQuotes();
      }
    } catch (err) {
      console.error('Error fetching quotes:', err);
      // Continue with empty quotes rather than showing error
      setQuotes([]);
      
      // If quotes couldn't be fetched, try to generate them
      if (!generatingQuotes) {
        try {
          await generateQuotes();
        } catch (genErr) {
          console.error('Failed to auto-generate quotes:', genErr);
        }
      }
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
      // 1. Get the lesson request details
      const lessonRequest = await getLessonRequestById(effectiveLessonRequestId);
      
      // 2. Get available teachers for this lesson type
      const teachers = await getAvailableTeachers(lessonRequest.type);
      
      if (teachers.length === 0) {
        setError('No teachers available for this lesson type.');
        setGeneratingQuotes(false);
        return;
      }
      
      // 3. Create quotes for each teacher
      const createdQuotes: LessonQuote[] = [];
      
      for (const teacher of teachers) {
        try {
          // Calculate cost based on hourly rate and duration
          const hourlyRate = teacher.lessonHourlyRates[lessonRequest.type] || 5000; // Default to $50/hour if not specified
          const costInCents = Math.round((hourlyRate * lessonRequest.durationMinutes) / 60);
          
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
    try {
      setAcceptingQuote(quoteId);
      await acceptLessonQuote(quoteId);
      setAcceptSuccess(quoteId);
    } catch (err) {
      console.error('Error accepting quote:', err);
      setError('Failed to accept quote. Please try again.');
    } finally {
      setAcceptingQuote(null);
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
      <p className="teacher-quotes-subheading">Compare offers from our teachers:</p>
      
      <div className="quotes-list">
        {quotes.map((quote) => (
          <div key={quote.id} className="quote-card">
            <div className="quote-header">
              <h3>{quote.teacher?.firstName || 'Unknown'} {quote.teacher?.lastName || ''}</h3>
              <p className="quote-price">{formatPrice(quote.costInCents)}</p>
            </div>
            
            <div className="quote-details">
              <p><strong>Lesson Type:</strong> {quote.lessonRequest?.type || 'Unknown'}</p>
              <p><strong>Duration:</strong> {quote.lessonRequest?.durationMinutes || 0} minutes</p>
              <p><strong>Date:</strong> {quote.lessonRequest?.startTime ? formatDate(quote.lessonRequest.startTime) : 'Unknown'}</p>
              <p><strong>Location:</strong> {quote.lessonRequest?.address || 'Unknown'}</p>
            </div>
            
            <div className="quote-footer">
              <p className="quote-expiry">Offer expires: {formatDate(quote.expiresAt)}</p>
              {acceptSuccess === quote.id ? (
                <div className="success-message">Quote accepted successfully!</div>
              ) : (
                <button 
                  className="accept-quote-button" 
                  onClick={() => handleAcceptQuote(quote.id || '')}
                  disabled={acceptingQuote === quote.id || acceptSuccess !== null}
                >
                  {acceptingQuote === quote.id ? 'Processing...' : 'Accept Quote'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <button onClick={onBack} className="back-button">Back to Lesson Request</button>
    </div>
  );
};

export default TeacherQuotes; 