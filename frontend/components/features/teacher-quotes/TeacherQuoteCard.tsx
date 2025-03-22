import React, { useState } from 'react';
import { LessonQuote } from '@frontend/types/lesson';
import { acceptLessonQuote } from '@frontend/api/lessonQuotesApi';
import { formatCurrency } from '@frontend/utils/currencyFormatter';
import { AxiosError } from 'axios';
import './TeacherQuoteCard.css';

interface TeacherQuoteCardProps {
  quote: LessonQuote;
  onAccept: (lessonId: string) => void;
}

const TeacherQuoteCard: React.FC<TeacherQuoteCardProps> = ({ quote, onAccept }) => {
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAcceptQuote = async () => {
    setAccepting(true);
    setError(null);

    try {
      const result = await acceptLessonQuote(quote.id);
      
      // Log the result for debugging
      console.log('Quote acceptance result:', result);
      
      // Validate the response structure
      if (!result || !result.lesson || !result.lesson.id) {
        console.error('Invalid response from acceptLessonQuote:', result);
        throw new Error('Invalid response format: missing lesson ID');
      }
      
      // Navigate to lesson confirmation page
      onAccept(result.lesson.id);
    } catch (err) {
      console.error('Error accepting quote:', err);
      
      // Handle different error types
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
        
        if (statusCode === 401) {
          setError('Authentication error. Please log in again.');
        } else if (statusCode === 404) {
          setError('Quote not found. It may have been deleted.');
        } else if (statusCode === 400) {
          setError('Quote has expired or is invalid.');
        } else {
          setError(responseData?.message || 'Failed to accept quote. Please try again.');
        }
      } else if (err instanceof Error) {
        setError(err.message || 'Failed to accept quote. Please try again.');
      } else {
        setError('Failed to accept quote. Please try again.');
      }
      
      setAccepting(false);
    }
  };

  return (
    <div className="card card-accent">
      <div className="card-header">
        <h3>
          {quote.teacher.firstName} {quote.teacher.lastName[0]}.
          <span className="price-amount">{formatCurrency(quote.costInCents)}</span>
        </h3>
      </div>
      <div className="card-body">
        <div className="hourly-rate">
          Rate: {formatCurrency(quote.hourlyRateInCents)}/hour
        </div>

        {error && <p className="text-error">{error}</p>}

        <div className="quote-actions">
          <button
            className="btn btn-primary"
            onClick={handleAcceptQuote}
            disabled={accepting || quote.status === 'EXPIRED'}
          >
            {accepting ? 'Accepting...' : 'Accept Quote'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeacherQuoteCard; 