// CACHE-BUSTER: 20250320101632
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth, AuthProvider } from '@frontend/contexts/AuthContext';

// Common Pages
import LoginPage from '@frontend/pages/common/login';
import RegisterPage from '@frontend/pages/common/register';
import ThemeDemoPage from '@frontend/pages/common/theme-demo';

// Student Pages
import LessonRequestPage from '@frontend/pages/student/lesson-request';
import TeacherQuotesPage from '@frontend/pages/student/teacher-quotes';
import LessonConfirmation from '@frontend/pages/student/lesson-confirmation';

// Teacher Pages
import TeacherProfilePage from '@frontend/pages/teacher/profile'; // Renamed from TeacherDashboard
import TeacherLessonsPage from '@frontend/pages/teacher/lessons'; // New lessons page
import TeacherLessonDetailsPage from '@frontend/pages/teacher/lessons/details'; // Import the details page

import ProtectedRoute from '@frontend/components/common/ProtectedRoute';
import { ThemeSwitcher, Button } from '@frontend/components/shared';
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
    // Redirect teacher to their lessons page
    return <Navigate to="/teacher/lessons" replace />;
  }

  if (user.userType === 'STUDENT') {
    return <Navigate to="/student/lesson-request" replace />;
  }

  return <Navigate to="/login" replace />;
};

// Inner component to use hooks
const AppRoutes: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  // Update navigation path if needed
  const handleBackFromQuotes = () => {
    navigate('/student/lesson-request');
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
        <nav className="flex items-center gap-4">
          {/* Conditional Teacher Navigation */}
          {user && user.userType === 'TEACHER' && (
            <>
              <Button
                variant={currentPath === '/teacher/lessons' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => navigate('/teacher/lessons')}
              >
                My Lessons
              </Button>
              <Button
                variant={currentPath === '/teacher/profile' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => navigate('/teacher/profile')}
              >
                My Profile
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={logout}
              >
                Logout
              </Button>
            </>
          )}
          {/* Add Student Navigation or common links here */}
          <ThemeSwitcher className="flex items-center" />
        </nav>
      </header>

      <main className="main-content animate-slide-up">
        <Routes>
          {/* Public/Common routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/theme-demo" element={<ThemeDemoPage />} />

          {/* Protected routes - Student only */}
          <Route path="/student" element={<ProtectedRoute userTypes={['STUDENT']} />}>
            <Route
              path="lesson-request"
              element={<LessonRequestPage />}
            />
            <Route
              path="teacher-quotes/:lessonRequestId"
              element={<TeacherQuotesPage />} // Keep this under student?
            />
            <Route
              path="lesson-confirmation/:lessonId"
              element={<LessonConfirmation />} // Keep this under student?
            />
          </Route>

          {/* Protected routes - Teacher only */}
          <Route path="/teacher" element={<ProtectedRoute userTypes={['TEACHER']} />}>
            <Route
              path="profile"
              element={<TeacherProfilePage />}
            />
            <Route
              path="lessons"
              element={<TeacherLessonsPage />}
            />
            <Route
              path="lessons/:lessonId"
              element={<TeacherLessonDetailsPage />}
            />
          </Route>

          {/* Root route - redirects based on user type */}
          <Route path="/" element={<RootRedirect />} />

          {/* Catch all route - redirect to appropriate default or login */}
          <Route path="*" element={<RootRedirect />} />
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
