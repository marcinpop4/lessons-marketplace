import React from 'react';
import { useNavigate } from 'react-router-dom';
import RegisterForm from '@frontend/components/features/register/RegisterForm';
import { useAuth } from '@frontend/contexts/AuthContext';
import './register.css';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSuccess = () => {
    if (user?.userType === 'STUDENT') {
      navigate('/lesson-request', { replace: true });
    } else if (user?.userType === 'TEACHER') {
      navigate('/teacher-dashboard', { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="register-form-container">
      <div className="card card-primary register-card">
        <div className="card-header">
          <h3 className="text-xl font-semibold">Create an Account</h3>
          <p>Join Lessons Marketplace today</p>
        </div>
        
        <div className="card-body">
          <RegisterForm onSuccess={handleSuccess} />
          <div className="mt-4 text-center">
            <p>Already have an account? <a href="/login" className="text-primary-600 hover:text-primary-700">Sign in</a></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage; 