import React, { useState, useEffect } from 'react';
import TeacherLessonCard from '../../../components/TeacherLessonCard';
import { Lesson } from '@shared/models/Lesson';
import { LessonStatusValue } from '@shared/models/LessonStatus';
import { getTeacherLessons, TeacherLessonApiResponseItem } from '@frontend/api/teacherApi'; // Import API function and response type
import { updateLessonStatus } from '@frontend/api/lessonApi'; // Import the update status function
import { LessonQuote } from '@shared/models/LessonQuote';
import { LessonRequest } from '@shared/models/LessonRequest';
import { Student } from '@shared/models/Student';
import { Teacher } from '@shared/models/Teacher';
import { Address } from '@shared/models/Address';
import { LessonType } from '@shared/models/LessonType'; // Import LessonType enum
import { useAuth } from '@frontend/contexts/AuthContext';

// Helper function to instantiate models from raw API data
const instantiateLessonFromData = (data: TeacherLessonApiResponseItem): Lesson => {
    // Provide defaults for missing fields required by constructors, 
    // as these are NOT fetched from the API anymore.
    const studentData = {
        id: data.quote.lessonRequest.student.id,
        firstName: data.quote.lessonRequest.student.firstName,
        lastName: data.quote.lessonRequest.student.lastName,
        email: data.quote.lessonRequest.student.email,
        phoneNumber: '', // Default value
        dateOfBirth: new Date(0) // Default value
    };
    const teacherData = {
        id: data.quote.teacher.id,
        firstName: data.quote.teacher.firstName,
        lastName: data.quote.teacher.lastName,
        email: data.quote.teacher.email,
        phoneNumber: '', // Default value
        dateOfBirth: new Date(0), // Default value
        hourlyRates: [] // Default value
    };

    const student = new Student(studentData);
    const teacher = new Teacher(teacherData);
    const address = new Address(data.quote.lessonRequest.address);

    // Ensure LessonRequest type is correctly cast/handled
    const lessonRequestType = data.quote.lessonRequest.type as LessonType;
    if (!Object.values(LessonType).includes(lessonRequestType)) {
        console.warn(`Invalid LessonType received: ${data.quote.lessonRequest.type}`);
        // Handle invalid type, e.g., default or throw error
    }

    const lessonRequest = new LessonRequest({
        // Use only fields available in API response for lessonRequest base
        id: data.quote.lessonRequest.id,
        type: lessonRequestType,
        startTime: new Date(data.quote.lessonRequest.startTime),
        durationMinutes: data.quote.lessonRequest.durationMinutes,
        // Pass instantiated objects
        student: student,
        address: address,
    });

    const lessonQuote = new LessonQuote({
        // Use only fields available in API response for quote base
        id: data.quote.id,
        costInCents: data.quote.costInCents,
        hourlyRateInCents: data.quote.hourlyRateInCents || 0,
        expiresAt: new Date(data.quote.expiresAt),
        // Pass instantiated objects
        lessonRequest: lessonRequest,
        teacher: teacher,
        // Omit createdAt, use constructor default
    });

    const lesson = new Lesson({
        id: data.id,
        quote: lessonQuote,
        currentStatusId: data.currentStatus?.id || '',
    });

    // Attach the status value for easy access in the page component
    // Use optional chaining in case currentStatus is null
    (lesson as any)._currentStatusValue = data.currentStatus?.status;

    return lesson;
};

const TeacherLessonsPage: React.FC = () => {
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [updatingLessonId, setUpdatingLessonId] = useState<string | null>(null);
    const { user } = useAuth();

    const fetchLessonsData = async () => {
        if (!user || user.userType !== 'TEACHER') {
            setError('User not authenticated or not a teacher.');
            setLoading(false);
            return;
        }
        const teacherId = user.id;

        try {
            setLoading(true);
            setError(null);
            const rawLessonsData = await getTeacherLessons(teacherId);

            // Check if it's an array before mapping
            if (!Array.isArray(rawLessonsData)) {
                // If it's not an array, try to find the array if nested (common pattern)
                // Example: Check if data is like { lessons: [...] }
                const lessonsArray = (rawLessonsData as any)?.lessons || (rawLessonsData as any)?.data;

                if (!Array.isArray(lessonsArray)) {
                    console.error('API did not return an array of lessons.', rawLessonsData);
                    throw new Error('Invalid data format received from API. Expected an array of lessons.');
                }
                // If found nested array, use it instead
                const instantiatedLessons = lessonsArray.map(instantiateLessonFromData);
                setLessons(instantiatedLessons);
            } else {
                // If it is an array, proceed as before
                const instantiatedLessons = rawLessonsData.map(instantiateLessonFromData);
                setLessons(instantiatedLessons);
            }

        } catch (err) {
            console.error('Failed to fetch teacher lessons:', err);
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLessonsData();
    }, [user]);

    // Handle lesson status updates
    const handleUpdateStatus = async (lessonId: string, newStatus: LessonStatusValue) => {
        try {
            setUpdatingLessonId(lessonId);
            await updateLessonStatus(lessonId, newStatus);

            // Refresh the lessons after successful update
            await fetchLessonsData();
        } catch (err) {
            console.error('Failed to update lesson status:', err);
            setError(err instanceof Error ? err.message : 'Failed to update lesson status');
        } finally {
            setUpdatingLessonId(null);
        }
    };

    const groupLessonsByStatus = (lessonsToGroup: Lesson[]): Record<LessonStatusValue, Lesson[]> => {
        const grouped: Record<string, Lesson[]> = {
            [LessonStatusValue.REQUESTED]: [],
            [LessonStatusValue.ACCEPTED]: [],
            [LessonStatusValue.COMPLETED]: [],
            [LessonStatusValue.REJECTED]: [],
            [LessonStatusValue.VOIDED]: [],
        };

        lessonsToGroup.forEach(lesson => {
            // Access the status value attached during instantiation
            const statusValue = (lesson as any)._currentStatusValue as LessonStatusValue;

            if (statusValue && grouped[statusValue]) {
                grouped[statusValue].push(lesson);
            } else {
                console.warn(`Lesson ${lesson.id} has missing or invalid status: ${statusValue}`);
            }
        });
        return grouped;
    };

    const groupedLessons = groupLessonsByStatus(lessons);
    const lessonStatuses = Object.values(LessonStatusValue);

    if (loading) return <div className="text-center py-10">Loading lessons...</div>;
    if (error) return <div className="alert alert-error m-4">Error: {error}</div>;

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
            <h1 className="text-2xl font-semibold mb-6">Lessons Dashboard</h1>

            {lessonStatuses.map(status => (
                groupedLessons[status] && groupedLessons[status].length > 0 && (
                    <div key={status} className="mb-8">
                        <h2 className="text-xl font-semibold mb-4 capitalize">{status.toLowerCase()}</h2>
                        <div
                            className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`}
                            role="list"
                            id={`lessons-${status.toLowerCase()}-section`}
                        >
                            {groupedLessons[status].map(lesson => (
                                <TeacherLessonCard
                                    key={lesson.id}
                                    lesson={lesson}
                                    // Pass the correct status value attached during instantiation
                                    currentStatus={(lesson as any)._currentStatusValue}
                                    onUpdateStatus={handleUpdateStatus}
                                    isUpdating={updatingLessonId === lesson.id}
                                />
                            ))}
                        </div>
                    </div>
                )
            ))}

            {lessons.length === 0 && !loading && (
                <div
                    className="text-center py-10 text-gray-500"
                >
                    No lessons found for this teacher.
                </div>
            )}
        </div>
    );
};

export default TeacherLessonsPage; 