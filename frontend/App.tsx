// CACHE-BUSTER: 20250320101632
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom';
import LessonRequestForm from './components/LessonRequestForm';
import TeacherQuotes from './components/TeacherQuotes';
import AuthPage from './pages/AuthPage';
import LessonConfirmation from './pages/LessonConfirmation';
import TeacherDashboard from './pages/TeacherDashboard';
import ThemeDemoPage from './pages/ThemeDemoPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ThemeProvider from './contexts/ThemeContext';
import ThemeSwitcher from './components/ThemeSwitcher';
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
      <header className="header animate-fade-in">
        <div className="logo-container">
          <img 
            src="/assets/images/lessons-marketplace.png" 
            alt="Lessons Marketplace Logo" 
            className="logo" 
          />
          <h1>Lessons Marketplace</h1>
        </div>
      </header>
      
      <main className="main-content animate-slide-up">
        <Routes>
          {/* Public routes */}
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/theme-demo" element={<ThemeDemoPage />} />
          
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
      </main>
      
      <footer className="footer flex justify-between items-center px-4">
        <p className="read-the-docs">
          Welcome to the Lessons Marketplace project
        </p>
        <div className="flex items-center space-x-4">
          <Link to="/theme-demo" className="text-primary-600 hover:text-primary-700 text-sm">
            Theme Demo
          </Link>
          <ThemeSwitcher className="flex items-center" />
        </div>
      </footer>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>
          <AppRoutes />
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
