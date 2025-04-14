import React, { useState, useEffect, useCallback } from 'react';
import { fetchTeacherLessons, updateLessonStatus, FullLessonDetailsForTeacher } from '@frontend/api/lessonApi'; // Import fetch function
import { LessonStatusValue } from '@shared/models/LessonStatus.js';
// Import the actual Lesson type from shared models
import { Lesson } from '@shared/models/Lesson.js'; // Assuming Lesson model exists
import { useAuth } from '@frontend/contexts/AuthContext'; // Import useAuth
import '../profile/profile.css';
import TeacherLessonCard from '@frontend/components/TeacherLessonCard'; // Import the card component

// Define the type used within the component, converting startTime to Date
interface DisplayLesson extends Omit<FullLessonDetailsForTeacher, 'startTime'> {
    startTime: Date; // Use Date object for display/logic
}


const TeacherLessonsPage: React.FC = () => {
    console.log("[TeacherLessonsPage] Component rendering..."); // <-- Log component start

    const { user } = useAuth(); // Get logged-in user
    const teacherId = user?.id;  // Use actual teacher ID from context

    const [lessons, setLessons] = useState<DisplayLesson[]>([]); // Use DisplayLesson type
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [updatingLessonId, setUpdatingLessonId] = useState<string | null>(null);

    // Function to fetch lessons
    const loadLessons = async () => {
        if (!teacherId) {
            setError("Teacher ID not found. Cannot load lessons.");
            setLoading(false);
            return;
        }
        if (!updatingLessonId && !lessons.length) { // Only set global loading on initial load
            setLoading(true);
        }
        setError(null);
        try {
            console.log(`[LessonsPage] Fetching lessons for teacher: ${teacherId}`);
            // *** Use API Call ***
            const fetchedLessons = await fetchTeacherLessons(teacherId);

            // Process fetched lessons: convert startTime string to Date object
            const processedLessons = fetchedLessons.map((lesson): DisplayLesson => ({
                ...lesson,
                startTime: new Date(lesson.startTime) // Convert string to Date
            }));

            setLessons(processedLessons);
        } catch (err: any) {
            console.error("Failed to fetch lessons:", err);
            setError(err.message || 'Failed to load lessons.');
        } finally {
            setLoading(false);
            // Log state immediately after fetch completes and loading is set to false
            console.log(`[loadLessons finally] loading=${false}, error=${error}, lessons count=${lessons.length}`);
        }
    };

    useEffect(() => {
        // Only load lessons if we have a teacher ID
        if (teacherId) {
            loadLessons();
        } else {
            // Handle case where user might not be loaded yet or is not a teacher
            setLoading(false); // Stop loading if no ID
            // setError("Could not determine teacher ID."); // Optional: set an error
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [teacherId]); // Rerun if teacherId changes

    // Wrap handler in useCallback
    const handleUpdateStatus = useCallback(async (lessonId: string, newStatus: LessonStatusValue) => {
        console.log(`PARENT: handleUpdateStatus useCallback called for ${lessonId} with ${newStatus}`);
        setUpdatingLessonId(lessonId);
        try {
            await updateLessonStatus(lessonId, newStatus);
            await loadLessons(); // loadLessons needs to be a dependency
        } catch (err: any) {
            console.error(`Failed to update lesson ${lessonId} status to ${newStatus}:`, err);
            alert(`Failed to update lesson status. ${err.message || ''}`);
        } finally {
            setUpdatingLessonId(null);
        }
        // Add loadLessons as a dependency
        // Note: If loadLessons itself isn't wrapped in useCallback, this might cause unnecessary re-creations
        // For now, let's add it. We might need to wrap loadLessons too if issues persist.
    }, [loadLessons]);

    // Filtering logic remains the same, but ensure properties exist on DisplayLesson
    const requestedLessons = lessons.filter(l => l.status === LessonStatusValue.REQUESTED);
    const upcomingLessons = lessons.filter(l => l.status === LessonStatusValue.ACCEPTED && l.startTime > new Date());
    const pastLessons = lessons.filter(l => l.status !== LessonStatusValue.REQUESTED && (l.status !== LessonStatusValue.ACCEPTED || l.startTime <= new Date()));

    // Log state right before rendering JSX
    console.log(`[TeacherLessonsPage] State before render: loading=${loading}, error=${error}, lessons=${lessons.length}, requested=${requestedLessons.length}, upcoming=${upcomingLessons.length}, past=${pastLessons.length}`);

    if (loading) return <div className="text-center p-4">Loading lessons...</div>;
    // Handle case where teacherId wasn't available initially
    if (!teacherId && !loading) return <div className="alert alert-warning">Could not load lessons. Teacher information not available.</div>;
    if (error) return <div className="alert alert-error">{error}</div>;

    // JSX rendering remains largely the same...
    return (
        <div className="teacher-dashboard-lessons container mx-auto p-4">
            <h2 className="text-2xl font-semibold mb-6">Manage Lessons</h2>

            <section className="lesson-section mb-8">
                <h3 className="text-xl font-medium mb-4">Requested Lessons ({requestedLessons.length})</h3>
                {requestedLessons.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {requestedLessons.map(lesson => {
                            console.log(`Mapping Requested ${lesson.id}. typeof handleUpdateStatus: ${typeof handleUpdateStatus}`);
                            return (
                                <TeacherLessonCard
                                    key={lesson.id}
                                    lesson={lesson as any}
                                    currentStatus={lesson.status as LessonStatusValue}
                                    onUpdateStatus={handleUpdateStatus}
                                    isUpdating={updatingLessonId === lesson.id}
                                />
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-gray-500">No pending lesson requests.</p>
                )}
            </section>

            <section className="lesson-section mb-8">
                <h3 className="text-xl font-medium mb-4">Upcoming Lessons ({upcomingLessons.length})</h3>
                {upcomingLessons.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {upcomingLessons.map(lesson => {
                            console.log(`Mapping Upcoming ${lesson.id}. typeof handleUpdateStatus: ${typeof handleUpdateStatus}`);
                            return (
                                <TeacherLessonCard
                                    key={lesson.id}
                                    lesson={lesson as any}
                                    currentStatus={lesson.status as LessonStatusValue}
                                    onUpdateStatus={handleUpdateStatus}
                                    isUpdating={updatingLessonId === lesson.id}
                                />
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-gray-500">No upcoming accepted lessons.</p>
                )}
            </section>

            <section className="lesson-section">
                <h3 className="text-xl font-medium mb-4">Past Lessons ({pastLessons.length})</h3>
                {pastLessons.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pastLessons.map(lesson => {
                            console.log(`Mapping Past ${lesson.id}. typeof handleUpdateStatus: ${typeof handleUpdateStatus}`);
                            return (
                                <TeacherLessonCard
                                    key={lesson.id}
                                    lesson={lesson as any}
                                    currentStatus={lesson.status as LessonStatusValue}
                                    onUpdateStatus={handleUpdateStatus}
                                    isUpdating={updatingLessonId === lesson.id}
                                />
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-gray-500">No past lessons found.</p>
                )}
            </section>
        </div>
    );

};

export default TeacherLessonsPage; 