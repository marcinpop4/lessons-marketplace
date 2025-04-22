import React, { useState, useEffect } from 'react';
import TeacherLessonCard from '../../../components/TeacherLessonCard';
import { Lesson } from '@shared/models/Lesson';
import { LessonStatusValue, LessonStatusTransition, LessonStatus } from '@shared/models/LessonStatus';
import { getTeacherLessons, TeacherLessonApiResponseItem } from '@frontend/api/teacherApi'; // Import API function and response type
import { updateLessonStatus } from '@frontend/api/lessonApi'; // Import the update status function
import { LessonQuote } from '@shared/models/LessonQuote';
import { LessonRequest } from '@shared/models/LessonRequest';
import { Student } from '@shared/models/Student';
import { Teacher } from '@shared/models/Teacher';
import { Address } from '@shared/models/Address';
import { LessonType } from '@shared/models/LessonType'; // Import LessonType enum
import { useAuth } from '@frontend/contexts/AuthContext';

// Interface to hold both lesson model and extra display data
interface LessonDisplayData {
    lesson: Lesson;
    goalCount: number;
}

// Helper function to instantiate models from raw API data
const instantiateLessonFromData = (data: TeacherLessonApiResponseItem): LessonDisplayData | null => {
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
        // Pass instantiated objects
        lessonRequest: lessonRequest,
        teacher: teacher,
        // Omit createdAt, use constructor default
    });

    // Get the full status object from the API data
    const statusData = data.currentStatus;
    if (!statusData || typeof statusData !== 'object' || !statusData.status || !Object.values(LessonStatusValue).includes(statusData.status as LessonStatusValue)) {
        console.warn(`Lesson ${data.id} has missing or invalid status data from API:`, statusData, ". Skipping instantiation.");
        return null; // Indicate failure to instantiate
    }

    // Construct the LessonStatus object
    const lessonStatus = new LessonStatus({
        id: statusData.id,
        lessonId: data.id,
        status: statusData.status as LessonStatusValue,
        context: statusData.context || null, // Assuming context might be included
        createdAt: statusData.createdAt ? new Date(statusData.createdAt) : new Date()
    });

    const lesson = new Lesson({
        id: data.id,
        quote: lessonQuote,
        currentStatusId: lessonStatus.id, // Use ID from constructed status
        currentStatus: lessonStatus // Pass the full LessonStatus object
    });

    // Return the combined object
    return { lesson, goalCount: data.goalCount };
};

const TeacherLessonsPage: React.FC = () => {
    const [lessonsData, setLessonsData] = useState<LessonDisplayData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [updatingLessonId, setUpdatingLessonId] = useState<string | null>(null);
    const { user } = useAuth();
    const [successMessage, setSuccessMessage] = useState<string | null>(null); // State for success message

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

            let lessonsArray: TeacherLessonApiResponseItem[];

            // Check if API returns data nested or directly
            if (!Array.isArray(rawLessonsData)) {
                lessonsArray = (rawLessonsData as any)?.lessons || (rawLessonsData as any)?.data;
                if (!Array.isArray(lessonsArray)) {
                    console.error('API did not return an array of lessons.', rawLessonsData);
                    throw new Error('Invalid data format received from API. Expected an array of lessons.');
                }
            } else {
                lessonsArray = rawLessonsData;
            }

            // Map raw data to LessonDisplayData
            const instantiatedLessonsData = lessonsArray
                .map(instantiateLessonFromData)
                .filter((item): item is LessonDisplayData => item !== null);

            setLessonsData(instantiatedLessonsData); // Update state with the new structure

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

    // Effect to clear success message after a delay
    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => {
                setSuccessMessage(null);
            }, 5000); // Clear after 5 seconds
            return () => clearTimeout(timer); // Cleanup timer on component unmount or if message changes
        }
    }, [successMessage]);

    // Handle lesson status updates
    const handleUpdateStatus = async (lessonId: string, currentStatus: LessonStatusValue, transition: LessonStatusTransition) => {
        // Find the lesson DATA object first
        const lessonDataItem = lessonsData.find(item => item.lesson.id === lessonId);
        const lesson = lessonDataItem?.lesson; // Extract the lesson model
        const studentName = lesson?.quote?.lessonRequest?.student?.fullName || 'the lesson';

        const expectedResultingStatus = LessonStatus.getResultingStatus(currentStatus, transition);
        const newStatusText = expectedResultingStatus
            ? LessonStatus.getDisplayLabelForStatus(expectedResultingStatus)
            : transition.toLowerCase();

        try {
            setUpdatingLessonId(lessonId);
            await updateLessonStatus(lessonId, transition);

            await fetchLessonsData();

            setSuccessMessage(`Successfully updated status for ${studentName} to ${newStatusText}.`);
            setError(null);
        } catch (err) {
            console.error('Failed to update lesson status:', err);
            const apiError = err instanceof Error ? err.message : 'Failed to update lesson status';
            setError(`Error transitioning lesson to ${newStatusText}: ${apiError}`);
            setSuccessMessage(null);
        } finally {
            setUpdatingLessonId(null);
        }
    };

    // Update grouping function to work with LessonDisplayData
    const groupLessonsByStatus = (dataToGroup: LessonDisplayData[]): Record<LessonStatusValue, LessonDisplayData[]> => {
        const grouped: Record<string, LessonDisplayData[]> = {
            [LessonStatusValue.REQUESTED]: [],
            [LessonStatusValue.ACCEPTED]: [],
            [LessonStatusValue.DEFINED]: [],
            [LessonStatusValue.COMPLETED]: [],
            [LessonStatusValue.REJECTED]: [],
            [LessonStatusValue.VOIDED]: [],
        };

        dataToGroup.forEach(item => {
            // Access the status value *from* the lesson object within the item
            const statusValue = item.lesson.currentStatus?.status;
            if (statusValue && Object.prototype.hasOwnProperty.call(grouped, statusValue)) {
                grouped[statusValue].push(item);
            }
        });

        return grouped as Record<LessonStatusValue, LessonDisplayData[]>;
    };

    const groupedLessons = groupLessonsByStatus(lessonsData);
    const allLessonStatuses = Object.values(LessonStatusValue);

    if (loading) return <div className="text-center py-10">Loading lessons...</div>;
    if (error) return <div className="alert alert-error m-4">Error: {error}</div>;

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
            {/* Success Message Area */}
            {successMessage && (
                <div
                    className="alert alert-success mb-4 shadow-lg"
                    role="alert"
                    id="success-message-banner" // Added ID for testing
                >
                    <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span>{successMessage}</span>
                    </div>
                </div>
            )}
            {/* End Success Message Area */}

            <h1 className="text-2xl font-semibold mb-6">Lessons Dashboard</h1>

            {/* Map through all possible status values from the enum */}
            {allLessonStatuses.map(status => (
                // Always render the section container and header
                <div key={status} className="mb-8">
                    {/* Use utility function for display header */}
                    <h2 className="text-xl font-semibold mb-4 capitalize">{LessonStatus.getDisplayLabelForStatus(status)}</h2>
                    {/* Conditionally render lessons or placeholder */}
                    {groupedLessons[status] && groupedLessons[status].length > 0 ? (
                        <div
                            className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`}
                            role="list"
                            id={`lessons-${status.toLowerCase()}-section`}
                        >
                            {groupedLessons[status].map(item => (
                                <TeacherLessonCard
                                    key={item.lesson.id}
                                    lesson={item.lesson}
                                    goalCount={item.goalCount}
                                    currentStatus={item.lesson.currentStatus.status}
                                    onUpdateStatus={handleUpdateStatus}
                                    isUpdating={updatingLessonId === item.lesson.id}
                                />
                            ))}
                        </div>
                    ) : (
                        // Placeholder text when no lessons in this status
                        // Use utility function for placeholder text
                        <p className="text-sm text-gray-500 italic px-1">
                            No lessons with status '{LessonStatus.getDisplayLabelForStatus(status)}'.
                        </p>
                    )}
                </div>
            ))}

            {/* Overall empty state if no lessons at all */}
            {lessonsData.length === 0 && !loading && (
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