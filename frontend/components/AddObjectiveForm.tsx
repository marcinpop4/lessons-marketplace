import React, { useState } from 'react';
import { Objective } from '@shared/models/Objective'; // Adjust path if needed
import { LessonType, formatDisplayLabel } from '@shared/models/LessonType'; // Adjust path
import { createObjective } from '@frontend/api/objectiveApi'; // Adjust path
import Button from '@frontend/components/shared/Button/Button';
import Card from '@frontend/components/shared/Card/Card';
import Select from '@frontend/components/shared/Form/Select'; // Assuming a reusable Select component
import Input from '@frontend/components/shared/Form/Input'; // Assuming reusable Input
import Textarea from '@frontend/components/shared/Form/Textarea'; // Assuming reusable Textarea
import DatePicker from 'react-datepicker'; // Using react-datepicker
import 'react-datepicker/dist/react-datepicker.css';

interface AddObjectiveFormProps {
    studentId: string;
    onObjectiveAdded: (newObjective: Objective) => void; // Callback
}

const AddObjectiveForm: React.FC<AddObjectiveFormProps> = ({
    studentId,
    onObjectiveAdded,
}) => {
    const [title, setTitle] = useState<string>('');
    const [description, setDescription] = useState<string>('');
    const [lessonType, setLessonType] = useState<LessonType | ''>(LessonType.GUITAR); // Default or empty
    const [targetDate, setTargetDate] = useState<Date | null>(null);
    const [isAdding, setIsAdding] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const handleAddObjective = async () => {
        if (!title.trim()) {
            setError('Objective title cannot be empty.');
            return;
        }
        if (!description.trim()) {
            setError('Objective description cannot be empty.');
            return;
        }
        if (!lessonType) {
            setError('Please select a lesson type.');
            return;
        }
        if (!targetDate) {
            setError('Please select a target date.');
            return;
        }

        // Validate date is in the future? (Optional)
        if (targetDate <= new Date()) {
            setError('Target date must be in the future.');
            return;
        }

        setIsAdding(true);
        setError(null);
        try {
            const newObjective = await createObjective(
                studentId,
                title,
                description,
                lessonType,
                targetDate
            );
            onObjectiveAdded(newObjective);
            // Reset form
            setTitle('');
            setDescription('');
            setLessonType(LessonType.GUITAR); // Reset to default or empty
            setTargetDate(null);
            setError(null);
        } catch (err) {
            console.error("Error adding objective:", err);
            setError(err instanceof Error ? err.message : 'Failed to add objective.');
        } finally {
            setIsAdding(false);
        }
    };

    // Prepare options for the LessonType select dropdown
    const lessonTypeOptions = Object.values(LessonType).map(type => ({
        value: type,
        label: formatDisplayLabel(type) // Use the formatter from LessonType model
    }));

    return (
        <Card
            title="Add New Objective"
            variant="accent"
            className="add-objective-card mb-6"
            headingLevel="h3"
        >
            <div className="space-y-4"> {/* Increased spacing */}
                <Input
                    id="objective-title"
                    label="Objective Title"
                    placeholder="Enter objective title..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={isAdding}
                    required
                />
                <Textarea
                    id="objective-description"
                    label="Objective Description"
                    placeholder="Enter objective description..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={isAdding}
                    rows={3}
                    required
                />
                <Select
                    id="objective-lesson-type"
                    label="Lesson Type"
                    options={lessonTypeOptions}
                    value={lessonType}
                    onChange={(e) => setLessonType(e.target.value as LessonType)}
                    disabled={isAdding}
                    required
                />
                <div> {/* Wrapper for DatePicker label and input */}
                    <label htmlFor="objective-target-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Target Date *
                    </label>
                    <DatePicker
                        id="objective-target-date"
                        selected={targetDate}
                        onChange={(date: Date | null) => setTargetDate(date)}
                        dateFormat="yyyy-MM-dd"
                        placeholderText="Select target date..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:focus:ring-offset-gray-900"
                        disabled={isAdding}
                        minDate={new Date()} // Prevent selecting past dates
                        autoComplete="off"
                        required
                    />
                </div>

                <div className="flex justify-end items-center gap-3">
                    <Button
                        id="add-objective-button"
                        variant="primary"
                        onClick={handleAddObjective}
                        disabled={isAdding || !title.trim() || !description.trim() || !lessonType || !targetDate}
                        className="whitespace-nowrap"
                    >
                        {isAdding ? 'Adding...' : 'Add Objective'}
                    </Button>
                </div>
            </div>

            {error && <p className="text-sm text-red-500 mt-2" role="alert">Error: {error}</p>}
        </Card>
    );
};

export default AddObjectiveForm; 