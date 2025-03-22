// CACHE-BUSTER: 20250320101632
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLessonQuotesByRequestId, acceptLessonQuote } from '../api/lessonQuotesApi';
import { getAvailableTeachers, createLessonQuote } from '../api/teacherQuoteApi';
import { getLessonRequestById } from '../api/lessonRequestApi';
import { getLessonsByQuoteId } from '../api/lessonApi';
import { LessonQuote, LessonRequest, Address } from '../types/lesson';

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

  // Check if quote is expired
  const isQuoteExpired = (quote: LessonQuote): boolean => {
    return new Date() > new Date(quote.expiresAt);
  };

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
      
      // If no quotes are found and we're not already generating quotes, generate them
      if (quotesData.length === 0 && !generatingQuotes) {
        // Set a flag to indicate we're about to generate quotes
        // This helps prevent multiple concurrent quote generation attempts
        setGeneratingQuotes(true);
        
        // Generate quotes in a controlled way
        try {
          await generateQuotes();
        } finally {
          // Make sure to reset the flag even if generation fails
          setGeneratingQuotes(false);
        }
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

    setError(null);

    try {
      // 1. Get the lesson request details if not already loaded
      const lessonRequestData = lessonRequest || await getLessonRequestById(effectiveLessonRequestId);
      if (!lessonRequest) {
        setLessonRequest(lessonRequestData);
      }
      
      // Check once more for existing quotes to prevent duplicates
      // This handles race conditions if the component is mounted multiple times
      const existingQuotes = await getLessonQuotesByRequestId(effectiveLessonRequestId);
      if (existingQuotes.length > 0) {
        setQuotes(existingQuotes);
        return;
      }
      
      // 2. Get available teachers for this lesson type (limit to 5)
      const teachers = await getAvailableTeachers(lessonRequestData.type, 5);
      
      if (teachers.length === 0) {
        setError('No teachers available for this lesson type.');
        return;
      }
      
      // Ensure we only use up to 5 teachers
      const teachersToUse = teachers.slice(0, 5);
      
      // Keep track of teachers we've already created quotes for
      const processedTeacherIds = new Set();
      
      // 3. Create quotes for each teacher
      const createdQuotes: LessonQuote[] = [];
      
      for (const teacher of teachersToUse) {
        try {
          // Skip if we've already processed this teacher
          if (processedTeacherIds.has(teacher.id)) {
            console.log(`Skipping duplicate teacher ${teacher.id}`);
            continue;
          }
          
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
          processedTeacherIds.add(teacher.id);
        } catch (quoteErr) {
          console.error(`Error creating quote for teacher ${teacher.id}:`, quoteErr);
          // Continue with other teachers if one fails
        }
      }
      
      // 4. Fetch all quotes again to get the updated list
      // Only do this if we created at least one quote successfully
      if (createdQuotes.length > 0) {
        const updatedQuotes = await getLessonQuotesByRequestId(effectiveLessonRequestId);
        setQuotes(updatedQuotes);
      } else if (processedTeacherIds.size === 0) {
        // If we didn't process any teachers successfully, show an error
        setError('Unable to generate quotes. Please try again later.');
      }
    } catch (err) {
      console.error('Error generating quotes:', err);
      setError('Failed to generate quotes. Please try again.');
    }
  };

  // Fetch quotes on mount and when lessonRequestId changes
  useEffect(() => {
    fetchQuotes();
  }, [effectiveLessonRequestId]);

  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Add a format address function
  const formatAddress = (address: Address): string => {
    if (!address) return 'No address provided';
    return `${address.street}, ${address.city}, ${address.state} ${address.postalCode}, ${address.country}`;
  };

  // Handle accepting a quote
  const handleAcceptQuote = async (quoteId: string) => {
    if (!quoteId) {
      setError('Invalid quote ID');
      return;
    }
    
    try {
      setAcceptingQuote(quoteId);
      setCreatingLesson(true);
      
      // Accept the quote - this will also create a lesson and expire all other quotes
      const result = await acceptLessonQuote(quoteId);
      setAcceptSuccess(quoteId);
      
      // Redirect to the lesson confirmation page
      // The lesson ID should be in the result from acceptLessonQuote
      if (result.lesson && result.lesson.id) {
        navigate(`/lesson-confirmation/${result.lesson.id}`);
      } else {
        throw new Error('No lesson was created or no lesson ID was returned from the server');
      }
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
    <div className="card card-primary">
      <div className="card-header">
        <h3 className="text-xl font-semibold">Teacher Quotes</h3>
        {lessonRequest && (
          <div className="mt-2">
            <p className="text-sm"><span className="font-medium">Lesson Type:</span> {lessonRequest.type}</p>
            <p className="text-sm"><span className="font-medium">Duration:</span> {lessonRequest.durationMinutes} minutes</p>
            <p className="text-sm"><span className="font-medium">Date:</span> {formatDate(lessonRequest.startTime)}</p>
            <p className="text-sm"><span className="font-medium">Location:</span> {typeof lessonRequest.address === 'object' ? formatAddress(lessonRequest.address) : lessonRequest.address}</p>
          </div>
        )}
      </div>
      
      <div className="card-body">
        <p className="mb-4 text-sm">Choose your preferred teacher below:</p>
        
        {/* Teacher Quotes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {quotes.map((quote) => {
            // Validate required properties exist before rendering
            if (!quote.teacher || !quote.lessonRequest || !quote.id) {
              console.error('Invalid quote data:', quote);
              return null; // Skip rendering this quote
            }
            
            return (
              <div key={quote.id} className="card card-secondary" data-quote-id={quote.id}>
                <div className="card-header">
                  <h3 className="text-lg font-semibold">{quote.teacher.firstName} {quote.teacher.lastName}</h3>
                </div>
                <div className="card-body">
                  <div className="space-y-2">
                    {quote.teacher.experience && (
                      <p>Experience: {quote.teacher.experience} years</p>
                    )}
                    {quote.teacher.bio && (
                      <p className="text-sm">{quote.teacher.bio}</p>
                    )}
                    <p>Rate: {formatHourlyRate(quote)}</p>
                    <p>Lesson Price: {formatPrice(quote.costInCents)}</p>
                    {quote.teacher.specialties && (
                      <p className="text-sm">
                        Specialties: {quote.teacher.specialties.join(', ')}
                      </p>
                    )}
                    <button
                      onClick={() => quote.id && handleAcceptQuote(quote.id)}
                      className="btn btn-primary w-full mt-4"
                      disabled={!!acceptingQuote || isQuoteExpired(quote)}
                    >
                      {acceptingQuote === quote.id ? 'Accepting...' : 'Accept Quote'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-4">
          <button onClick={onBack} className="btn btn-secondary">Back to Lesson Request</button>
        </div>
      </div>
    </div>
  );
};

export default TeacherQuotes; 