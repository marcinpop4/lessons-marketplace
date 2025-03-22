import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import LoginForm from '@frontend/components/features/login/LoginForm';
import { useAuth } from '@frontend/contexts/AuthContext';
import './login.css';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const handleSuccess = () => {
    const { from } = location.state || {};
    
    if (user?.userType === 'STUDENT') {
      navigate('/lesson-request', { replace: true });
    } else if (user?.userType === 'TEACHER') {
      navigate('/teacher-dashboard', { replace: true });
    } else if (from) {
      navigate(from.pathname, { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="login-form-container">
      <div className="card card-primary login-card">
        <div className="card-header">
          <h3 className="text-xl font-semibold">Welcome Back</h3>
          <p>Sign in to your account</p>
        </div>
        
        <div className="card-body">
          <LoginForm onSuccess={handleSuccess} />
          <div className="mt-4 text-center">
            <p>Don't have an account? <a href="/register" className="text-primary-600 hover:text-primary-700">Create one</a></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 