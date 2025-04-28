import React, { useState, useEffect } from 'react';
import { Objective } from '@shared/models/Objective';
import { ObjectiveStatus, ObjectiveStatusValue } from '@shared/models/ObjectiveStatus'; // Import ObjectiveStatus class
import StudentObjective from '../../../components/student/objective/StudentObjective';
import AddObjectiveForm from '../../../components/student/objective/AddObjectiveForm'; // Import the new form

// Define the structure for grouped objectives
type GroupedObjectives = { [key in ObjectiveStatusValue]?: Objective[] };

const ObjectivesPage: React.FC = () => {
    // Keep the original flat list for fetching
    // const [objectives, setObjectives] = useState<Objective[]>([]); 
    // State to hold grouped objectives
    const [groupedObjectives, setGroupedObjectives] = useState<GroupedObjectives>({});
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Renamed function for clarity, can be called to refetch
    const fetchAndGroupObjectives = async () => {
        setLoading(true); // Show loading indicator during refetch
        setError(null);
        // No need to clear groups here, they will be overwritten
        // setGroupedObjectives({});
        try {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                throw new Error('Authentication token not found.');
            }

            const headers: HeadersInit = {
                'Content-Type': 'application/json',
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
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAndGroupObjectives(); // Initial fetch
    }, []);

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

            {/* Add the form here */}
            <AddObjectiveForm onObjectiveAdded={fetchAndGroupObjectives} />

            {loading && <p className="text-gray-600 dark:text-gray-400">Loading objectives...</p>}
            {error && <p className="text-red-500">Error: {error}</p>}

            {!loading && !error && !hasObjectives && (
                <p className="text-gray-600 dark:text-gray-400">You don't have any objectives yet.</p>
            )}

            {!loading && !error && hasObjectives && (
                <div className="space-y-8">
                    {statusOrder.map((status) => {
                        const objectivesInGroup = groupedObjectives[status] ?? [];

                        return (
                            <section key={status}>
                                <h2 className="text-xl font-semibold mb-4 pb-2 dark:text-gray-200 dark:border-gray-700">
                                    {ObjectiveStatus.getDisplayLabelForStatus(status)}
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {objectivesInGroup.map((objective) => (
                                        <StudentObjective
                                            key={objective.id}
                                            objective={objective}
                                            onStatusUpdate={fetchAndGroupObjectives}
                                        />
                                    ))}
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