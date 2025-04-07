import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import LoginForm from '@frontend/components/features/login/LoginForm';
import { useAuth } from '@frontend/contexts/AuthContext';
import { Card } from '@frontend/components/shared/Card';
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
      <Card
        title="Welcome Back"
        subtitle="Sign in to your account"
        variant="primary"
        className="login-card"
      >
        <LoginForm onSuccess={handleSuccess} />
        <div className="mt-4 text-center">
          <p>Don't have an account? <a href="/register" className="text-primary-600 hover:text-primary-700">Create one</a></p>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage; 