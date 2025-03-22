import React, { useState, useEffect } from 'react';
import { LessonQuote, LessonType } from '@frontend/types/lesson';
import { getLessonQuotesByRequestId } from '@frontend/api/lessonQuotesApi';
import { getAvailableTeachers, createLessonQuote } from '@frontend/api/teacherQuoteApi';
import { getLessonRequestById } from '@frontend/api/lessonRequestApi';
import TeacherQuoteCard from './TeacherQuoteCard';
import './TeacherQuotesList.css';

interface TeacherQuotesListProps {
  lessonRequestId?: string;
  onQuoteAccepted: (lessonId: string) => void;
  onError: (message: string) => void;
}

const TeacherQuotesList: React.FC<TeacherQuotesListProps> = ({ 
  lessonRequestId,
  onQuoteAccepted,
  onError
}) => {
  const [quotes, setQuotes] = useState<LessonQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingQuotes, setGeneratingQuotes] = useState(false);

  const generateQuotes = async () => {
    if (!lessonRequestId) {
      onError('No lesson request ID provided');
      return;
    }

    setGeneratingQuotes(true);

    try {
      // Get the lesson request details
      const lessonRequest = await getLessonRequestById(lessonRequestId);
      
      // Get existing quotes first
      const existingQuotes = await getLessonQuotesByRequestId(lessonRequestId);
      const existingTeacherIds = new Set(existingQuotes.map(quote => quote.teacher.id));
      
      // Get available teachers for this lesson type (limit to 6)
      const teachers = await getAvailableTeachers(lessonRequest.type as LessonType, 6);
      
      if (teachers.length === 0) {
        onError('No teachers available for this lesson type.');
        return;
      }
      
      // Keep track of teachers we've already created quotes for
      const processedTeacherIds = new Set(existingTeacherIds);
      const createdQuotes: LessonQuote[] = [];
      
      // Only create quotes for teachers who don't have one yet
      for (const teacher of teachers) {
        try {
          // Skip if we've already processed this teacher or if they already have a quote
          if (processedTeacherIds.has(teacher.id)) {
            continue;
          }
          
          // Calculate cost based on hourly rate and duration
          const hourlyRateInCents = teacher.lessonHourlyRates[lessonRequest.type as LessonType];
          if (hourlyRateInCents === undefined) {
            console.warn(`Teacher ${teacher.id} does not have a rate for ${lessonRequest.type} lessons`);
            continue;
          }
          
          // Calculate cost for the lesson duration
          const costInCents = Math.round((hourlyRateInCents * lessonRequest.durationMinutes) / 60);
          
          // Create a quote
          const quote = await createLessonQuote(
            lessonRequestId,
            teacher.id,
            costInCents
          );
          
          // Ensure we have all teacher data in the quote
          const enrichedQuote = {
            ...quote,
            hourlyRateInCents,
            teacher: {
              ...teacher,
              firstName: teacher.firstName,
              lastName: teacher.lastName,
              lessonsCompleted: teacher.lessonsCompleted
            }
          };
          
          createdQuotes.push(enrichedQuote);
          processedTeacherIds.add(teacher.id);
        } catch (err) {
          console.error(`Error creating quote for teacher ${teacher.id}:`, err);
        }
      }
      
      // Fetch all quotes again to get the updated list
      if (createdQuotes.length > 0 || existingQuotes.length > 0) {
        const updatedQuotes = await getLessonQuotesByRequestId(lessonRequestId);
        
        // Map to track unique teacher IDs
        const seenTeachers = new Set<string>();
        
        // Filter out duplicate teachers and ensure hourlyRateInCents is set
        const quotesWithData = updatedQuotes
          .filter(quote => {
            if (seenTeachers.has(quote.teacher.id)) {
              return false;
            }
            seenTeachers.add(quote.teacher.id);
            return true;
          })
          .map(quote => ({
            ...quote,
            teacher: {
              ...quote.teacher,
              firstName: quote.teacher.firstName,
              lastName: quote.teacher.lastName,
              lessonsCompleted: quote.teacher.lessonsCompleted
            }
          }));

        setQuotes(quotesWithData);
      } else {
        onError('Unable to generate quotes. Please try again later.');
      }
    } catch (err) {
      console.error('Error generating quotes:', err);
      onError('Failed to generate quotes. Please try again.');
    } finally {
      setGeneratingQuotes(false);
    }
  };

  const fetchQuotes = async () => {
    if (!lessonRequestId) {
      onError('No lesson request ID provided');
      setLoading(false);
      return;
    }

    try {
      const quotesData = await getLessonQuotesByRequestId(lessonRequestId);
      
      // If we have quotes, show them
      if (quotesData.length > 0) {
        // Map to track unique teacher IDs
        const seenTeachers = new Set<string>();
        
        // Filter out duplicate teachers
        const quotesWithData = quotesData
          .filter(quote => {
            if (seenTeachers.has(quote.teacher.id)) {
              return false;
            }
            seenTeachers.add(quote.teacher.id);
            return true;
          })
          .map(quote => ({
            ...quote,
            teacher: {
              ...quote.teacher,
              firstName: quote.teacher.firstName,
              lastName: quote.teacher.lastName,
              lessonsCompleted: quote.teacher.lessonsCompleted
            }
          }));
        setQuotes(quotesWithData);
        setLoading(false);
        return;
      }
      
      // If no quotes and we're not already generating them, start generation
      if (!generatingQuotes) {
        await generateQuotes();
      }
    } catch (err) {
      console.error('Error fetching quotes:', err);
      if (!generatingQuotes) {
        onError('Failed to fetch quotes. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, [lessonRequestId]);

  if (loading || generatingQuotes) {
    return (
      <div className="teacher-quotes-list">
        <div className="teacher-quotes-loading">
          <div className="card card-primary">
            <div className="card-body text-center">
              <p>{generatingQuotes ? 'Generating quotes from available teachers...' : 'Loading quotes...'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (quotes.length === 0) {
    return (
      <div className="teacher-quotes-list">
        <div className="teacher-quotes-empty">
          <div className="card card-primary">
            <div className="card-body text-center">
              <h3>No Quotes Available Yet</h3>
              <p className="mt-2">Would you like to request quotes from available teachers?</p>
              <button 
                onClick={generateQuotes}
                className="btn btn-primary mt-4"
                disabled={generatingQuotes}
              >
                Get Quotes from Teachers
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="teacher-quotes-list">
      {quotes.map(quote => (
        <TeacherQuoteCard
          key={quote.id}
          quote={quote}
          onAccept={onQuoteAccepted}
        />
      ))}
    </div>
  );
};

export default TeacherQuotesList; 