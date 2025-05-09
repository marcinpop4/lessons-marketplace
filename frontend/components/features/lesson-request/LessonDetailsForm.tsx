import React from 'react';
import { LessonType, formatDisplayLabel } from '@shared/models/LessonType';
import { Card } from '@frontend/components/shared/Card';

// Helper function to format date for input field
const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper function to generate time options - EXPANDED RANGE
const generateTimeOptions = (): string[] => {
  const options: string[] = [];
  // Expanded range, e.g., from 7 AM to 10 PM (exclusive of 10 PM)
  for (let hour = 7; hour < 22; hour++) {
    const formattedHour = hour.toString().padStart(2, '0');
    options.push(`${formattedHour}:00`);
    options.push(`${formattedHour}:30`);
  }
  return options;
};

interface LessonDetailsFormProps {
  type: LessonType;
  durationMinutes: number;
  selectedDate: string;
  selectedTime: string;
  onTypeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onDurationChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTimeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  disableType?: boolean;
}

const LessonDetailsForm: React.FC<LessonDetailsFormProps> = ({
  type,
  durationMinutes,
  selectedDate,
  selectedTime,
  onTypeChange,
  onDurationChange,
  onDateChange,
  onTimeChange,
  disableType = false
}) => {
  const timeOptions = generateTimeOptions();

  const cardProps = {
    title: "Lesson Details",
    variant: "primary" as const,
    className: "lesson-request-card"
  }

  // Log the selectedTime prop as received by this component
  console.log(`[LessonDetailsForm] Rendering with selectedTime: "${selectedTime}"`);

  return (
    <Card {...cardProps}>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="type">Lesson Type</label>
          <select
            id="type"
            name="type"
            value={type}
            onChange={onTypeChange}
            required
            disabled={disableType}
            className={disableType ? 'bg-gray-100 dark:bg-gray-700 opacity-70 cursor-not-allowed' : ''}
          >
            {Object.values(LessonType).map(lt => (
              <option key={lt} value={lt}>{formatDisplayLabel(lt)}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="durationMinutes">Duration (minutes)</label>
          <select
            id="durationMinutes"
            name="durationMinutes"
            value={durationMinutes}
            onChange={onDurationChange}
            required
          // Add appropriate select styling if needed, for now using default
          >
            <option value={30}>30</option>
            <option value={45}>45</option>
            <option value={60}>60</option>
            <option value={90}>90</option>
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="date">Date</label>
          <input
            id="date"
            type="date"
            value={selectedDate}
            onChange={onDateChange}
            min={formatDateForInput(new Date())}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
          />
        </div>

        <div className="form-group">
          <label htmlFor="time">Time</label>
          <select
            id="time"
            value={selectedTime}
            onChange={onTimeChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
          >
            <option value="">Select a time</option>
            {timeOptions.map(time => (
              <option key={time} value={time}>{time}</option>
            ))}
          </select>
        </div>
      </div>
    </Card>
  );
};

export default LessonDetailsForm; 