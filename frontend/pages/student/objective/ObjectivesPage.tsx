import React, { useState, useEffect, useRef } from 'react';
import { Objective } from '@shared/models/Objective';
import { ObjectiveStatus, ObjectiveStatusValue } from '@shared/models/ObjectiveStatus'; // Import ObjectiveStatus class
import StudentObjective from '../../../components/student/objective/StudentObjective';
import AddObjectiveForm from '../../../components/student/objective/AddObjectiveForm'; // Import the new form
import { ObjectiveRecommendation } from '@shared/models/ObjectiveRecommendation.js'; // Import recommendation type
import { LessonType } from '@shared/models/LessonType.js'; // Import LessonType for filtering
import { useAuth } from '../../../contexts/AuthContext'; // Import useAuth
import logger from '@frontend/utils/logger';

// Define the structure for grouped objectives
type GroupedObjectives = { [key in ObjectiveStatusValue]?: Objective[] };

const ObjectivesPage: React.FC = () => {
    // Get auth context
    const { user } = useAuth();

    // Keep the original flat list for fetching
    // const [objectives, setObjectives] = useState<Objective[]>([]); 
    // State to hold grouped objectives
    const [groupedObjectives, setGroupedObjectives] = useState<GroupedObjectives>({});
    const [loading, setLoading] = useState<boolean>(true);
    const [fetchError, setFetchError] = useState<string | null>(null);

    // State for AI recommendations
    const [recommendations, setRecommendations] = useState<ObjectiveRecommendation[]>([]);
    const [selectedRecommendation, setSelectedRecommendation] = useState<ObjectiveRecommendation | null>(null);
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [isStreaming, setIsStreaming] = useState<boolean>(false);
    const [generationError, setGenerationError] = useState<string | null>(null);
    const eventSourceRef = useRef<EventSource | null>(null); // Ref to hold the EventSource instance
    const receivedAnyMessageRef = useRef<boolean>(false); // Ref to track if any message was received

    // Renamed function for clarity, can be called to refetch
    const fetchAndGroupObjectives = async () => {
        setLoading(true); // Show loading indicator during refetch
        setFetchError(null);
        // No need to clear groups here, they will be overwritten
        // setGroupedObjectives({});
        try {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                throw new Error('Authentication token not found.');
            }

            // Get studentId from auth context
            const studentId = user?.id;
            if (!studentId) {
                // Handle case where user is not loaded yet or not logged in
                // You might want to show a different loading state or error
                logger.error('Student ID not available from auth context');
                setFetchError('User data not available. Please ensure you are logged in.');
                setLoading(false); // Stop loading if we can't proceed
                return; // Exit the function
            }

            const headers: HeadersInit = {
                'Authorization': `Bearer ${token}`,
            };

            // Append studentId as a query parameter
            const url = `/api/v1/objectives?studentId=${encodeURIComponent(studentId)}`;

            const response = await fetch(url, { // Use the updated URL
                method: 'GET',
                headers: headers,
                credentials: 'include',
            });

            if (!response.ok) {
                let errorMsg = `Failed to fetch objectives: ${response.statusText}`;
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.message || errorMsg;
                } catch (jsonError) { /* Ignore */ }
                throw new Error(errorMsg);
            }

            const data: Objective[] = await response.json();

            // Group the fetched objectives by status
            const groups: GroupedObjectives = {};
            for (const objective of data) {
                // Determine status, defaulting to CREATED if currentStatus is missing
                const status = objective.currentStatus?.status ?? ObjectiveStatusValue.CREATED;
                if (!groups[status]) {
                    groups[status] = [];
                }
                groups[status]?.push(objective);
            }
            setGroupedObjectives(groups);

        } catch (err: any) {
            logger.error('Error fetching/grouping objectives', { error: err });
            setFetchError(err.message || 'An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAndGroupObjectives(); // Initial fetch
        // Cleanup function to close EventSource when component unmounts
        return () => {
            if (eventSourceRef.current) {
                logger.info('[SSE Cleanup] Closing EventSource');
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
        };
    }, []); // Empty dependency array ensures initial fetch and cleanup setup run once

    // Function to handle generating recommendations
    const handleGenerateRecommendations = async (lessonTypeFilter: LessonType | null) => {
        logger.info('[SSE] Initiating recommendation stream', { lessonTypeFilter });
        setIsGenerating(true);
        setIsStreaming(true);
        setGenerationError(null);
        setRecommendations([]); // Clear previous recommendations
        setSelectedRecommendation(null); // Clear selection
        receivedAnyMessageRef.current = false; // Reset the flag

        // Close existing connection if any
        if (eventSourceRef.current) {
            logger.info('[SSE] Closing existing EventSource before creating new one');
            eventSourceRef.current.close();
        }

        try {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                throw new Error('Authentication token not found for streaming.');
            }

            // Re-add token query parameter as EventSource cannot set Authorization headers.
            let url = `/api/v1/objectives/recommendations/stream?token=${encodeURIComponent(token)}`;
            if (lessonTypeFilter) {
                url += `&lessonType=${encodeURIComponent(lessonTypeFilter)}`;
            }

            // Create new EventSource
            const eventSource = new EventSource(url);
            eventSourceRef.current = eventSource; // Store ref

            eventSource.onopen = () => {
                logger.info('[SSE] Connection opened');
            };

            eventSource.onmessage = (event) => {
                if (!eventSourceRef.current) return; // Check if closed during processing

                // Check for the [DONE] sentinel string
                if (event.data === '[DONE]') {
                    logger.info('[SSE] Received [DONE] sentinel. Stream complete');
                    if (eventSourceRef.current) {
                        eventSourceRef.current.close();
                        eventSourceRef.current = null;
                    }
                    setIsStreaming(false);
                    setIsGenerating(false);
                    return; // Do not process as a recommendation
                }

                receivedAnyMessageRef.current = true; // Mark that we received a data message
                try {
                    const newRecommendation = JSON.parse(event.data) as ObjectiveRecommendation;
                    logger.info('[SSE] Received recommendation', { recommendation: newRecommendation });
                    setRecommendations((prev) => [...prev, newRecommendation]);
                } catch (e) {
                    logger.error('[SSE] Error parsing message data', { error: e, eventData: event.data });
                    setGenerationError('Failed to parse recommendation data.');
                    if (eventSourceRef.current) {
                        eventSourceRef.current.close();
                        eventSourceRef.current = null;
                    }
                    setIsStreaming(false); // Stop streaming state on parse error
                    setIsGenerating(false);
                }
            };

            eventSource.onerror = (error) => {
                logger.error('[SSE] EventSource error', { error });
                // Only set the user-facing error if no recommendations were successfully received
                if (!receivedAnyMessageRef.current) { // Check the ref instead of state
                    setGenerationError('Connection error occurred while streaming recommendations.');
                } else {
                    logger.warn('[SSE] EventSource error occurred after receiving recommendations. User message suppressed');
                }
                if (eventSourceRef.current) eventSourceRef.current.close();
                eventSourceRef.current = null; // Clear ref on error
                setIsStreaming(false);
                setIsGenerating(false);
            };

            // Optional: Add a specific 'end' event listener if the server sends one
            eventSource.addEventListener('end', () => {
                logger.info('[SSE] Received end event from server');
                if (eventSourceRef.current) eventSourceRef.current.close();
                eventSourceRef.current = null;
                setIsStreaming(false);
                setIsGenerating(false);
            });

        } catch (err: any) {
            logger.error('Error setting up EventSource', { error: err });
            setGenerationError(err.message || 'Failed to start recommendation stream.');
            setIsStreaming(false);
            setIsGenerating(false);
        }
        // Note: isGenerating might be set to false earlier based on stream end/error
        // but we ensure it's false after the setup attempt completes or fails
        // setIsGenerating(false); // Moved into event handlers
    };

    // Handler for selecting a recommendation
    const handleSelectRecommendation = (recommendation: ObjectiveRecommendation | null) => {
        setSelectedRecommendation(recommendation);
    };

    // Define the order in which to display statuses
    const statusOrder: ObjectiveStatusValue[] = [
        ObjectiveStatusValue.CREATED,
        ObjectiveStatusValue.IN_PROGRESS,
        ObjectiveStatusValue.ACHIEVED,
        ObjectiveStatusValue.ABANDONED,
    ];

    const hasObjectives = Object.values(groupedObjectives).some(group => group && group.length > 0);

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-6 dark:text-gray-100">My Learning Objectives</h1>

            {/* Add the form here, passing AI props */}
            <AddObjectiveForm
                onObjectiveAdded={fetchAndGroupObjectives}
                onGenerateRecommendations={handleGenerateRecommendations}
                isGeneratingRecommendations={isGenerating}
                recommendationError={generationError}
                setRecommendationError={setGenerationError}
                initialData={selectedRecommendation} // Pass selected recommendation
                recommendations={recommendations}
                onSelectRecommendation={handleSelectRecommendation}
                isStreaming={isStreaming}
            />

            {loading && <p className="text-gray-600 dark:text-gray-400">Loading objectives...</p>}
            {fetchError && <p className="text-red-500">Error: {fetchError}</p>}

            {!loading && !fetchError && !hasObjectives && (
                <p className="text-gray-600 dark:text-gray-400 mt-8">You don't have any objectives yet.</p>
            )}

            {!loading && !fetchError && hasObjectives && (
                <div className="space-y-8 mt-8">
                    {statusOrder.map((status) => {
                        const objectivesInGroup = groupedObjectives[status] ?? [];

                        return (
                            <section key={status}>
                                <h2 className="text-xl font-semibold mb-4 pb-2 dark:text-gray-200 dark:border-gray-700">
                                    {ObjectiveStatus.getDisplayLabelForStatus(status)}
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {objectivesInGroup.length === 0 ? (
                                        <p className="text-gray-500 italic col-span-full">No objectives in this status.</p>
                                    ) : (
                                        objectivesInGroup.map((objective) => (
                                            <StudentObjective
                                                key={objective.id}
                                                objective={objective}
                                                onStatusUpdate={fetchAndGroupObjectives}
                                            />
                                        ))
                                    )}
                                </div>
                            </section>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ObjectivesPage; 