import React, { useState, useEffect } from 'react';
import TeacherLessonCard from '../../../components/TeacherLessonCard';
import { Lesson } from '@shared/models/Lesson';
import { LessonStatusValue, LessonStatusTransition, LessonStatus } from '@shared/models/LessonStatus';
import { fetchTeacherLessons, updateLessonStatus, FullLessonDetailsForTeacher } from '@frontend/api/lessonApi'; // Corrected API imports
import { LessonQuote } from '@shared/models/LessonQuote';
import { LessonRequest } from '@shared/models/LessonRequest';
import { Student } from '@shared/models/Student';
import { Teacher } from '@shared/models/Teacher';
import { Address } from '@shared/models/Address';
import { LessonType, formatDisplayLabel } from '@shared/models/LessonType'; // formatDisplayLabel was missing
import { useAuth } from '@frontend/contexts/AuthContext'; // Corrected useAuth import
import { LessonQuoteStatus, LessonQuoteStatusValue } from '@shared/models/LessonQuoteStatus';
import { LessonSummaryModal } from '@frontend/components/TeacherLessonCard';
import { createLessonSummary, CreateLessonSummaryDto } from '@frontend/api/lessonSummaryApi'; // <-- Import createLessonSummary
import { UserType } from '@shared/models/UserType';

// Interface to hold both lesson model and extra display data
export interface LessonDisplayData {
    lesson: Lesson;
    // Add any other display-specific properties if needed in the future
}

// Helper function to instantiate models from the API data structure
const instantiateLessonFromData = (data: FullLessonDetailsForTeacher): LessonDisplayData | null => {
    try {
        const quoteData = data.quote;
        const lessonRequestData = quoteData?.lessonRequest;
        const studentData = lessonRequestData?.student;
        const teacherData = quoteData?.teacher;
        const addressData = lessonRequestData?.address;

        if (!quoteData || !lessonRequestData || !studentData || !teacherData || !addressData) {
            console.warn('Skipping lesson due to incomplete data:', data);
            return null;
        }

        const student = new Student(studentData);
        const address = new Address(addressData);
        const teacher = new Teacher(teacherData);

        const lessonRequest = new LessonRequest({
            ...lessonRequestData,
            student,
            address,
            startTime: new Date(lessonRequestData.startTime), // Main startTime is string, convert here
            createdAt: lessonRequestData.createdAt ? new Date(lessonRequestData.createdAt) : undefined,
            updatedAt: lessonRequestData.updatedAt ? new Date(lessonRequestData.updatedAt) : undefined,
        });

        const lessonQuote = new LessonQuote({
            ...quoteData,
            lessonRequest,
            teacher,
            currentStatus: quoteData.currentStatus ? new LessonQuoteStatus(quoteData.currentStatus) : null,
            createdAt: quoteData.createdAt ? new Date(quoteData.createdAt) : undefined,
            updatedAt: quoteData.updatedAt ? new Date(quoteData.updatedAt) : undefined,
        });

        const lessonStatus = data.currentStatus ? new LessonStatus({
            ...data.currentStatus,
            status: data.currentStatus.status as LessonStatusValue,
            createdAt: data.currentStatus.createdAt ? new Date(data.currentStatus.createdAt) : undefined,
        }) : null;

        const lesson = new Lesson({
            id: data.id,
            quote: lessonQuote,
            currentStatus: lessonStatus,
            statuses: data.statuses?.map(s => new LessonStatus({
                ...s,
                status: s.status as LessonStatusValue,
                createdAt: s.createdAt ? new Date(s.createdAt) : undefined
            })) || [],
            lessonSummary: data.lessonSummary || null,
            createdAt: data.createdAt ? new Date(data.createdAt) : undefined, // data.createdAt is from FullLessonDetailsForTeacher
            updatedAt: data.updatedAt ? new Date(data.updatedAt) : undefined, // data.updatedAt is from FullLessonDetailsForTeacher
        });

        return { lesson };

    } catch (e) {
        console.error('Error instantiating lesson from API data:', e, data);
        return null;
    }
};

const TeacherLessonsPage: React.FC = () => {
    const [lessonsData, setLessonsData] = useState<LessonDisplayData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [updatingLessonId, setUpdatingLessonId] = useState<string | null>(null);
    const { user } = useAuth();
    const [successMessage, setSuccessMessage] = useState<string | null>(null); // State for success message

    // --- New State for Summary Modal ---
    const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
    const [summaryModalLessonId, setSummaryModalLessonId] = useState<string | null>(null);
    const [summaryModalLessonTitle, setSummaryModalLessonTitle] = useState<string>('');
    const [summaryModalError, setSummaryModalError] = useState<string | null>(null); // <-- New state for modal error
    // --- End New State for Summary Modal ---

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
            const rawLessonsData: FullLessonDetailsForTeacher[] = await fetchTeacherLessons(teacherId);

            let lessonsArray: FullLessonDetailsForTeacher[];

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

    // --- New Handlers for Summary Modal ---
    const handleOpenSummaryModal = (lessonId: string, lessonTitle: string) => {
        setSummaryModalLessonId(lessonId);
        setSummaryModalLessonTitle(lessonTitle);
        setSummaryModalError(null); // Clear previous errors
        setIsSummaryModalOpen(true);
    };

    const handleCloseSummaryModal = () => {
        setIsSummaryModalOpen(false);
        setSummaryModalLessonId(null);
        setSummaryModalLessonTitle('');
        setSummaryModalError(null); // Clear errors on close
    };

    const handleConfirmSummary = async (summary: string, homework: string) => {
        if (!summaryModalLessonId) {
            console.error('No lesson ID found for summary creation.');
            setSummaryModalError('Could not create summary: Lesson ID missing.'); // Set modal error
            // setError('Could not create summary: Lesson ID missing.'); // Remove page-level error
            return;
        }
        setSummaryModalError(null); // Clear previous error before new attempt

        const summaryData: CreateLessonSummaryDto = {
            lessonId: summaryModalLessonId,
            summary,
            homework,
        };

        try {
            setUpdatingLessonId(summaryModalLessonId); // Indicate loading state for this lesson
            await createLessonSummary(summaryData);
            setSuccessMessage(`Summary for '${summaryModalLessonTitle}' saved successfully.`);
            await fetchLessonsData();
            handleCloseSummaryModal(); // Close modal on success
        } catch (err) {
            console.error('Failed to save lesson summary:', err);
            const apiError = err instanceof Error ? err.message : 'Failed to save summary';
            // setError(`Error saving summary for '${summaryModalLessonTitle}': ${apiError}`); // Remove page-level error
            setSummaryModalError(apiError); // Set modal-specific error
            setSuccessMessage(null); // Clear success message if error occurred
        } finally {
            setUpdatingLessonId(null);
            // Don't close modal automatically on error, so user can see the message
            // handleCloseSummaryModal(); 
        }
    };
    // --- End New Handlers for Summary Modal ---

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

    // Placeholder for cancel functionality
    const handleCancelLesson = async (lessonId: string) => {
        console.log(`Request to cancel lesson: ${lessonId}`);
        // Here you would typically call an API endpoint to void or cancel the lesson
        // For example: await voidLesson(lessonId);
        // Then refresh data: await fetchLessonsData();
        // And show a message: setSuccessMessage('Lesson cancelled.');
        alert('Cancel functionality not fully implemented yet.');
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
                                    onOpenSummaryModal={handleOpenSummaryModal}
                                    onCancel={handleCancelLesson}
                                    currentUser={user ? { ...user, userType: user.userType as UserType } : null}
                                    onUpdateStatus={handleUpdateStatus}
                                    isUpdating={updatingLessonId === item.lesson.id}
                                />
                            ))}
                        </div>
                    ) : (
                        // Placeholder text when no lessons in this status
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

            {/* Render the Lesson Summary Modal */}
            <LessonSummaryModal
                isOpen={isSummaryModalOpen}
                onClose={handleCloseSummaryModal}
                onConfirm={handleConfirmSummary}
                lessonTitle={summaryModalLessonTitle}
                error={summaryModalError} // <-- Pass modal error
            />
        </div>
    );
};

export default TeacherLessonsPage; 