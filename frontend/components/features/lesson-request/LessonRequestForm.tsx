import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LessonType } from '@shared/models/LessonType';
import { Address } from '@shared/models/Address';
import { LessonRequest } from '@shared/models/LessonRequest';
import { createLessonRequest } from '@frontend/api/lessonRequestApi';
import { useAuth } from '@frontend/contexts/AuthContext';
import LessonDetailsForm from './LessonDetailsForm';
import AddressForm from './AddressForm';
import './LessonRequestForm.css';

interface LessonRequestFormProps {
  onSubmitSuccess?: (lessonRequestId: string) => void;
}

const LessonRequestForm: React.FC<LessonRequestFormProps> = ({ onSubmitSuccess }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const [formData, setFormData] = useState<{
    type: LessonType;
    startTime: Date;
    durationMinutes: number;
    addressObj: Address;
    studentId: string;
  }>({
    type: LessonType.GUITAR,
    startTime: new Date(),
    durationMinutes: 30,
    addressObj: new Address('', '', '', '', 'USA'),
    studentId: ''
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
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const date = new Date(selectedDate);
      date.setHours(hours || 0, minutes || 0);
      setFormData(prevData => ({
        ...prevData,
        startTime: date
      }));
    }
  }, [selectedDate, selectedTime]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTime = e.target.value;
    setSelectedTime(newTime);

    if (newTime && selectedDate) {
      const [hours, minutes] = newTime.split(':').map(Number);
      const date = new Date(selectedDate);
      date.setHours(hours || 0, minutes || 0);

      const tempRequest = new LessonRequest(
        '',
        formData.type,
        date,
        formData.durationMinutes,
        formData.addressObj,
        {} as any
      );

      if (tempRequest.isLessonEndingAfter9pm()) {
        setError('Lesson cannot end after 9:00 PM. Please choose an earlier time or shorter duration.');
      } else if (error && error.includes('Lesson cannot end after 9:00 PM')) {
        setError(null);
      }
    }
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.target;
    const lessonType = Object.values(LessonType).includes(value as LessonType)
      ? value as LessonType
      : LessonType.GUITAR;

    setFormData(prevData => ({
      ...prevData,
      type: lessonType
    }));
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.target;
    const durationValue = parseInt(value, 10);

    if (selectedTime && selectedDate) {
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const date = new Date(selectedDate);
      date.setHours(hours || 0, minutes || 0);

      const tempRequest = new LessonRequest(
        '',
        formData.type,
        date,
        durationValue,
        formData.addressObj,
        {} as any
      );

      if (tempRequest.isLessonEndingAfter9pm()) {
        setError('Lesson cannot end after 9:00 PM. Please choose an earlier time or shorter duration.');
      } else if (error && error.includes('Lesson cannot end after 9:00 PM')) {
        setError(null);
      }
    }

    setFormData(prevData => ({
      ...prevData,
      durationMinutes: durationValue
    }));
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const addressField = name.split('.')[1] as keyof Address;
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

    // Create a new Date object with the selected date and time
    const [hours, minutes] = selectedTime.split(':').map(Number);
    const date = new Date(selectedDate);
    date.setHours(hours || 0, minutes || 0);

    const tempRequest = new LessonRequest(
      '',
      formData.type,
      date,
      formData.durationMinutes,
      formData.addressObj,
      {} as any
    );

    if (tempRequest.isLessonEndingAfter9pm()) {
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
      // Convert to API payload format
      const payload = {
        type: formData.type,
        startTime: date,
        durationMinutes: formData.durationMinutes,
        addressObj: formData.addressObj,
        studentId: formData.studentId
      };

      const response = await createLessonRequest(payload);
      console.log('Lesson request created:', response);

      setShowSuccessMessage(true);
      // Call the success handler passed via props, using the correct response structure
      if (onSubmitSuccess && response && response.lessonRequest && response.lessonRequest.id) {
        onSubmitSuccess(response.lessonRequest.id);
      }

      // Reset form
      setFormData({
        type: LessonType.GUITAR,
        startTime: new Date(),
        durationMinutes: 30,
        addressObj: new Address('', '', '', '', 'USA'),
        studentId: user?.id || ''
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
    <div className="lesson-request-form">
      {showSuccessMessage && (
        <div className="alert alert-success">
          Lesson request submitted successfully!
        </div>
      )}
      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="lesson-request-cards">
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
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Submitting...' : 'Submit Request'}
        </button>
      </form>
    </div>
  );
};

export default LessonRequestForm; 