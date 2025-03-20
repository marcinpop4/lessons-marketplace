// CACHE-BUSTER: 20250320101632
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import '../../styles/RegisterForm.css';
import { useNavigate } from 'react-router-dom';

interface RegisterFormProps {
  onSuccess?: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess }) => {
  const { register, error: authError, clearError } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    dateOfBirth: '',
    userType: 'STUDENT' as 'STUDENT' | 'TEACHER',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear password error when either password field changes
    if (name === 'password' || name === 'confirmPassword') {
      setPasswordError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Omit confirmPassword from the data sent to the API
      const { confirmPassword, ...registerData } = formData;
      
      const userData = await register(registerData);
      
      // Store success message flag
      sessionStorage.setItem('registrationSuccess', 'true');
      
      // Short delay to ensure authentication state is fully processed
      setTimeout(() => {
        try {
          // Determine destination based on user type
          const destination = registerData.userType === 'TEACHER' 
            ? '/teacher-dashboard' 
            : '/lesson-request';
          
          // Use navigate function directly for cleaner redirects within React Router
          // This helps maintain React context and authentication state
          navigate(destination);
        } catch (navError) {
          // Emergency fallback if navigation fails
          window.location.replace(registerData.userType === 'TEACHER' 
            ? '/teacher-dashboard' 
            : '/lesson-request');
        }
      }, 200);
    } catch (error) {
      setError((error as Error).message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Use the authError from context if it exists
  const displayError = error || authError;

  return (
    <div className="register-form-container">
      <h2>Create Your Account</h2>
      
      {success && (
        <div className="success-message">
          You have successfully registered!
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
      
      <form onSubmit={handleSubmit} className="register-form">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              className={passwordError ? 'error' : ''}
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
            {passwordError && (
              <p className="error-text">{passwordError}</p>
            )}
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="firstName">First Name</label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              value={formData.firstName}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="lastName">Last Name</label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              value={formData.lastName}
              onChange={handleChange}
              required
            />
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="phoneNumber">Phone Number</label>
            <input
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              value={formData.phoneNumber}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="dateOfBirth">Date of Birth</label>
            <input
              id="dateOfBirth"
              name="dateOfBirth"
              type="date"
              value={formData.dateOfBirth}
              onChange={handleChange}
              required
            />
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group" style={{ flex: '0 0 auto' }}>
            <label>I am a:</label>
            <div className="user-type-options">
              <label className="user-type-option">
                <input
                  type="radio"
                  name="userType"
                  value="STUDENT"
                  checked={formData.userType === 'STUDENT'}
                  onChange={() => setFormData(prev => ({ ...prev, userType: 'STUDENT' }))}
                />
                Student
              </label>
              <label className="user-type-option">
                <input
                  type="radio"
                  name="userType"
                  value="TEACHER"
                  checked={formData.userType === 'TEACHER'}
                  onChange={() => setFormData(prev => ({ ...prev, userType: 'TEACHER' }))}
                />
                Teacher
              </label>
            </div>
          </div>
          
          <div className="form-actions">
            <button
              type="submit"
              disabled={isSubmitting}
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