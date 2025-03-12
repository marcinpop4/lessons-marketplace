import React, { useState, useEffect } from 'react';
import { LessonType, LessonRequest, Student } from '../types/lesson';
import { createLessonRequest } from '../api/lessonRequestApi';
import '../styles/LessonRequestForm.css';

// Hardcoded student ID - in a real app this would be retrieved from an auth context
// This represents Ethan Parker's ID from the seed file
const LOGGED_IN_STUDENT_ID = '41834212-ab09-41e5-8578-ffd23326ec75';

// Mock function to get the logged-in student (hardcoded for now)
const getLoggedInStudent = (): Student => {
  // In a real app, this would fetch from an auth context or API
  return {
    id: LOGGED_IN_STUDENT_ID,
    firstName: 'Ethan',
    lastName: 'Parker',
    email: 'ethan.parker@example.com',
    phoneNumber: '987-654-3210'
  };
};

// Helper function to format date for input field
const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

// Generate available time options for the current selected date
const generateTimeOptions = (): { value: string, label: string }[] => {
  const options: { value: string, label: string }[] = [];
  
  // Generate options for every 30 minutes, but only between 8am (8:00) and 8pm (20:00)
  for (let hour = 8; hour <= 20; hour++) {
    // Add option for the hour (00 minutes)
    const periodHour = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12; // Convert 0 to 12 for display
    
    // Format time as HH:MM (24-hour format for value)
    const valueHour = String(hour).padStart(2, '0');
    
    // Format as "H:00 AM/PM" for display
    options.push({
      value: `${valueHour}:00`,
      label: `${displayHour}:00 ${periodHour}`
    });
    
    // Add option for the half hour (30 minutes)
    options.push({
      value: `${valueHour}:30`,
      label: `${displayHour}:30 ${periodHour}`
    });
  }
  
  return options;
};

// Helper function to check if a lesson would end after 9pm (21:00)
const isLessonEndingAfter9pm = (timeString: string, durationMinutes: number): boolean => {
  if (!timeString) return false;
  
  // Extract hours and minutes from the time string (format: "HH:MM")
  const [hours, minutes] = timeString.split(':').map(part => parseInt(part, 10));
  
  // Calculate end time in minutes past midnight
  const startTimeInMinutes = (hours * 60) + minutes;
  const endTimeInMinutes = startTimeInMinutes + durationMinutes;
  
  // 9pm = 21 hours * 60 minutes = 1260 minutes past midnight
  return endTimeInMinutes > 1260;
};

// Add props interface for the component
interface LessonRequestFormProps {
  onSubmitSuccess?: (lessonRequestId: string) => void;
}

const LessonRequestForm: React.FC<LessonRequestFormProps> = ({ onSubmitSuccess }) => {
  const [formData, setFormData] = useState<LessonRequest>({
    type: LessonType.GUITAR,
    startTime: '',
    durationMinutes: 30,
    address: '',
    studentId: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [timeOptions] = useState<{ value: string, label: string }[]>(generateTimeOptions());

  // Set the studentId on component mount and initialize with current date
  useEffect(() => {
    const student = getLoggedInStudent();
    
    // Set up initial date (today)
    const today = new Date();
    const formattedDate = formatDateForInput(today);
    
    setSelectedDate(formattedDate);
    
    setFormData(prevData => ({
      ...prevData,
      studentId: student.id
    }));
  }, []);

  // Update form data when date or time changes
  useEffect(() => {
    if (selectedDate && selectedTime) {
      const dateTimeString = `${selectedDate}T${selectedTime}:00`;
      setFormData(prevData => ({
        ...prevData,
        startTime: dateTimeString
      }));
    }
  }, [selectedDate, selectedTime]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTime = e.target.value;
    setSelectedTime(newTime);
    
    // Check if the new time selection would cause the lesson to end after 9pm
    if (newTime && isLessonEndingAfter9pm(newTime, formData.durationMinutes)) {
      setError('Lesson cannot end after 9:00 PM. Please choose an earlier time or shorter duration.');
    } else {
      // Clear the error message if previously set for this condition
      if (error && error.includes('Lesson cannot end after 9:00 PM')) {
        setError(null);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Skip direct handling of date/time inputs as we're using custom logic
    if (name === 'startTime') return;
    
    // For duration change, check if it would make the lesson end after 9pm
    if (name === 'durationMinutes') {
      const durationValue = parseInt(value, 10);
      if (selectedTime && isLessonEndingAfter9pm(selectedTime, durationValue)) {
        setError('Lesson cannot end after 9:00 PM. Please choose an earlier time or shorter duration.');
      } else {
        // Clear the error message if previously set for this condition
        if (error && error.includes('Lesson cannot end after 9:00 PM')) {
          setError(null);
        }
      }
    }
    
    setFormData(prevData => ({
      ...prevData,
      [name]: name === 'durationMinutes' ? parseInt(value, 10) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate date and time are selected
    if (!selectedDate || !selectedTime) {
      setError('Please select both a date and time for the lesson.');
      return;
    }
    
    // Validate that the lesson doesn't end after 9pm
    if (isLessonEndingAfter9pm(selectedTime, formData.durationMinutes)) {
      setError('Lesson cannot end after 9:00 PM. Please choose an earlier time or shorter duration.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await createLessonRequest({
        type: formData.type,
        startTime: formData.startTime,
        durationMinutes: formData.durationMinutes,
        address: formData.address,
        studentId: formData.studentId
      });
      
      console.log('Lesson request created:', result);
      
      // Success!
      setSuccess(true);
      
      // Reset form after successful submission
      setFormData({
        type: LessonType.GUITAR,
        startTime: '',
        durationMinutes: 30,
        address: '',
        studentId: formData.studentId // Keep the student ID
      });
      setSelectedTime('');
      
      // Call onSubmitSuccess callback if provided
      if (onSubmitSuccess && result.id) {
        onSubmitSuccess(result.id);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit lesson request. Please try again.';
      setError(errorMessage);
      console.error('Error submitting lesson request:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lesson-request-form-container">
      <h2>Request a Lesson</h2>
      
      {success && !onSubmitSuccess && (
        <div className="success-message">
          Your lesson request has been submitted successfully!
        </div>
      )}
      
      {error && (
        <div className="error-message">{error}</div>
      )}
      
      <form onSubmit={handleSubmit} className="lesson-request-form">
        <div className="form-group">
          <label htmlFor="type">Lesson Type</label>
          <select
            id="type"
            name="type"
            value={formData.type}
            onChange={handleChange}
            required
          >
            <option value={LessonType.VOICE}>Voice</option>
            <option value={LessonType.GUITAR}>Guitar</option>
            <option value={LessonType.BASS}>Bass</option>
            <option value={LessonType.DRUMS}>Drums</option>
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="lessonDate">Lesson Date</label>
          <input
            type="date"
            id="lessonDate"
            name="lessonDate"
            value={selectedDate}
            onChange={handleDateChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="lessonTime">Lesson Time</label>
          <select
            id="lessonTime"
            name="lessonTime"
            value={selectedTime}
            onChange={handleTimeChange}
            required
          >
            <option value="">Select a time</option>
            {timeOptions.map((option, index) => (
              <option key={index} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <small className="form-helper-text">Lessons are available between 8:00 AM and 8:00 PM, and must end by 9:00 PM.</small>
        </div>
        
        <div className="form-group">
          <label htmlFor="durationMinutes">Duration (minutes)</label>
          <select
            id="durationMinutes"
            name="durationMinutes"
            value={formData.durationMinutes}
            onChange={handleChange}
            required
          >
            <option value="30">30 minutes</option>
            <option value="60">60 minutes</option>
          </select>
          <small className="form-helper-text">Please ensure your selected time and duration don't result in a lesson ending after 9:00 PM.</small>
        </div>
        
        <div className="form-group">
          <label htmlFor="address">Lesson Location</label>
          <textarea
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="Enter the address or location for the lesson"
            required
          />
        </div>
        
        <div className="form-actions">
          <button type="submit" disabled={loading || !selectedTime || !selectedDate}>
            {loading ? 'Submitting...' : 'Submit Lesson Request'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LessonRequestForm; 