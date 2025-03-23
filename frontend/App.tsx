// CACHE-BUSTER: 20250320101632
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom';
import { useAuth, AuthProvider } from '@frontend/contexts/AuthContext';
import LoginPage from '@frontend/pages/login';
import RegisterPage from '@frontend/pages/register';
import LessonRequestPage from '@frontend/pages/lesson-request';
import TeacherQuotesPage from './pages/teacher-quotes';
import LessonConfirmation from '@frontend/pages/lesson-confirmation';
import TeacherDashboard from '@frontend/pages/TeacherDashboard';
import ThemeDemoPage from '@frontend/pages/theme-demo';
import ProtectedRoute from '@frontend/components/common/ProtectedRoute';
import { ThemeSwitcher } from '@frontend/components/shared';
import ThemeProvider from '@frontend/contexts/ThemeContext';
import './App.css';

// Import CSS in the correct order: base styles, theme, components
import '@frontend/index.css';
import '@frontend/styles/theme.css';
import '@frontend/styles/components.css';

// Root redirect component to handle user type specific redirects
const RootRedirect = () => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (user.userType === 'TEACHER') {
    return <Navigate to="/teacher-dashboard" replace />;
  }
  
  if (user.userType === 'STUDENT') {
    return <Navigate to="/lesson-request" replace />;
  }
  
  return <Navigate to="/login" replace />;
};

// Inner component to use hooks
const AppRoutes: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleBackFromQuotes = () => {
    navigate('/lesson-request');
  };

  return (
    <div className="app-container">
      <header className="header">
        <div className="logo-container">
          <img 
            src="/assets/images/lessons-marketplace.png" 
            alt="Lessons Marketplace Logo" 
            className="logo" 
          />
          <Link to="/" className="hover:text-primary-600 transition-colors">
            <h1>Take lessons and Git Gud!</h1>
          </Link>
        </div>
        <div className="flex items-center">
          <ThemeSwitcher className="flex items-center" />
        </div>
      </header>
      
      <main className="main-content animate-slide-up">
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/theme-demo" element={<ThemeDemoPage />} />
          
          {/* Protected routes - Student only */}
          <Route element={<ProtectedRoute userTypes={['STUDENT']} />}>
            <Route 
              path="/lesson-request" 
              element={<LessonRequestPage />} 
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
              element={<TeacherQuotesPage />} 
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
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </main>
      
      <div className="footer">
        <p>Welcome to the Lessons Marketplace project</p>
        <div className="flex items-center gap-4">
          <Link to="/theme-demo">Theme Demo</Link>
          <Link to="/login">Login</Link>
          <Link to="/register">Register</Link>
        </div>
      </div>
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
