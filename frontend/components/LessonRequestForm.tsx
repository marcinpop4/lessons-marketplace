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
    <div className="animate-fade-in">
      {(showSuccessMessage || justRegistered) && (
        <div className="alert alert-success mb-4 animate-slide-in" role="alert">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Your registration was successful! You can now request lessons.
        </div>
      )}

      {error && (
        <div className="alert alert-error mb-4 animate-slide-in" role="alert">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      <div className="max-w-5xl mx-auto">
        <div className="mb-3 text-center">
          <h2 className="text-2xl font-bold text-primary-800 mb-1">Request a Lesson</h2>
          <p className="text-sm text-gray-600">Fill out the form below to request a lesson with a teacher.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card shadow-card transition duration-300 p-4 border-l-4 border-primary-400">
              <h3 className="text-lg font-semibold text-primary-700 mb-3 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary-500" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                </svg>
                Lesson Details
              </h3>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group mb-2">
                    <label htmlFor="type" className="label mb-1 text-primary-700">
                      Lesson Type
                    </label>
                    <select
                      id="type"
                      name="type"
                      value={formData.type}
                      onChange={handleChange}
                      className="select py-2 w-full focus:ring-primary-500 focus:border-primary-500"
                      required
                    >
                      <option value={LessonType.GUITAR}>Guitar</option>
                      <option value={LessonType.BASS}>Bass</option>
                      <option value={LessonType.DRUMS}>Drums</option>
                      <option value={LessonType.VOICE}>Voice</option>
                    </select>
                  </div>

                  <div className="form-group mb-2">
                    <label htmlFor="durationMinutes" className="label mb-1 text-primary-700">
                      Duration
                    </label>
                    <select
                      id="durationMinutes"
                      name="durationMinutes"
                      value={formData.durationMinutes}
                      onChange={handleChange}
                      className="select py-2 w-full focus:ring-primary-500 focus:border-primary-500"
                      required
                    >
                      <option value={30}>30 min</option>
                      <option value={45}>45 min</option>
                      <option value={60}>60 min</option>
                      <option value={90}>90 min</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group mb-2">
                    <label htmlFor="date" className="label mb-1 text-primary-700">
                      Date
                    </label>
                    <input
                      type="date"
                      id="date"
                      name="date"
                      value={selectedDate}
                      onChange={handleDateChange}
                      min={formatDateForInput(new Date())}
                      className="input py-2 focus:ring-primary-500 focus:border-primary-500"
                      required
                    />
                  </div>

                  <div className="form-group mb-2">
                    <label htmlFor="time" className="label mb-1 text-primary-700">
                      Time
                    </label>
                    <select
                      id="time"
                      name="time"
                      value={selectedTime}
                      onChange={handleTimeChange}
                      className="select py-2 w-full focus:ring-primary-500 focus:border-primary-500"
                      required
                    >
                      <option value="">Select time</option>
                      {timeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {selectedTime && formData.durationMinutes && isLessonEndingAfter9pm(selectedTime, formData.durationMinutes) && (
                  <p className="text-red-600 text-xs">
                    Note: This lesson would end after 9pm, which may not be available with all teachers.
                  </p>
                )}
              </div>
            </div>

            <div className="card shadow-card transition duration-300 p-4 border-l-4 border-accent-400">
              <h3 className="text-lg font-semibold text-accent-700 mb-3 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-accent-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                Lesson Location
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group mb-2">
                  <label htmlFor="street" className="label mb-1 text-accent-700">
                    Street Address
                  </label>
                  <input
                    type="text"
                    id="street"
                    name="addressObj.street"
                    value={formData.addressObj.street}
                    onChange={handleChange}
                    className="input py-2 focus:ring-accent-500 focus:border-accent-500"
                    required
                  />
                </div>

                <div className="form-group mb-2">
                  <label htmlFor="city" className="label mb-1 text-accent-700">
                    City
                  </label>
                  <input
                    type="text"
                    id="city"
                    name="addressObj.city"
                    value={formData.addressObj.city}
                    onChange={handleChange}
                    className="input py-2 focus:ring-accent-500 focus:border-accent-500"
                    required
                  />
                </div>

                <div className="form-group mb-2">
                  <label htmlFor="state" className="label mb-1 text-accent-700">
                    State
                  </label>
                  <input
                    type="text"
                    id="state"
                    name="addressObj.state"
                    value={formData.addressObj.state}
                    onChange={handleChange}
                    className="input py-2 focus:ring-accent-500 focus:border-accent-500"
                    required
                  />
                </div>

                <div className="form-group mb-2">
                  <label htmlFor="postalCode" className="label mb-1 text-accent-700">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    id="postalCode"
                    name="addressObj.postalCode"
                    value={formData.addressObj.postalCode}
                    onChange={handleChange}
                    className="input py-2 focus:ring-accent-500 focus:border-accent-500"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center mt-8">
            <button
              type="submit"
              disabled={loading}
              className="submit-button btn bg-accent-600 hover:bg-accent-700 active:bg-accent-800 text-white font-semibold px-12 py-4 text-lg rounded-xl shadow-xl transition-all duration-300"
              style={{
                backgroundColor: 'var(--color-accent-600)',
                boxShadow: 'var(--shadow-cta)',
                borderRadius: 'var(--radius-xl, 0.75rem)',
                transitionProperty: 'transform, box-shadow, background-color',
                transitionDuration: '0.3s',
                transitionTimingFunction: 'ease'
              }}
            >
              <span className="flex items-center justify-center">
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit Request
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </>
                )}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LessonRequestForm; 