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

// Helper function to generate time options
const generateTimeOptions = (): string[] => {
  const options: string[] = [];
  for (let hour = 9; hour < 21; hour++) {
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
}

const LessonDetailsForm: React.FC<LessonDetailsFormProps> = ({
  type,
  durationMinutes,
  selectedDate,
  selectedTime,
  onTypeChange,
  onDurationChange,
  onDateChange,
  onTimeChange
}) => {
  const timeOptions = generateTimeOptions();

  return (
    <Card
      title="Lesson Details"
      variant="primary"
      className="lesson-request-card"
    >
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="type">Lesson Type</label>
          <select
            id="type"
            name="type"
            value={type}
            onChange={onTypeChange}
            required
          >
            {Object.values(LessonType).map(type => (
              <option key={type} value={type}>{formatDisplayLabel(type)}</option>
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
          />
        </div>

        <div className="form-group">
          <label htmlFor="time">Time</label>
          <select
            id="time"
            value={selectedTime}
            onChange={onTimeChange}
            required
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