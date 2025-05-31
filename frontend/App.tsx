// CACHE-BUSTER: 20250320101632
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth, AuthProvider } from '@frontend/contexts/AuthContext';

// Import the logger
import logger from '@frontend/utils/logger';

// Common Pages
import LoginPage from '@frontend/pages/common/login';
import RegisterPage from '@frontend/pages/common/register';
import ThemeDemoPage from '@frontend/pages/common/theme-demo';

// Student Pages
import LessonRequestPage from '@frontend/pages/student/lesson-request';
import TeacherQuotesPage from '@frontend/pages/student/teacher-quotes';
import LessonConfirmation from '@frontend/pages/student/lesson-confirmation';
import ObjectivesPage from '@frontend/pages/student/objective/ObjectivesPage';

// Teacher Pages
import TeacherProfilePage from '@frontend/pages/teacher/profile'; // Renamed from TeacherDashboard
import TeacherLessonsPage from '@frontend/pages/teacher/lessons'; // New lessons page
import TeacherLessonDetailsPage from '@frontend/pages/teacher/lessons/details'; // Import the details page
import CreateLessonPlanPage from '@frontend/pages/teacher/lesson-plan'; // Added import for the new page

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

  // Initialize logging when component mounts
  useEffect(() => {
    // Create declarative page groups based on route patterns
    const getPageGroup = (path: string): string => {
      // Static routes
      if (path === '/login') return '/login';
      if (path === '/register') return '/register';
      if (path === '/theme-demo') return '/theme-demo';
      if (path === '/student/lesson-request') return '/student/lesson-request';
      if (path === '/student/objectives') return '/student/objectives';
      if (path === '/teacher/profile') return '/teacher/profile';
      if (path === '/teacher/lessons') return '/teacher/lessons';
      if (path === '/') return '/';

      // Dynamic routes with patterns
      if (path.match(/^\/student\/teacher-quotes\/[^\/]+$/)) return '/student/teacher-quotes/{id}';
      if (path.match(/^\/student\/lesson-confirmation\/[^\/]+$/)) return '/student/lesson-confirmation/{id}';
      if (path.match(/^\/teacher\/lessons\/[^\/]+$/)) return '/teacher/lessons/{id}';
      if (path.match(/^\/teacher\/lessons\/[^\/]+\/create-plan$/)) return '/teacher/lessons/{id}/create-plan';

      // Fallback to the actual path
      logger.warn('Page group fallback', {
        path: path,
        reason: 'No page group pattern defined for this route'
      });
      return path;
    };

    const pageGroup = getPageGroup(currentPath);
    logger.trackPageView(currentPath, undefined, pageGroup);
  }, [currentPath]);

  // Track user authentication changes
  useEffect(() => {
    if (user) {
      logger.setUser(user.id, {
        userType: user.userType,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      });
      logger.info('User authenticated', {
        userType: user.userType,
        userId: user.id
      });
    }
  }, [user]);

  // Navigation handlers
  const handleLogout = () => {
    logger.info('User logging out', { userId: user?.id });
    logout();
  };

  const handleNavigation = (path: string, buttonName: string) => {
    logger.info('Navigation clicked', {
      buttonName,
      targetPath: path,
      currentPath,
      userId: user?.id
    });
    navigate(path);
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
          <Link
            to="/"
            className="hover:text-primary-600 transition-colors"
          >
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
                onClick={() => handleNavigation('/teacher/lessons', 'My Lessons')}
              >
                My Lessons
              </Button>
              <Button
                variant={currentPath === '/teacher/profile' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => handleNavigation('/teacher/profile', 'My Profile')}
              >
                My Profile
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleLogout}
              >
                Logout
              </Button>
            </>
          )}

          {/* Conditional Student Navigation */}
          {user && user.userType === 'STUDENT' && (
            <>
              <Button
                variant={currentPath === '/student/lesson-request' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => handleNavigation('/student/lesson-request', 'Request Lesson')}
              >
                Request Lesson
              </Button>
              <Button
                variant={currentPath === '/student/objectives' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => handleNavigation('/student/objectives', 'My Objectives')}
              >
                My Objectives
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleLogout}
              >
                Logout
              </Button>
            </>
          )}

          {/* Common items like ThemeSwitcher */}
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
            <Route
              path="objectives"
              element={<ObjectivesPage />}
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
            <Route
              path="lessons/:lessonId/create-plan"
              element={<CreateLessonPlanPage />}
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
