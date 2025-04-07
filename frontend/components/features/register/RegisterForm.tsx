// CACHE-BUSTER: 20250320102127
import React, { useState } from 'react';
import { useAuth } from '@frontend/contexts/AuthContext';
import './RegisterForm.css';

interface RegisterFormProps {
  onSuccess?: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess }) => {
  const { register, error: authError, clearError } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [userType, setUserType] = useState<'STUDENT' | 'TEACHER'>('STUDENT');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Use the authError from context if it exists
  const displayError = error || authError;

  // Reset error when user makes changes to the form
  const resetErrorOnUserAction = () => {
    if (displayError) {
      setError(null);
      clearError();
    }
  };

  const handleFirstNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFirstName(e.target.value);
    resetErrorOnUserAction();
  };

  const handleLastNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLastName(e.target.value);
    resetErrorOnUserAction();
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    resetErrorOnUserAction();
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    resetErrorOnUserAction();
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
    resetErrorOnUserAction();
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhoneNumber(e.target.value);
    resetErrorOnUserAction();
  };

  const handleDateOfBirthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateOfBirth(e.target.value);
    resetErrorOnUserAction();
  };

  const handleUserTypeChange = (newUserType: 'STUDENT' | 'TEACHER') => {
    setUserType(newUserType);
    resetErrorOnUserAction();
  };

  const validateForm = () => {
    // Password validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!firstName || !lastName || !email || !password || !confirmPassword || !phoneNumber || !dateOfBirth) {
      setError('Please fill in all fields');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const registerSuccess = await register({
        firstName,
        lastName,
        email,
        password,
        phoneNumber,
        dateOfBirth,
        userType
      });

      if (registerSuccess) {
        setSuccess(true);
        // Reset form
        setFirstName('');
        setLastName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setPhoneNumber('');
        setDateOfBirth('');

        if (onSuccess) {
          onSuccess();
        }
      }
      // If register returned false, the error should already be set in auth context
    } catch (error: any) {
      // This should only happen for unexpected errors
      console.error('Unexpected error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="register-form">
      {success && (
        <div className="alert alert-success">
          <div className="alert-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          Registration successful! You can now log in.
        </div>
      )}

      {displayError && (
        <div className="alert alert-error">
          <div className="alert-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          {displayError}
          <button
            onClick={() => {
              setError(null);
              clearError();
            }}
            className="clear-error-btn"
            aria-label="Clear error message"
          >
            <span>&times;</span>
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="firstName">First Name</label>
            <input
              id="firstName"
              type="text"
              value={firstName}
              onChange={handleFirstNameChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="lastName">Last Name</label>
            <input
              id="lastName"
              type="text"
              value={lastName}
              onChange={handleLastNameChange}
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group full-width">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="registerPassword">Password</label>
            <input
              id="registerPassword"
              name="password"
              type="password"
              value={password}
              onChange={handlePasswordChange}
              required
              aria-label="Create password"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              required
              aria-label="Confirm password"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="phoneNumber">Phone Number</label>
            <input
              id="phoneNumber"
              type="tel"
              value={phoneNumber}
              onChange={handlePhoneNumberChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="dateOfBirth">Date of Birth</label>
            <input
              id="dateOfBirth"
              type="date"
              value={dateOfBirth}
              onChange={handleDateOfBirthChange}
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group user-type">
            <div className="radio-group">
              <div className="radio-option">
                <input
                  id="studentType"
                  type="radio"
                  name="userType"
                  value="STUDENT"
                  checked={userType === 'STUDENT'}
                  onChange={() => handleUserTypeChange('STUDENT')}
                />
                <label htmlFor="studentType">Student</label>
              </div>

              <div className="radio-option">
                <input
                  id="teacherType"
                  type="radio"
                  name="userType"
                  value="TEACHER"
                  checked={userType === 'TEACHER'}
                  onChange={() => handleUserTypeChange('TEACHER')}
                />
                <label htmlFor="teacherType">Teacher</label>
              </div>
            </div>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <button
              type="submit"
              disabled={isSubmitting}
              className={isSubmitting ? 'loading' : ''}
            >
              {isSubmitting ? 'Registering...' : 'Register'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default RegisterForm; 