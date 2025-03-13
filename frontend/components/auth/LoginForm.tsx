import React, { useState } from 'react';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      await login(email, password, userType);
      setSuccess(true);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Login error:', error);
      setError((error as Error).message || 'Failed to log in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Use the authError from context if it exists
  const displayError = error || authError;

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
          {authError && (
            <button 
              onClick={clearError}
              className="clear-error-btn"
            >
              <span>&times;</span>
            </button>
          )}
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
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
                onChange={() => setUserType('STUDENT')}
              />
              Student
            </label>
            <label className="user-type-option">
              <input
                type="radio"
                name="userType"
                value="TEACHER"
                checked={userType === 'TEACHER'}
                onChange={() => setUserType('TEACHER')}
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