import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import LessonRequestForm from './components/LessonRequestForm';
import TeacherQuotes from './components/TeacherQuotes';
import AuthPage from './pages/AuthPage';
import LessonConfirmation from './pages/LessonConfirmation';
import TeacherDashboard from './pages/TeacherDashboard';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { AuthProvider, useAuth } from './contexts/AuthContext';
// Import directly to remove dependency on SVG file
import './App.css';

// Root redirect component to handle user type specific redirects
const RootRedirect = () => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  if (user.userType === 'TEACHER') {
    return <Navigate to="/teacher-dashboard" replace />;
  }
  
  if (user.userType === 'STUDENT') {
    return <Navigate to="/lesson-request" replace />;
  }
  
  return <Navigate to="/auth" replace />;
};

// Inner component to use hooks
const AppRoutes = () => {
  // State to store the created lesson request ID
  const [lessonRequestId, setLessonRequestId] = useState<string | null>(null);
  const navigate = useNavigate();

  // Function to handle lesson request submission
  const handleLessonRequestSubmit = (id: string) => {
    setLessonRequestId(id);
    // Use React Router's navigate instead of window.location.href
    navigate(`/teacher-quotes/${id}`);
  };

  // Function to handle going back from teacher quotes
  const handleBackFromQuotes = () => {
    navigate('/lesson-request');
  };

  return (
    <div className="app-container">
      <div className="header">
        <h1>Lessons Marketplace</h1>
      </div>
      
      <div className="main-content">
        <Routes>
          {/* Public routes */}
          <Route path="/auth" element={<AuthPage />} />
          
          {/* Protected routes - Student only */}
          <Route element={<ProtectedRoute userTypes={['STUDENT']} />}>
            <Route 
              path="/lesson-request" 
              element={
                <LessonRequestForm 
                  onSubmitSuccess={handleLessonRequestSubmit} 
                />
              } 
            />
          </Route>
          
          {/* Protected routes - Teacher only */}
          <Route element={<ProtectedRoute userTypes={['TEACHER']} />}>
            <Route 
              path="/teacher-dashboard" 
              element={<TeacherDashboard />} 
            />
          </Route>
          
          {/* Protected routes - Student and Teacher */}
          <Route element={<ProtectedRoute />}>
            <Route 
              path="/teacher-quotes/:lessonRequestId" 
              element={<TeacherQuotes 
                lessonRequestId={lessonRequestId || ''} 
                onBack={handleBackFromQuotes} 
              />} 
            />
            
            {/* Lesson confirmation route */}
            <Route 
              path="/lesson-confirmation/:lessonId" 
              element={<LessonConfirmation />} 
            />
          </Route>
          
          {/* Root route - redirects based on user type */}
          <Route path="/" element={<RootRedirect />} />
          
          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/auth" replace />} />
        </Routes>
      </div>
      
      <div className="footer">
        <p className="read-the-docs">
          Welcome to the Lessons Marketplace project
        </p>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
