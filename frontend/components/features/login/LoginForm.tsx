// CACHE-BUSTER: 20250320101632
import React, { useState, useEffect } from 'react';
import { useAuth } from '@frontend/contexts/AuthContext';
import './LoginForm.css';

interface LoginFormProps {
  onSuccess?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const { login, error: authError, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState<'STUDENT' | 'TEACHER'>('STUDENT');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Use the authError from context if it exists
  const displayError = error || authError;

  // Reset error only when user makes changes to the form
  const resetErrorOnUserAction = () => {
    if (displayError) {
      setError(null);
      clearError();
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    resetErrorOnUserAction();
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    resetErrorOnUserAction();
  };

  const handleUserTypeChange = (newUserType: 'STUDENT' | 'TEACHER') => {
    setUserType(newUserType);
    resetErrorOnUserAction();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    
    setIsSubmitting(true);
    console.log('Attempting login...');
    
    try {
      const loginSuccess = await login(email, password, userType);
      console.log('Login result:', { loginSuccess, authError });
      if (loginSuccess) {
        setSuccess(true);
        if (onSuccess) {
          onSuccess();
        }
      }
      // If login returned false, the error should already be set in the auth context
      // We don't need to do anything here as we're using displayError = error || authError
    } catch (error: any) {
      // This should only happen for unexpected errors, not auth failures
      console.error('Unexpected error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
      console.log('Final state:', { error, authError, displayError });
    }
  };

  return (
    <div className="login-form">
      {success && (
        <div className="alert alert-success">
          <div className="alert-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          You have successfully logged in!
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
            <label htmlFor="email">Email Address</label>
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
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={handlePasswordChange}
              required
            />
          </div>
        </div>
        
        <div className="user-type-container">
          <label className="user-type-label">I am a:</label>
          <div className="user-type-options">
            <div className="user-type-option">
              <input
                type="radio"
                id="student"
                name="userType"
                value="STUDENT"
                checked={userType === 'STUDENT'}
                onChange={() => handleUserTypeChange('STUDENT')}
              />
              <label htmlFor="student">Student</label>
            </div>
            <div className="user-type-option">
              <input
                type="radio"
                id="teacher"
                name="userType"
                value="TEACHER"
                checked={userType === 'TEACHER'}
                onChange={() => handleUserTypeChange('TEACHER')}
              />
              <label htmlFor="teacher">Teacher</label>
            </div>
          </div>
        </div>
        
        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Logging in...' : 'Login'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LoginForm; 