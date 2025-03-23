import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LessonType, LessonRequest, Address } from '@frontend/types/lesson';
import { createLessonRequest } from '@frontend/api/lessonRequestApi';
import { useAuth } from '@frontend/contexts/AuthContext';
import LessonDetailsForm from './LessonDetailsForm';
import AddressForm from './AddressForm';
import './LessonRequestForm.css';

// Helper function to check if a lesson would end after 9pm
const isLessonEndingAfter9pm = (startTime: string, durationMinutes: number): boolean => {
  const [hours, minutes] = startTime.split(':').map(Number);
  const startMinutesSinceMidnight = (hours * 60) + minutes;
  const endMinutesSinceMidnight = startMinutesSinceMidnight + durationMinutes;
  return endMinutesSinceMidnight > 1260; // 9pm = 21 hours * 60 minutes
};

interface LessonRequestFormProps {
  onSubmitSuccess?: (lessonRequestId: string) => void;
}

const LessonRequestForm: React.FC<LessonRequestFormProps> = ({ onSubmitSuccess }) => {
  const { user, justRegistered, clearJustRegistered } = useAuth();
  const navigate = useNavigate();
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  
  const [formData, setFormData] = useState<Omit<LessonRequest, 'address'> & { 
    addressObj: Address;
  }>({
    id: '',
    type: LessonType.GUITAR,
    startTime: '',
    durationMinutes: 30,
    addressId: '',
    addressObj: {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'USA'
    },
    studentId: '',
    createdAt: '',
    updatedAt: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');

  useEffect(() => {
    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }
    
    if (user.userType !== 'STUDENT') {
      navigate('/', { replace: true });
      return;
    }
    
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);
    
    setFormData(prevData => ({
      ...prevData,
      studentId: user.id
    }));
  }, [user, navigate]);

  useEffect(() => {
    if (selectedDate && selectedTime) {
      const dateTimeString = `${selectedDate}T${selectedTime}:00`;
      setFormData(prevData => ({
        ...prevData,
        startTime: dateTimeString
      }));
    }
  }, [selectedDate, selectedTime]);

  useEffect(() => {
    const registrationSuccess = sessionStorage.getItem('registrationSuccess');
    if (registrationSuccess === 'true') {
      setShowSuccessMessage(true);
      sessionStorage.removeItem('registrationSuccess');
    }
  }, []);
  
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
    
    if (newTime && isLessonEndingAfter9pm(newTime, formData.durationMinutes)) {
      setError('Lesson cannot end after 9:00 PM. Please choose an earlier time or shorter duration.');
    } else if (error && error.includes('Lesson cannot end after 9:00 PM')) {
      setError(null);
    }
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    // Convert string value to LessonType enum - ensure it's a valid enum value
    const lessonType = Object.values(LessonType).includes(value as LessonType) 
      ? value as LessonType 
      : LessonType.GUITAR;
      
    setFormData(prevData => ({
      ...prevData,
      [name]: lessonType
    }));
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    const durationValue = parseInt(value, 10);
    
    if (selectedTime && isLessonEndingAfter9pm(selectedTime, durationValue)) {
      setError('Lesson cannot end after 9:00 PM. Please choose an earlier time or shorter duration.');
    } else if (error && error.includes('Lesson cannot end after 9:00 PM')) {
      setError(null);
    }
    
    setFormData(prevData => ({
      ...prevData,
      [name]: durationValue
    }));
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const addressField = name.split('.')[1];
    setFormData(prevData => ({
      ...prevData,
      addressObj: {
        ...prevData.addressObj,
        [addressField]: value
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate || !selectedTime) {
      setError('Please select both a date and time for the lesson.');
      return;
    }
    
    if (isLessonEndingAfter9pm(selectedTime, formData.durationMinutes)) {
      setError('Lesson cannot end after 9:00 PM. Please choose an earlier time or shorter duration.');
      return;
    }
    
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
      setShowSuccessMessage(true);
      
      if (onSubmitSuccess && result.id) {
        onSubmitSuccess(result.id);
      }
      
      setFormData({
        id: '',
        type: LessonType.GUITAR,
        startTime: '',
        durationMinutes: 30,
        addressId: '',
        addressObj: {
          street: '',
          city: '',
          state: '',
          postalCode: '',
          country: 'USA'
        },
        studentId: user?.id || '',
        createdAt: '',
        updatedAt: ''
      });
      
      setSelectedTime('');
      setSelectedDate(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while submitting the form.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lesson-request-form-container">
      {(showSuccessMessage || justRegistered) && (
        <div className="alert-success">
          {justRegistered ? 'Registration successful! ' : ''}
          Please fill out this form to request a lesson.
        </div>
      )}
      
      {error && <div className="alert-error">{error}</div>}
      
      <form onSubmit={handleSubmit} className="lesson-request-form">
        <LessonDetailsForm
          type={formData.type}
          durationMinutes={formData.durationMinutes}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          onTypeChange={handleTypeChange}
          onDurationChange={handleDurationChange}
          onDateChange={handleDateChange}
          onTimeChange={handleTimeChange}
        />
        
        <AddressForm
          address={formData.addressObj}
          onChange={handleAddressChange}
        />

        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LessonRequestForm; 