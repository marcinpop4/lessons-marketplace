import React from 'react';
import { LessonType } from '@frontend/types/lesson';

// Helper function to format date for input field
const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper function to generate time options (9am to 8pm)
const generateTimeOptions = () => {
  const options = [];
  for (let hour = 9; hour <= 20; hour++) {
    const hourFormatted = hour % 12 === 0 ? 12 : hour % 12;
    const amPm = hour < 12 ? 'AM' : 'PM';
    options.push({
      value: `${hour.toString().padStart(2, '0')}:00`,
      label: `${hourFormatted}:00 ${amPm}`
    });
    options.push({
      value: `${hour.toString().padStart(2, '0')}:30`,
      label: `${hourFormatted}:30 ${amPm}`
    });
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
    <div className="card card-primary lesson-request-card">
      <div className="card-header">
        <h3>Lesson Details</h3>
      </div>
      
      <div className="card-body">
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
                <option key={type} value={type}>{type}</option>
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
              type="date"
              id="date"
              name="date"
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
              name="time"
              value={selectedTime}
              onChange={onTimeChange}
              required
            >
              <option value="">Select a time</option>
              {timeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LessonDetailsForm; 