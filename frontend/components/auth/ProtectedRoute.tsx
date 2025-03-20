// CACHE-BUSTER: 20250320101632
import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  userTypes?: ('STUDENT' | 'TEACHER')[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ userTypes }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // If not authenticated, redirect to login page
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // If userTypes is specified, check if the user has the required type
  if (userTypes && !userTypes.includes(user.userType)) {
    return <Navigate to="/" replace />;
  }

  // If authenticated and has the required user type, render the children
  return <Outlet />;
};

export default ProtectedRoute; 