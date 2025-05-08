import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Lesson } from '@shared/models/Lesson.js';
import { getLessonById } from '@frontend/api/lessonApi';
import {
    createFullLessonPlanSequentially,
    FullLessonPlanSequencePayload,
    fetchAiLessonPlanRecommendationsStream
} from '@frontend/api/lessonPlanApi';
import axios from 'axios';
import { AiGeneratedLessonPlan, AiPlannedLesson, AiMilestone } from '@shared/models/AiGeneratedLessonPlan.js';

import LessonPlanDetailsForm from '@frontend/components/features/lesson-plan/LessonPlanDetailsForm';
import MilestonesSection from '@frontend/components/features/lesson-plan/MilestonesSection';
import { UIMilestone, UIPlannedLesson } from '@frontend/components/features/lesson-plan/MilestoneForm';
import Button from '@frontend/components/shared/Button/Button';

// Sleep utility
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Scroll utility
const scrollToElement = async (elementId: string, delay: number = 0) => {
    await sleep(delay);
    const element = document.getElementById(elementId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Optionally, add a brief focus effect if it's an input
        // if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        //     element.focus({ preventScroll: true }); 
        // }
    } else {
        console.warn(`[UI Scroll] Element with ID '${elementId}' not found.`);
    }
};

// Helper function to parse AI startTime into date and time parts
const parseAiStartTime = (startTime: string): { selectedDate: string, selectedTime: string } => {
    console.log(`[UI Parse Helper] Attempting to parse startTime: "${startTime}"`);
    try {
        // Attempt to parse as ISO or common format like "YYYY-MM-DD HH:MM"
        const dateObj = new Date(startTime.replace(' ', 'T')); // Handle space separator
        if (isNaN(dateObj.getTime())) {
            console.error(`[UI Parse Helper] Invalid AI startTime format after parsing: "${startTime}"`);
            return { selectedDate: '', selectedTime: '' };
        }

        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
        const day = String(dateObj.getDate()).padStart(2, '0');
        const hours = String(dateObj.getHours()).padStart(2, '0');
        const minutes = String(dateObj.getMinutes()).padStart(2, '0');

        const result = {
            selectedDate: `${year}-${month}-${day}`,
            selectedTime: `${hours}:${minutes}`,
        };
        console.log(`[UI Parse Helper] Successfully parsed "${startTime}" into:`, result);
        return result;
    } catch (e) {
        console.error(`[UI Parse Helper] Error during parsing AI startTime: ${startTime}`, e);
        return { selectedDate: '', selectedTime: '' };
    }
};

// Helper function to parse AI duration (e.g., "30 minutes") to number
// Currently, the AiPlannedLesson interface expects durationMinutes as number directly,
// but if the LLM returns a string, this helper would be needed.
// const parseAiDuration = (durationStr: string): number => {
//     const match = durationStr.match(/\d+/);
//     return match ? parseInt(match[0], 10) : 60; // Default to 60 if parsing fails
// };

const CreateLessonPlanPage: React.FC = () => {
    const { lessonId } = useParams<{ lessonId: string }>();
    const navigate = useNavigate();

    const [sourceLesson, setSourceLesson] = useState<Lesson | null>(null);

    const [lessonPlanTitle, setLessonPlanTitle] = useState('');
    const [lessonPlanDescription, setLessonPlanDescription] = useState('');
    const [lessonPlanDueDate, setLessonPlanDueDate] = useState<string>('');

    const [milestones, setMilestones] = useState<UIMilestone[]>([]);

    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // State for AI recommendations
    const [aiRecommendations, setAiRecommendations] = useState<AiGeneratedLessonPlan[]>([]);
    const [isStreamingRecommendations, setIsStreamingRecommendations] = useState<boolean>(false);
    const [recommendationError, setRecommendationError] = useState<string | null>(null);
    const eventSourceRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        if (!lessonId) {
            setError('No lesson ID provided to create a plan for.');
            setIsLoading(false);
            return;
        }

        const fetchSourceLesson = async () => {
            setIsLoading(true);
            try {
                const lesson = await getLessonById(lessonId);
                if (lesson) {
                    setSourceLesson(lesson);
                    const studentName = lesson.quote.lessonRequest.student?.fullName || 'Student';
                    const lessonTypeDisplay = lesson.quote.lessonRequest.type;
                    setLessonPlanTitle(`Plan for ${lessonTypeDisplay} with ${studentName}`);
                } else {
                    setError(`Could not load details for lesson ID: ${lessonId}`);
                }
            } catch (err) {
                console.error("Error fetching source lesson:", err);
                setError(err instanceof Error ? err.message : 'Failed to load source lesson details.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchSourceLesson();

        // Cleanup function to close EventSource if component unmounts during streaming
        return () => {
            eventSourceRef.current?.();
        };
    }, [lessonId]);

    const handleAddMilestone = () => {
        setMilestones([...milestones, {
            id: `temp-milestone-${Date.now()}`,
            title: '',
            description: '',
            dueDate: '',
            lessons: []
        }]);
    };

    const handleMilestoneChange = useCallback((milestoneId: string, field: keyof UIMilestone, value: any) => {
        setMilestones(prevMilestones =>
            prevMilestones.map(m =>
                m.id === milestoneId ? { ...m, [field]: value } : m
            )
        );
    }, []);

    const handleRemoveMilestone = useCallback((milestoneId: string) => {
        setMilestones(prevMilestones => prevMilestones.filter(m => m.id !== milestoneId));
    }, []);

    const handleAddPlannedLesson = useCallback((milestoneId: string) => {
        setMilestones(prevMilestones =>
            prevMilestones.map(m => {
                if (m.id === milestoneId) {
                    // Update UIPlannedLesson initialization
                    const newPlannedLesson: UIPlannedLesson = {
                        id: `temp-lesson-${Date.now()}`,
                        selectedDate: '', // Initialize date
                        selectedTime: '', // Initialize time
                        durationMinutes: 60 // Default duration to 60 mins (or other sensible default)
                    };
                    return { ...m, lessons: [...m.lessons, newPlannedLesson] };
                }
                return m;
            })
        );
    }, []);

    // Updated handler signature and logic
    const handlePlannedLessonChange = useCallback((milestoneId: string, plannedLessonId: string, field: keyof UIPlannedLesson, value: string | number) => {
        setMilestones(prevMilestones =>
            prevMilestones.map(m => {
                if (m.id === milestoneId) {
                    const updatedLessons = m.lessons.map(l => {
                        if (l.id === plannedLessonId) {
                            // Ensure durationMinutes is stored as number
                            const processedValue = field === 'durationMinutes' ? Number(value) || 0 : value;
                            return { ...l, [field]: processedValue };
                        }
                        return l;
                    });
                    return { ...m, lessons: updatedLessons };
                }
                return m;
            })
        );
    }, []);

    const handleRemovePlannedLesson = useCallback((milestoneId: string, plannedLessonId: string) => {
        setMilestones(prevMilestones =>
            prevMilestones.map(m => {
                if (m.id === milestoneId) {
                    const filteredLessons = m.lessons.filter(l => l.id !== plannedLessonId);
                    return { ...m, lessons: filteredLessons };
                }
                return m;
            })
        );
    }, []);

    const handleGenerateAiPlan = useCallback(() => {
        if (!sourceLesson?.id) {
            setRecommendationError('Cannot generate recommendations without a valid source lesson ID.');
            return;
        }
        if (isStreamingRecommendations) return;

        console.log('[UI] Starting AI plan generation...');
        setIsStreamingRecommendations(true);
        setAiRecommendations([]);
        setRecommendationError(null);

        // Close previous connection if any
        eventSourceRef.current?.();

        // Call the EventSource-based stream function
        const closeStream = fetchAiLessonPlanRecommendationsStream(
            sourceLesson.id,
            (plan) => {
                console.log('[UI] Received AI plan recommendation:', plan);
                setAiRecommendations(prev => [...prev, plan]);
            },
            (error) => {
                console.error('[UI] AI stream error:', error);
                // Handle string or Event error object
                const message = (typeof error === 'string')
                    ? error
                    : (error instanceof Event ? 'SSE connection error' : 'An unknown stream error occurred');
                // Don't set error if it was an abort - not applicable to EventSource like fetch AbortError
                setRecommendationError(message);
                setIsStreamingRecommendations(false);
                eventSourceRef.current = null;
            },
            () => {
                console.log('[UI] AI stream completed.');
                setIsStreamingRecommendations(false);
                eventSourceRef.current = null;
            }
        );
        // Store the close function provided by the API function
        eventSourceRef.current = closeStream;

    }, [sourceLesson?.id, isStreamingRecommendations]);

    const handleApplyRecommendation = useCallback(async (plan: AiGeneratedLessonPlan) => {
        console.log('[UI] Applying AI recommendation:', plan);
        const applyDelay = 300; // Milliseconds for noticeable delay - SLIGHTLY INCREASED
        const scrollDelay = 50; // Small delay before scrolling to ensure element might be rendered

        // Set objective details
        setLessonPlanTitle('');
        await scrollToElement('lesson-plan-title-input', scrollDelay);
        await sleep(applyDelay / 4);
        setLessonPlanTitle(plan.objective.title);

        setLessonPlanDescription('');
        await scrollToElement('lesson-plan-description-input', scrollDelay);
        await sleep(applyDelay / 2);
        setLessonPlanDescription(plan.objective.description);

        setLessonPlanDueDate('');
        await scrollToElement('lesson-plan-due-date-input', scrollDelay);
        await sleep(applyDelay / 2);
        setLessonPlanDueDate(plan.objective.dueDate);
        await sleep(applyDelay);

        const newUiMilestones: UIMilestone[] = [];
        setMilestones([]);
        await sleep(applyDelay / 2);

        for (const [mIndex, aiMilestone] of plan.milestones.entries()) {
            const tempMilestoneId = `applied-milestone-${Date.now()}-${mIndex}`;
            // ID for the milestone's main wrapper element, assuming it's set in MilestoneForm/MilestonesSection
            const milestoneScrollTargetId = `milestone-form-${tempMilestoneId}`;
            const milestoneTitleId = `milestone-title-input-${tempMilestoneId}`;
            const milestoneDescriptionId = `milestone-description-input-${tempMilestoneId}`;
            const milestoneDueDateId = `milestone-due-date-input-${tempMilestoneId}`;

            const milestoneShell: UIMilestone = {
                id: tempMilestoneId, // This ID is used to generate milestoneScrollTargetId
                title: '',
                description: '',
                dueDate: '',
                lessons: []
            };
            newUiMilestones.push(milestoneShell);
            setMilestones([...newUiMilestones]);
            // INCREASED DELAY HERE before scrolling to the newly added milestone shell
            await sleep(applyDelay / 2 + scrollDelay); // Wait for React to render the new milestone
            await scrollToElement(milestoneScrollTargetId, 0); // Scroll to new milestone shell (scrollDelay handled above)
            // No additional sleep here, as the next step is populating its title

            // Populate title
            newUiMilestones[mIndex].title = aiMilestone.title;
            setMilestones([...newUiMilestones]);
            await scrollToElement(milestoneTitleId, scrollDelay); // Scroll to title input
            await sleep(applyDelay);

            // Populate description
            newUiMilestones[mIndex].description = aiMilestone.description;
            setMilestones([...newUiMilestones]);
            await scrollToElement(milestoneDescriptionId, scrollDelay);
            await sleep(applyDelay);

            // Populate dueDate
            newUiMilestones[mIndex].dueDate = aiMilestone.dueDate;
            setMilestones([...newUiMilestones]);
            await scrollToElement(milestoneDueDateId, scrollDelay);
            await sleep(applyDelay);

            const uiPlannedLessons: UIPlannedLesson[] = [];
            for (const [lIndex, aiLesson] of aiMilestone.lessons.entries()) {
                const tempLessonId = `applied-lesson-${Date.now()}-${mIndex}-${lIndex}`;
                // ID for the lesson's main wrapper, assuming it's set in the lesson form component
                const lessonScrollTargetId = `lesson-form-${tempMilestoneId}-${tempLessonId}`;
                const lessonDateId = `lesson-date-input-${tempMilestoneId}-${tempLessonId}`;
                const lessonTimeId = `lesson-time-input-${tempMilestoneId}-${tempLessonId}`;
                const lessonDurationId = `lesson-duration-input-${tempMilestoneId}-${tempLessonId}`;

                const { selectedDate, selectedTime } = parseAiStartTime(aiLesson.startTime);
                const durationMinutes = typeof aiLesson.durationMinutes === 'number'
                    ? aiLesson.durationMinutes
                    : parseInt(String(aiLesson.durationMinutes), 10) || 60;

                console.log(`[UI Apply Lesson ${mIndex}-${lIndex}] Date: ${selectedDate}, Time: ${selectedTime}, Duration: ${durationMinutes}`);

                const lessonShell: UIPlannedLesson = {
                    id: tempLessonId,
                    selectedDate: '',
                    selectedTime: '',
                    durationMinutes: 0
                };
                uiPlannedLessons.push(lessonShell);
                newUiMilestones[mIndex].lessons = [...uiPlannedLessons];
                setMilestones([...newUiMilestones]);
                await scrollToElement(lessonScrollTargetId, scrollDelay); // Scroll to new lesson shell
                await sleep(applyDelay / 4);

                uiPlannedLessons[lIndex].selectedDate = selectedDate;
                setMilestones([...newUiMilestones]);
                await scrollToElement(lessonDateId, scrollDelay);
                await sleep(applyDelay / 4);

                uiPlannedLessons[lIndex].selectedTime = selectedTime;
                setMilestones([...newUiMilestones]);
                await scrollToElement(lessonTimeId, scrollDelay);
                await sleep(applyDelay / 4);

                uiPlannedLessons[lIndex].durationMinutes = durationMinutes;
                newUiMilestones[mIndex].lessons = [...uiPlannedLessons];
                setMilestones([...newUiMilestones]);
                await scrollToElement(lessonDurationId, scrollDelay);
                await sleep(applyDelay / 2);
            }
            await sleep(applyDelay);
        }

        console.log('[UI] Finished applying AI recommendation.');
    }, [setLessonPlanTitle, setLessonPlanDescription, setLessonPlanDueDate, setMilestones]);

    const handleSaveLessonPlan = async () => {
        setIsSaving(true);
        setError(null);

        if (!sourceLesson) {
            setError('Source lesson details are not loaded. Cannot save plan.');
            setIsSaving(false);
            return;
        }

        try {
            // Frontend validation (remains in component)
            for (const milestone of milestones) {
                if (!milestone.title || !milestone.description || !milestone.dueDate) {
                    throw new Error(`Milestone "${milestone.title || 'Unnamed'}" is missing required fields (title, description, due date).`);
                }
                for (const lesson of milestone.lessons) {
                    if (!lesson.selectedDate || !lesson.selectedTime || !lesson.durationMinutes) {
                        throw new Error(`A planned lesson in milestone "${milestone.title}" is missing Date, Time, or Duration.`);
                    }
                    if (isNaN(Number(lesson.durationMinutes)) || Number(lesson.durationMinutes) <= 0) {
                        throw new Error(`Invalid duration "${lesson.durationMinutes}" for a planned lesson in milestone "${milestone.title}". Must be a positive number.`);
                    }
                    // combineDateTime is now internal to the API function, but this check is still good
                    const tempCombinedTime = `${lesson.selectedDate}T${lesson.selectedTime}:00`;
                    if (!lesson.selectedDate || !lesson.selectedTime || isNaN(new Date(tempCombinedTime).getTime())) {
                        throw new Error(`Invalid date/time combination for a planned lesson in milestone "${milestone.title}".`);
                    }
                }
            }

            // Construct the payload for the API function
            const apiPayload: FullLessonPlanSequencePayload = {
                lessonPlanTitle,
                lessonPlanDescription,
                lessonPlanDueDate: lessonPlanDueDate || null,
                sourceLessonId: sourceLesson.id,
                milestones: milestones.map(m => ({
                    title: m.title,
                    description: m.description,
                    dueDate: m.dueDate,
                    lessons: m.lessons.map(l => ({
                        selectedDate: l.selectedDate,
                        selectedTime: l.selectedTime,
                        durationMinutes: l.durationMinutes,
                    })),
                })),
            };

            console.log('[UI Save] Payload being sent to createFullLessonPlanSequentially:', JSON.stringify(apiPayload, null, 2));

            console.log('Page: Calling createFullLessonPlanSequentially with payload:', apiPayload);
            await createFullLessonPlanSequentially(apiPayload);
            console.log('Page: Lesson Plan and all components created successfully!');

            alert('Lesson Plan and all components created successfully!');
            navigate('/teacher/lessons');

        } catch (err) {
            console.error("Page: Error saving lesson plan:", err);
            const message = (err instanceof Error) ? err.message : 'Failed to save lesson plan. Please check details and try again.';
            if (axios.isAxiosError(err)) {
                const serverError = (err.response?.data as { error?: string })?.error;
                setError(serverError ? `Server Error: ${serverError} (${message})` : message);
            } else {
                setError(message);
            }
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <div className="text-center py-10">Loading lesson context...</div>;
    }

    if (error && !isSaving) {
        return <div className="text-red-500 p-4">Error: {error}</div>;
    }

    if (!sourceLesson && !isLoading) {
        return <div className="text-red-500 p-4">Could not load base lesson details to create a plan. {error}</div>
    }

    return (
        <div className="container mx-auto p-4 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">
                    Create Lesson Plan for: {sourceLesson?.quote.lessonRequest.type} with {sourceLesson?.quote.lessonRequest.student?.fullName}
                </h1>
                <Button onClick={() => navigate(-1)} variant="secondary" disabled={isSaving}>Back</Button>
            </div>

            <LessonPlanDetailsForm
                title={lessonPlanTitle}
                onTitleChange={setLessonPlanTitle}
                description={lessonPlanDescription}
                onDescriptionChange={setLessonPlanDescription}
                dueDate={lessonPlanDueDate}
                onDueDateChange={setLessonPlanDueDate}
            />

            <MilestonesSection
                milestones={milestones}
                lessonType={sourceLesson?.quote.lessonRequest.type} // Pass lessonType
                onAddMilestone={handleAddMilestone}
                onMilestoneChange={handleMilestoneChange}
                onRemoveMilestone={handleRemoveMilestone}
                onAddPlannedLesson={handleAddPlannedLesson}
                onPlannedLessonChange={handlePlannedLessonChange}
                onRemovePlannedLesson={handleRemovePlannedLesson}
            />

            <div className="flex justify-end mt-8 space-x-3">
                <Button
                    onClick={() => navigate(-1)}
                    variant="secondary"
                    disabled={isSaving}
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleSaveLessonPlan}
                    disabled={isSaving || !lessonPlanTitle || !lessonPlanDescription || milestones.some(m => !m.title || !m.description || !m.dueDate)}
                    variant="primary"
                >
                    {isSaving ? 'Saving...' : 'Save Lesson Plan'}
                </Button>
            </div>

            {/* AI Generation Section */}
            <div className="bg-blue-50 p-4 rounded-md border border-blue-200 space-y-3">
                <h2 className="text-lg font-semibold text-blue-800">Lesson Plan AI Assistant</h2>
                <Button
                    onClick={handleGenerateAiPlan}
                    disabled={isStreamingRecommendations || !sourceLesson?.id}
                    variant="secondary"
                >
                    {isStreamingRecommendations ? 'Generating...' : 'Generate Plan with AI'}
                </Button>
                {isStreamingRecommendations && <p className="text-blue-600">Streaming recommendations...</p>}
                {recommendationError && <p className="text-red-600">Error: {recommendationError}</p>}
                {aiRecommendations.length > 0 && (
                    <div className="mt-4 space-y-2">
                        <h3 className="font-medium text-blue-700">Select a generated plan to pre-fill the form:</h3>
                        {aiRecommendations.map((plan, index) => (
                            <div
                                key={index}
                                className="p-3 border rounded cursor-pointer hover:bg-blue-100 border-blue-300"
                                onClick={() => handleApplyRecommendation(plan)}
                            >
                                <p className="font-semibold">Option {index + 1}: {plan.objective.title}</p>
                                {/* Add more summary details if desired */}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {error && <p className="text-red-500 text-sm mt-2 text-right">Error: {error}</p>}
        </div>
    );
};

export default CreateLessonPlanPage; 