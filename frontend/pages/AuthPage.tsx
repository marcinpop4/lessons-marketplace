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
    
    if (user?.userType === 'STUDENT') {
      // Students go to lesson request form
      navigate('/lesson-request', { replace: true });
    } else if (user?.userType === 'TEACHER') {
      // Teachers might go to a dashboard or other page
      navigate('/teacher-dashboard', { replace: true });
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
      <h1 className="auth-page-title">Music Lessons Marketplace</h1>
      
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
  );
};

export default AuthPage; 