import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Lesson } from '@shared/models/Lesson';
import { Goal } from '@shared/models/Goal'; // Import Goal model
import { LessonStatusValue, LessonStatusTransition } from '@shared/models/LessonStatus'; // Import values and transition enum
import { getLessonById, updateLessonStatus } from '@frontend/api/lessonApi'; // Import the actual API calls
import { getGoalsByLessonId } from '@frontend/api/goalApi'; // Import goal fetching API call
import TeacherLessonDetailCard from '@frontend/components/TeacherLessonDetailCard'; // Import detail card
import GoalManager from '@frontend/components/GoalManager'; // Import goal manager
import Button from '@frontend/components/shared/Button/Button';
import { GoalStatusValue } from '@shared/models/GoalStatus'; // Import GoalStatusValue for checking
// import { LoadingSpinner } from '@frontend/components/shared/LoadingSpinner/LoadingSpinner'; // Removed import

const TeacherLessonDetailPage: React.FC = () => {
    const { lessonId } = useParams<{ lessonId: string }>();
    const navigate = useNavigate();

    const [lesson, setLesson] = useState<Lesson | null>(null);
    const [goals, setGoals] = useState<Goal[]>([]); // State for goals
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isSaving, setIsSaving] = useState<boolean>(false); // State for save operation
    const [error, setError] = useState<string | null>(null);

    // Add early return if lessonId is missing (addresses potential type issue)
    useEffect(() => {
        if (!lessonId) {
            setError('Lesson ID is missing from URL.');
            setIsLoading(false);
            return; // Stop effect if no ID
        }

        const fetchLessonData = async () => {
            // Now we know lessonId is a string here
            try {
                setIsLoading(true);
                setError(null);

                // --- Actual API Calls ---
                // Fetch lesson and goals in parallel
                const [fetchedLesson, fetchedGoals] = await Promise.all([
                    getLessonById(lessonId),
                    getGoalsByLessonId(lessonId)
                ]);

                if (!fetchedLesson) {
                    setError(`Lesson with ID ${lessonId} not found or could not be loaded.`);
                    setLesson(null);
                    setGoals([]);
                } else {
                    setLesson(fetchedLesson); // Set state with fetched lesson
                    setGoals(fetchedGoals || []); // Set goals (handle if API returns null/undefined)
                }

            } catch (err) {
                console.error("Error fetching lesson data:", err);
                setError(err instanceof Error ? err.message : 'Failed to load lesson details.');
                setLesson(null); // Clear lesson data on error
                setGoals([]); // Clear goals data on error
            } finally {
                setIsLoading(false);
            }
        };

        fetchLessonData();
    }, [lessonId]);

    // Callback for GoalManager to update goals state
    // Memoize the callback using useCallback to prevent unnecessary re-renders
    const handleGoalsChange = useCallback((updatedGoals: Goal[]) => {
        setGoals(updatedGoals);
    }, [setGoals]); // Dependency array includes setGoals (guaranteed stable)

    const handleSaveAndDefine = async () => {
        if (goals.length === 0) {
            alert("Please add at least one goal before saving."); // Simple validation
            return;
        }
        if (!lessonId || !lesson) return; // Guard against undefined lessonId or lesson data

        // Check if at least one non-abandoned goal exists
        const hasActiveGoal = goals.some(g => g.currentStatus?.status !== GoalStatusValue.ABANDONED);
        if (!hasActiveGoal) {
            alert("Cannot define lesson without at least one active (non-abandoned) goal.");
            return;
        }

        setIsSaving(true);
        setError(null);
        try {
            // --- Actual API Call for Status Update ---
            // Call updateLessonStatus with the correct transition action
            await updateLessonStatus(lessonId, LessonStatusTransition.DEFINE); // Corrected transition
            // --- End API Call ---

            // On success, navigate back or show confirmation
            navigate(-1); // Navigate back

        } catch (err) {
            console.error("Error saving lesson status:", err);
            setError(err instanceof Error ? err.message : 'Failed to save lesson status.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        navigate(-1); // Go back to the previous page
    };

    // Handle case where lessonId is missing even before useEffect runs
    if (!lessonId) {
        return <div className="text-red-500 p-4">Error: Lesson ID is missing from URL.</div>;
    }

    if (isLoading) {
        // Use placeholder text directly
        return (
            <div className="flex items-center justify-center p-4 h-screen">
                <p className="text-lg font-medium text-gray-700 dark:text-gray-300 animate-pulse">
                    Loading...
                </p>
            </div>
        );
    }

    if (error && !isSaving) { // Only show initial load error if not currently saving
        return <div className="text-red-500 p-4">Error: {error}</div>;
    }

    if (!lesson) {
        // This covers the case where lessonId was valid but fetch failed or returned null
        return <div className="p-4">Lesson data could not be loaded. {error || ''}</div>;
    }

    // Now lessonId is guaranteed to be a string when rendering GoalManager
    return (
        <div className="container mx-auto p-4 space-y-6">
            <h1 className="text-2xl font-bold mb-4">Lesson Details & Goals</h1>

            {/* Render TeacherLessonDetailCard */}
            <TeacherLessonDetailCard lesson={lesson} />

            {/* Render GoalManager - lessonId is now guaranteed to be string */}
            <GoalManager
                initialGoals={goals} // Pass initial (likely empty) goals
                lessonId={lessonId}
                onGoalsChange={handleGoalsChange} // Pass callback to update state
            />

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 mt-6">
                <Button variant="secondary" onClick={handleCancel} disabled={isSaving}>
                    Cancel
                </Button>
                <Button
                    variant="primary"
                    onClick={handleSaveAndDefine}
                    disabled={!goals.some(g => g.currentStatus?.status !== GoalStatusValue.ABANDONED) || isSaving}
                >
                    {isSaving ? 'Saving...' : 'Save and Define Lesson'}
                </Button>
            </div>
            {/* Show saving error separately */}
            {error && isSaving && <p className="text-red-500 text-right mt-2">Save Error: {error}</p>}
        </div>
    );
};

export default TeacherLessonDetailPage; 