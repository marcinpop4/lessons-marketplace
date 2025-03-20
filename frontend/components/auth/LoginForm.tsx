// CACHE-BUSTER: 20250320101632
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import '../../styles/LoginForm.css';

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
    <div className="login-form-container">
      <h2>Login to Your Account</h2>
      
      {success && (
        <div className="success-message">
          You have successfully logged in!
        </div>
      )}
      
      {displayError && (
        <div className="error-message">
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
      
      <form onSubmit={handleSubmit} className="login-form">
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
        
        <div className="form-row user-type-container">
          <label className="user-type-label">I am a:</label>
          <div className="user-type-options">
            <label className="user-type-option">
              <input
                type="radio"
                name="userType"
                value="STUDENT"
                checked={userType === 'STUDENT'}
                onChange={() => handleUserTypeChange('STUDENT')}
              />
              Student
            </label>
            <label className="user-type-option">
              <input
                type="radio"
                name="userType"
                value="TEACHER"
                checked={userType === 'TEACHER'}
                onChange={() => handleUserTypeChange('TEACHER')}
              />
              Teacher
            </label>
          </div>
        
          <div className="form-actions">
            <button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Logging in...' : 'Login'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default LoginForm; 