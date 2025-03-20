// CACHE-BUSTER: 20250320101632
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import LoginForm from '../components/auth/LoginForm';
import RegisterForm from '../components/auth/RegisterForm';
import { useAuth } from '../contexts/AuthContext';
import '../styles/AuthPage.css';

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(
    location.state?.tab === 'register' ? 'register' : 'login'
  );

  const handleSuccess = () => {
    // Get the requested path or use appropriate default based on user type
    const { from } = location.state || {};
    
    // Skip navigation if we're handling this in the RegisterForm component
    if (activeTab === 'register' && user) {
      console.log('Registration success handled by RegisterForm');
      return;
    }
    
    if (user?.userType === 'STUDENT') {
      // Students go to lesson request form
      navigate('/lesson-request', { replace: true });
    } else if (user?.userType === 'TEACHER') {
      // Teachers go to dashboard with registration success state
      navigate('/teacher-dashboard', { 
        replace: true,
        state: { fromRegistration: activeTab === 'register' }
      });
    } else if (from) {
      // Use the original requested path if available
      navigate(from.pathname, { replace: true });
    } else {
      // Default fallback
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-content">
        <div className="auth-tabs">
          <button
            className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => setActiveTab('login')}
          >
            Login
          </button>
          <button
            className={`auth-tab ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => setActiveTab('register')}
          >
            Register
          </button>
        </div>
        
        <div className="auth-form-wrapper">
          {activeTab === 'login' ? (
            <LoginForm onSuccess={handleSuccess} />
          ) : (
            <RegisterForm onSuccess={handleSuccess} />
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage; 