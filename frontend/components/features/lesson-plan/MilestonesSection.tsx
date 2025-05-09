import React from 'react';
import { Card } from '@frontend/components/shared/Card';
import Button from '@frontend/components/shared/Button/Button'; // Assuming Button component is here
import MilestoneForm, { UIMilestone, UIPlannedLesson } from './MilestoneForm';
import { LessonType } from '@shared/models/LessonType'; // Import LessonType

interface MilestonesSectionProps {
    milestones: UIMilestone[];
    lessonType?: LessonType; // Add lessonType prop (make optional in case sourceLesson is loading)
    onAddMilestone: () => void;
    onMilestoneChange: (milestoneId: string, field: keyof UIMilestone, value: any) => void;
    onRemoveMilestone: (milestoneId: string) => void;
    onAddPlannedLesson: (milestoneId: string) => void;
    onPlannedLessonChange: (milestoneId: string, plannedLessonId: string, field: keyof UIPlannedLesson, value: string | number) => void; // value is string | number
    onRemovePlannedLesson: (milestoneId: string, plannedLessonId: string) => void;
}

const MilestonesSection: React.FC<MilestonesSectionProps> = ({
    milestones,
    lessonType, // Destructure lessonType
    onAddMilestone,
    onMilestoneChange,
    onRemoveMilestone,
    onAddPlannedLesson,
    onPlannedLessonChange,
    onRemovePlannedLesson,
}) => {
    return (
        <Card title="Milestones" headingLevel="h2">
            <div className="space-y-6">
                {milestones.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 italic">No milestones added yet. Click "Add Milestone" to begin.</p>
                ) : (
                    milestones.map((milestone, index) => (
                        <MilestoneForm
                            key={milestone.id} // Use the unique ID from UIMilestone
                            milestone={milestone}
                            index={index}
                            lessonType={lessonType || LessonType.DRUMS} // Pass down lessonType, provide default if undefined
                            onMilestoneChange={onMilestoneChange}
                            onRemoveMilestone={onRemoveMilestone} // Pass down the remove handler
                            onAddPlannedLesson={onAddPlannedLesson}
                            onPlannedLessonChange={onPlannedLessonChange}
                            onRemovePlannedLesson={onRemovePlannedLesson}
                        />
                    ))
                )}
                <div className="flex justify-start mt-4"> {/* Changed to justify-start for left alignment */}
                    <Button
                        variant="primary"
                        onClick={onAddMilestone}
                        size="md"
                        disabled={!lessonType} // Disable adding milestones until lesson type is loaded
                    >
                        Add Milestone
                    </Button>
                </div>
            </div>
        </Card>
    );
};

export default MilestonesSection; 