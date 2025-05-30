import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getLessonById } from '@frontend/api/lessonApi';
import { Lesson } from '@shared/models/Lesson';
import LessonDetails from '@frontend/components/features/lesson-confirmation/LessonDetails';
import logger from '@frontend/utils/logger';
import './lesson-confirmation.css';

export default function LessonConfirmation() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (lessonId) {
      const fetchLesson = async () => {
        setLoading(true);
        setError(null);
        try {
          const fetchedLesson = await getLessonById(lessonId as string);
          setLesson(fetchedLesson);
        } catch (err: any) {
          logger.error('Error fetching lesson', { error: err });
          setError(err.message);
        }
        setLoading(false);
      };
      fetchLesson();
    } else {
      logger.warn('No lessonId provided in URL params');
    }
  }, [lessonId]);

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!lesson) {
    return <div>Loading...</div>;
  }

  return (
    <div className="lesson-confirmation-container">
      <h1>Lesson Confirmation</h1>
      <LessonDetails quote={lesson.quote} />
    </div>
  );
} 