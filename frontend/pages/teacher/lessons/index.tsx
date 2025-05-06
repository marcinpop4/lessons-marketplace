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
import { LessonQuoteStatus, LessonQuoteStatusValue } from '@shared/models/LessonQuoteStatus';

// Interface to hold both lesson model and extra display data
interface LessonDisplayData {
    lesson: Lesson;
}

// Helper function to instantiate models from the API data structure
const instantiateLessonFromData = (data: TeacherLessonApiResponseItem): LessonDisplayData | null => {
    try {
        // Access nested data structures according to TeacherLessonApiResponseItem
        const quoteData = data.quote;
        const lessonRequestData = quoteData?.lessonRequest;
        const studentData = lessonRequestData?.student;
        const teacherData = quoteData?.teacher;
        const addressData = lessonRequestData?.address;
        const lessonStatusData = data.currentStatus;

        // Add null checks for potentially missing nested data
        if (!quoteData || !lessonRequestData || !studentData || !teacherData || !addressData || !lessonStatusData) {
            console.error(`Incomplete data for lesson ID ${data.id}. Skipping instantiation.`, data);
            return null;
        }

        const student = new Student({
            id: studentData.id,
            firstName: studentData.firstName,
            lastName: studentData.lastName,
            email: studentData.email, // Expecting email on student data from API now
            phoneNumber: '', // Provide defaults if not present
            dateOfBirth: new Date(0) // Provide defaults if not present
        });

        const teacher = new Teacher({
            id: teacherData.id,
            firstName: teacherData.firstName,
            lastName: teacherData.lastName,
            email: teacherData.email,
            phoneNumber: '', // Provide defaults if not present
            dateOfBirth: new Date(0) // Provide defaults if not present
        });

        const address = new Address({
            id: addressData.id, // Expecting address ID
            street: addressData.street,
            city: addressData.city,
            state: addressData.state,
            postalCode: addressData.postalCode,
            country: addressData.country
        });

        const lessonRequest = new LessonRequest({
            id: lessonRequestData.id,
            type: lessonRequestData.type as LessonType,
            startTime: new Date(lessonRequestData.startTime),
            durationMinutes: lessonRequestData.durationMinutes,
            address: address,
            student: student,
            createdAt: lessonRequestData.createdAt ? new Date(lessonRequestData.createdAt) : undefined,
            updatedAt: lessonRequestData.updatedAt ? new Date(lessonRequestData.updatedAt) : undefined
        });

        // Reconstruct LessonQuoteStatus if quote status exists - THIS LOGIC MIGHT BE IRRELEVANT NOW
        // If the API for fetching lessons doesn't include quote's status details, this should be null.
        // Let's assume it's not included based on the previous error.
        const quoteCurrentStatusModel = null;
        /* quoteStatusData // Keep commented out unless API confirms quote status is provided here
        ? new LessonQuoteStatus({
            id: quoteStatusData.id,
            lessonQuoteId: quoteData.id,
            status: quoteStatusData.status as LessonQuoteStatusValue,
            context: quoteStatusData.context || null,
            createdAt: quoteStatusData.createdAt ? new Date(quoteStatusData.createdAt) : new Date()
        })
        : null; */

        const lessonQuote = new LessonQuote({
            id: quoteData.id,
            costInCents: quoteData.costInCents,
            hourlyRateInCents: quoteData.hourlyRateInCents,
            lessonRequest: lessonRequest,
            teacher: teacher,
            currentStatus: quoteCurrentStatusModel, // Pass mapped status object if available (now likely null)
            currentStatusId: null, // Explicitly pass null as required by LessonQuoteProps
            createdAt: quoteData.createdAt ? new Date(quoteData.createdAt) : undefined,
            updatedAt: quoteData.updatedAt ? new Date(quoteData.updatedAt) : undefined
        });

        // Construct LessonStatus for the lesson itself
        const lessonStatus = new LessonStatus({
            id: lessonStatusData.id,
            lessonId: data.id,
            status: lessonStatusData.status as LessonStatusValue,
            context: lessonStatusData.context || null, // Include context if available
            createdAt: lessonStatusData.createdAt ? new Date(lessonStatusData.createdAt) : new Date()
        });

        // Construct the final Lesson model
        const lesson = new Lesson({
            id: data.id,
            quote: lessonQuote,
            currentStatus: lessonStatus,
            createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
            updatedAt: data.updatedAt ? new Date(data.updatedAt) : undefined
        });

        // Return the combined object for display
        return { lesson };

    } catch (instantiationError) {
        console.error(`Error instantiating lesson data for ID ${data?.id}:`, instantiationError, "Data:", data);
        return null; // Return null if any part of the instantiation fails
    }
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
                                    currentStatus={item.lesson.currentStatus?.status || LessonStatusValue.ACCEPTED}
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