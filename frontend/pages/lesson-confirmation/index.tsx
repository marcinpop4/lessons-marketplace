import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getLessonById } from '../../api/lessonApi';
import { Lesson } from '@shared/models/Lesson';
import LessonDetails from '../../components/features/lesson-confirmation/LessonDetails';
import './lesson-confirmation.css';

export default function LessonConfirmation() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('LessonConfirmation useEffect triggered with lessonId:', lessonId);
    if (lessonId) {
      console.log('Making API call to getLessonById');
      getLessonById(lessonId)
        .then((lesson) => {
          console.log('Successfully got lesson:', lesson);
          setLesson(lesson);
        })
        .catch((err) => {
          console.error('Error fetching lesson:', err);
          setError(err.message);
        });
    } else {
      console.log('No lessonId provided in URL params');
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