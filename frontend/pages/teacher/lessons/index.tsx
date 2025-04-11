import React, { useState, useEffect } from 'react';
// Assuming existence of API functions and types
// import { fetchTeacherLessons, updateLessonStatus } from '../../api/lessonsApi';
// import { Lesson } from '../../../shared/models/Lesson';
// import { LessonStatusValue } from '../../../shared/models/LessonStatus';
// import { useAuth } from '../../context/AuthContext'; // Assuming an auth context
import '../profile/profile.css'; // Use profile CSS for now

// Placeholder types - replace with actual imports
type Lesson = { id: string; studentName: string; type: string; startTime: Date; durationMinutes: number; status: string };
enum LessonStatusValue { REQUESTED = 'REQUESTED', ACCEPTED = 'ACCEPTED', REJECTED = 'REJECTED', COMPLETED = 'COMPLETED', VOIDED = 'VOIDED' };

const TeacherLessonsPage: React.FC = () => {
    // const { teacher } = useAuth(); // Get logged-in teacher
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Mock teacher ID for now
    const teacherId = 'mock-teacher-id';

    useEffect(() => {
        const loadLessons = async () => {
            if (!teacherId) return;
            setLoading(true);
            setError(null);
            try {
                // TODO: Replace with actual API call
                // const fetchedLessons = await fetchTeacherLessons(teacherId);
                // MOCK DATA
                const fetchedLessons: Lesson[] = [
                    { id: '1', studentName: 'Alice', type: 'Guitar', startTime: new Date(Date.now() + 86400000), durationMinutes: 60, status: LessonStatusValue.REQUESTED },
                    { id: '2', studentName: 'Bob', type: 'Piano', startTime: new Date(Date.now() + 172800000), durationMinutes: 45, status: LessonStatusValue.REQUESTED },
                    { id: '3', studentName: 'Charlie', type: 'Violin', startTime: new Date(Date.now() - 86400000), durationMinutes: 60, status: LessonStatusValue.ACCEPTED },
                    { id: '4', studentName: 'David', type: 'Drums', startTime: new Date(Date.now() - 172800000), durationMinutes: 30, status: LessonStatusValue.COMPLETED },
                    { id: '5', studentName: 'Eve', type: 'Guitar', startTime: new Date(Date.now() - 259200000), durationMinutes: 60, status: LessonStatusValue.VOIDED },
                    { id: '6', studentName: 'Frank', type: 'Piano', startTime: new Date(Date.now() + 259200000), durationMinutes: 60, status: LessonStatusValue.ACCEPTED },
                ];
                // Filter lessons belonging to the teacher (assuming API doesn't do this)
                // setLessons(fetchedLessons.filter(l => l.teacherId === teacherId));
                setLessons(fetchedLessons);
            } catch (err) {
                console.error("Failed to fetch lessons:", err);
                setError('Failed to load lessons. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        loadLessons();
    }, [teacherId]);

    const handleUpdateStatus = async (lessonId: string, newStatus: LessonStatusValue) => {
        try {
            // TODO: Replace with actual API call
            // await updateLessonStatus(lessonId, newStatus);
            console.log(`Updating lesson ${lessonId} to ${newStatus}`);
            // Refetch lessons or update local state optimistically
            setLessons(prevLessons =>
                prevLessons.map(lesson =>
                    lesson.id === lessonId ? { ...lesson, status: newStatus } : lesson
                )
            );
        } catch (err) {
            console.error(`Failed to update lesson ${lessonId} status:`, err);
            // TODO: Show user-friendly error message
            alert('Failed to update lesson status.');
        }
    };

    const renderLessonCard = (lesson: Lesson) => (
        <div key={lesson.id} className="lesson-card">
            <h4>{lesson.type} Lesson with {lesson.studentName}</h4>
            <p>Date: {lesson.startTime.toLocaleDateString()}</p>
            <p>Time: {lesson.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            <p>Duration: {lesson.durationMinutes} minutes</p>
            <p>Status: {lesson.status}</p>
            {lesson.status === LessonStatusValue.REQUESTED && (
                <div className="lesson-actions">
                    <button onClick={() => handleUpdateStatus(lesson.id, LessonStatusValue.ACCEPTED)}>Accept</button>
                    <button onClick={() => handleUpdateStatus(lesson.id, LessonStatusValue.REJECTED)}>Reject</button>
                </div>
            )}
            {lesson.status === LessonStatusValue.ACCEPTED && (
                <div className="lesson-actions">
                    <button onClick={() => handleUpdateStatus(lesson.id, LessonStatusValue.COMPLETED)}>Mark as Completed</button>
                    <button onClick={() => handleUpdateStatus(lesson.id, LessonStatusValue.VOIDED)}>Void Lesson</button>
                </div>
            )}
        </div>
    );

    const requestedLessons = lessons.filter(l => l.status === LessonStatusValue.REQUESTED);
    const acceptedLessons = lessons.filter(l => l.status === LessonStatusValue.ACCEPTED);
    // Optionally display completed/voided lessons in separate sections or filter them out
    // const completedLessons = lessons.filter(l => l.status === LessonStatusValue.COMPLETED);
    // const voidedLessons = lessons.filter(l => l.status === LessonStatusValue.VOIDED);

    if (loading) return <div>Loading lessons...</div>;
    if (error) return <div className="error-message">{error}</div>;

    return (
        <div className="teacher-dashboard-lessons">
            <h2>Manage Lessons</h2>

            <section className="lesson-section">
                <h3>Requested Lessons</h3>
                {requestedLessons.length > 0 ? (
                    requestedLessons.map(renderLessonCard)
                ) : (
                    <p>No pending lesson requests.</p>
                )}
            </section>

            <section className="lesson-section">
                <h3>Accepted Lessons</h3>
                {acceptedLessons.length > 0 ? (
                    acceptedLessons.map(renderLessonCard)
                ) : (
                    <p>No upcoming accepted lessons.</p>
                )}
            </section>

            {/* Optional: Sections for Completed/Voided Lessons */}
            {/*
      <section className="lesson-section">
        <h3>Completed Lessons</h3>
        {completedLessons.length > 0 ? completedLessons.map(renderLessonCard) : <p>No completed lessons found.</p>}
      </section>

      <section className="lesson-section">
        <h3>Voided/Rejected Lessons</h3>
        {voidedLessons.length > 0 ? voidedLessons.map(renderLessonCard) : <p>No voided or rejected lessons found.</p>}
      </section>
      */}
        </div>
    );
};

export default TeacherLessonsPage; 