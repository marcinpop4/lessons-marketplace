// CACHE-BUSTER: 20250320101632
import React, { useState, useEffect } from 'react';
import { LessonType, LessonRequest, Student, Address } from '../types/lesson';
import { createLessonRequest } from '../api/lessonRequestApi';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

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
  const { user, justRegistered, clearJustRegistered } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  
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

  // Check for registration success in sessionStorage instead of URL
  useEffect(() => {
    const registrationSuccess = sessionStorage.getItem('registrationSuccess');
    
    if (registrationSuccess === 'true') {
      setShowSuccessMessage(true);
      
      // Remove the success flag from sessionStorage
      sessionStorage.removeItem('registrationSuccess');
    }
  }, []);
  
  // Hide success message after 5 seconds
  useEffect(() => {
    if (showSuccessMessage || justRegistered) {
      const timer = setTimeout(() => {
        setShowSuccessMessage(false);
        if (justRegistered) {
          clearJustRegistered();
        }
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessMessage, justRegistered, clearJustRegistered]);

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
      
      // Success!
      setShowSuccessMessage(true);
      
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
        studentId: user?.id || ''
      });
      
      setSelectedTime('');
      
      // Call the success callback if provided
      if (onSubmitSuccess && result.id) {
        onSubmitSuccess(result.id);
      }
    } catch (err) {
      setError('Failed to submit lesson request. Please try again.');
      console.error('Error submitting lesson request:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card card-primary">
      <div className="card-header">
        <h3 className="text-xl font-semibold">Request a Lesson</h3>
      </div>
      <div className="card-body">
        {(showSuccessMessage || justRegistered) && (
          <div className="alert alert-success mb-4">
            {justRegistered ? 'Registration successful! Please fill out your lesson request.' : 'Lesson request submitted successfully!'}
          </div>
        )}
        
        {error && (
          <div className="alert alert-error mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="lesson-request-form space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="type" className="block text-sm font-medium mb-1">Lesson Type</label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="select w-full"
                disabled={loading}
              >
                {Object.values(LessonType).map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="durationMinutes" className="block text-sm font-medium mb-1">Duration</label>
              <select
                id="durationMinutes"
                name="durationMinutes"
                value={formData.durationMinutes}
                onChange={handleChange}
                className="select w-full"
                disabled={loading}
              >
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes</option>
                <option value={90}>90 minutes</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="date" className="block text-sm font-medium mb-1">Date</label>
              <input
                type="date"
                id="date"
                name="date"
                value={selectedDate}
                onChange={handleDateChange}
                min={formatDateForInput(new Date())}
                className="input w-full"
                disabled={loading}
              />
            </div>
            
            <div>
              <label htmlFor="time" className="block text-sm font-medium mb-1">Time</label>
              <select
                id="time"
                name="time"
                value={selectedTime}
                onChange={handleTimeChange}
                className="select w-full"
                disabled={loading}
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
          
          <div className="card card-secondary mt-6">
            <div className="card-header">
              <h3 className="text-lg font-semibold">Lesson Location</h3>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="addressObj.street" className="block text-sm font-medium mb-1">Street Address</label>
                  <input
                    type="text"
                    id="addressObj.street"
                    name="addressObj.street"
                    value={formData.addressObj.street}
                    onChange={handleChange}
                    className="input w-full"
                    disabled={loading}
                  />
                </div>
                
                <div>
                  <label htmlFor="addressObj.city" className="block text-sm font-medium mb-1">City</label>
                  <input
                    type="text"
                    id="addressObj.city"
                    name="addressObj.city"
                    value={formData.addressObj.city}
                    onChange={handleChange}
                    className="input w-full"
                    disabled={loading}
                  />
                </div>
                
                <div>
                  <label htmlFor="addressObj.state" className="block text-sm font-medium mb-1">State</label>
                  <input
                    type="text"
                    id="addressObj.state"
                    name="addressObj.state"
                    value={formData.addressObj.state}
                    onChange={handleChange}
                    className="input w-full"
                    maxLength={2}
                    disabled={loading}
                  />
                </div>
                
                <div>
                  <label htmlFor="addressObj.postalCode" className="block text-sm font-medium mb-1">ZIP Code</label>
                  <input
                    type="text"
                    id="addressObj.postalCode"
                    name="addressObj.postalCode"
                    value={formData.addressObj.postalCode}
                    onChange={handleChange}
                    className="input w-full"
                    maxLength={5}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6">
            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Submit Lesson Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LessonRequestForm; 