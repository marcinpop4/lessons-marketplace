import React, { useState, useEffect } from 'react';
import { Objective } from '@shared/models/Objective';
import { LessonType, formatDisplayLabel } from '@shared/models/LessonType.js';
import { ObjectiveStatus, ObjectiveStatusValue } from '@shared/models/ObjectiveStatus.js';
import { getStudentObjectives } from '@frontend/api/objectiveApi'; // Corrected import path
import Card from '@frontend/components/shared/Card/Card';

interface StudentObjectivesDisplayProps {
    studentId: string;
    lessonType: LessonType;
}

const StudentObjectivesDisplay: React.FC<StudentObjectivesDisplayProps> = ({ studentId, lessonType }) => {
    const [objectives, setObjectives] = useState<Objective[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchObjectives = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // Fetch objectives using the corrected API call
                const fetchedObjectives = await getStudentObjectives(studentId, lessonType);

                // Filter for relevant statuses (CREATED, IN_PROGRESS, ACHIEVED)
                // Note: Ideally, the API would support filtering by status directly
                const relevantObjectives = fetchedObjectives.filter((o: Objective) =>
                    o.currentStatus?.status === ObjectiveStatusValue.CREATED ||
                    o.currentStatus?.status === ObjectiveStatusValue.IN_PROGRESS ||
                    o.currentStatus?.status === ObjectiveStatusValue.ACHIEVED
                );
                setObjectives(relevantObjectives);
            } catch (err) {
                console.error("Error fetching student objectives:", err);
                setError(err instanceof Error ? err.message : 'Failed to load objectives.');
            } finally {
                setIsLoading(false);
            }
        };

        if (studentId && lessonType) {
            fetchObjectives();
        } else {
            setIsLoading(false);
            setError("Missing student ID or lesson type.");
        }

    }, [studentId, lessonType]); // Refetch if studentId or lessonType changes

    return (
        <Card
            title="Student Learning Objectives"
            subtitle={`Relevant objectives for ${formatDisplayLabel(lessonType)}`}
            variant="secondary"
            className="mb-6"
            headingLevel="h2"
        >
            {isLoading && <p className="text-gray-600 dark:text-gray-400">Loading objectives...</p>}
            {error && <p className="text-red-500">Error: {error}</p>}
            {!isLoading && !error && objectives.length === 0 && (
                <p className="text-gray-600 dark:text-gray-400 italic">No relevant objectives found for this student and lesson type.</p>
            )}
            {!isLoading && !error && objectives.length > 0 && (
                <ul className="space-y-3">
                    {objectives.map(obj => (
                        // Simple display, not using StudentObjective component as no actions are needed here
                        <li key={obj.id} className="p-3 border rounded-md dark:border-gray-700 bg-white dark:bg-gray-800">
                            <h4 className="font-semibold text-gray-800 dark:text-gray-200">{obj.title}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{obj.description}</p>
                            <div className="flex justify-between items-center mt-2 text-xs text-gray-500 dark:text-gray-400">
                                <span>
                                    Status: {obj.currentStatus ? ObjectiveStatus.getDisplayLabelForStatus(obj.currentStatus.status) : 'N/A'}
                                </span>
                                {obj.targetDate && (
                                    <span>
                                        Target: {new Date(obj.targetDate).toLocaleDateString()}
                                    </span>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
};

export default StudentObjectivesDisplay; 