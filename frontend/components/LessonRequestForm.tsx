// CACHE-BUSTER: 20250320101632
import React, { useState, useEffect } from 'react';
import { LessonType, LessonRequest, Student, Address } from '../types/lesson';
import { createLessonRequest } from '../api/lessonRequestApi';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../styles/LessonRequestForm.css';

// Version: 2023-03-20-1 Cache buster
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
    
    // Add on the hour option
    options.push({
      value: `${hour.toString().padStart(2, '0')}:00`,
      label: `${hourFormatted}:00 ${amPm}`
    });
    
    // Add half-hour option
    options.push({
      value: `${hour.toString().padStart(2, '0')}:30`,
      label: `${hourFormatted}:30 ${amPm}`
    });
  }
  
  return options;
};

// Helper function to check if a lesson would end after 9pm
const isLessonEndingAfter9pm = (startTime: string, durationMinutes: number): boolean => {
  const [hours, minutes] = startTime.split(':').map(Number);
  
  // Calculate end time in minutes since midnight
  const startMinutesSinceMidnight = (hours * 60) + minutes;
  const endMinutesSinceMidnight = startMinutesSinceMidnight + durationMinutes;
  
  // 9pm = 21 hours * 60 minutes = 1260 minutes since midnight
  return endMinutesSinceMidnight > 1260;
};

// Add props interface for the component
interface LessonRequestFormProps {
  onSubmitSuccess?: (lessonRequestId: string) => void;
}

const LessonRequestForm: React.FC<LessonRequestFormProps> = ({ onSubmitSuccess }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState<Omit<LessonRequest, 'address'> & { 
    addressObj: Address;
  }>({
    type: LessonType.GUITAR,
    startTime: '',
    durationMinutes: 30,
    addressObj: {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'USA'
    },
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
    // Redirect if not a student or not authenticated
    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }
    
    if (user.userType !== 'STUDENT') {
      navigate('/', { replace: true });
      return;
    }
    
    // Set up initial date (today)
    const today = new Date();
    const formattedDate = formatDateForInput(today);
    
    setSelectedDate(formattedDate);
    
    setFormData(prevData => ({
      ...prevData,
      studentId: user.id
    }));
  }, [user, navigate]);

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
    
    // Handle address fields
    if (name.startsWith('addressObj.')) {
      const addressField = name.split('.')[1];
      setFormData(prevData => ({
        ...prevData,
        addressObj: {
          ...prevData.addressObj,
          [addressField]: value
        }
      }));
      return;
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
    
    // Validate address fields
    const { street, city, state, postalCode } = formData.addressObj;
    if (!street || !city || !state || !postalCode) {
      setError('Please fill in all address fields.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const payload = {
        type: formData.type,
        startTime: formData.startTime,
        durationMinutes: formData.durationMinutes,
        addressObj: formData.addressObj,
        studentId: formData.studentId
      };
      
      const result = await createLessonRequest(payload);
      
      console.log('Lesson request created:', result);
      
      // Success!
      setSuccess(true);
      
      // Reset form after successful submission
      setFormData({
        type: LessonType.GUITAR,
        startTime: '',
        durationMinutes: 30,
        addressObj: {
          street: '',
          city: '',
          state: '',
          postalCode: '',
          country: 'USA'
        },
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
    <div className="lesson-request-form-container" key="lesson-request-form-v20230320">
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
        <div className="form-row">
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
            <label htmlFor="durationMinutes">Lesson Duration</label>
            <select
              id="durationMinutes"
              name="durationMinutes"
              value={formData.durationMinutes}
              onChange={handleChange}
              required
            >
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes</option>
              <option value={90}>90 minutes</option>
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
              onChange={handleDateChange}
              min={formatDateForInput(new Date())}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="time">Time</label>
            <select
              id="time"
              value={selectedTime}
              onChange={handleTimeChange}
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
        
        <div className="form-group address-group">
          <label>Address</label>
          <div className="address-fields">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="addressObj.street">Street</label>
                <input
                  id="addressObj.street"
                  name="addressObj.street"
                  type="text"
                  value={formData.addressObj.street}
                  onChange={handleChange}
                  placeholder="Street address"
                  required
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="addressObj.city">City</label>
                <input
                  id="addressObj.city"
                  name="addressObj.city"
                  type="text"
                  value={formData.addressObj.city}
                  onChange={handleChange}
                  placeholder="City"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="addressObj.state">State</label>
                <input
                  id="addressObj.state"
                  name="addressObj.state"
                  type="text"
                  value={formData.addressObj.state}
                  onChange={handleChange}
                  placeholder="State"
                  required
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="addressObj.postalCode">Postal Code</label>
                <input
                  id="addressObj.postalCode"
                  name="addressObj.postalCode"
                  type="text"
                  value={formData.addressObj.postalCode}
                  onChange={handleChange}
                  placeholder="Postal Code"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="addressObj.country">Country</label>
                <input
                  id="addressObj.country"
                  name="addressObj.country"
                  type="text"
                  value={formData.addressObj.country}
                  onChange={handleChange}
                  placeholder="Country"
                  required
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="form-actions">
          <button
            type="submit"
            disabled={loading}
          >
            {loading ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </form>
    </div>
  );
};

// Wrap with React.memo to ensure re-mounting when keys change
export default React.memo(LessonRequestForm); 