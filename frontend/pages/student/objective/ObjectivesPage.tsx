import React, { useState, useEffect, useRef } from 'react';
import { Objective } from '@shared/models/Objective';
import { ObjectiveStatus, ObjectiveStatusValue } from '@shared/models/ObjectiveStatus'; // Import ObjectiveStatus class
import StudentObjective from '../../../components/student/objective/StudentObjective';
import AddObjectiveForm from '../../../components/student/objective/AddObjectiveForm'; // Import the new form
import { ObjectiveRecommendation } from '@shared/models/ObjectiveRecommendation.js'; // Import recommendation type
import { LessonType } from '@shared/models/LessonType.js'; // Import LessonType for filtering

// Define the structure for grouped objectives
type GroupedObjectives = { [key in ObjectiveStatusValue]?: Objective[] };

const ObjectivesPage: React.FC = () => {
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

            const headers: HeadersInit = {
                'Authorization': `Bearer ${token}`,
            };

            const response = await fetch('/api/v1/objectives', {
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
            console.error("Error fetching/grouping objectives:", err);
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
                console.log('[SSE Cleanup] Closing EventSource.');
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
        };
    }, []); // Empty dependency array ensures initial fetch and cleanup setup run once

    // Function to handle generating recommendations
    const handleGenerateRecommendations = async (lessonTypeFilter: LessonType | null) => {
        console.log('[SSE] Initiating recommendation stream...', { lessonTypeFilter });
        setIsGenerating(true);
        setIsStreaming(true);
        setGenerationError(null);
        setRecommendations([]); // Clear previous recommendations
        setSelectedRecommendation(null); // Clear selection

        // Close existing connection if any
        if (eventSourceRef.current) {
            console.log('[SSE] Closing existing EventSource before creating new one.');
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
                console.log('[SSE] Connection opened.');
            };

            eventSource.onmessage = (event) => {
                if (!eventSourceRef.current) return; // Check if closed during processing
                try {
                    const newRecommendation = JSON.parse(event.data) as ObjectiveRecommendation;
                    console.log('[SSE] Received recommendation:', newRecommendation);
                    setRecommendations((prev) => [...prev, newRecommendation]);
                } catch (e) {
                    console.error('[SSE] Error parsing message data:', e, event.data);
                    setGenerationError('Failed to parse recommendation data.');
                    if (eventSourceRef.current) eventSourceRef.current.close();
                    setIsStreaming(false); // Stop streaming state on parse error
                    setIsGenerating(false);
                }
            };

            eventSource.onerror = (error) => {
                console.error('[SSE] EventSource error:', error);
                setGenerationError('Connection error occurred while streaming recommendations.');
                if (eventSourceRef.current) eventSourceRef.current.close();
                eventSourceRef.current = null; // Clear ref on error
                setIsStreaming(false);
                setIsGenerating(false);
            };

            // Optional: Add a specific 'end' event listener if the server sends one
            eventSource.addEventListener('end', () => {
                console.log('[SSE] Received end event from server.');
                if (eventSourceRef.current) eventSourceRef.current.close();
                eventSourceRef.current = null;
                setIsStreaming(false);
                setIsGenerating(false);
            });

        } catch (err: any) {
            console.error('Error setting up EventSource:', err);
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