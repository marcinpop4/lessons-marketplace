import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import TeacherProfile from '../../components/features/teacher-dashboard/TeacherProfile';
import TeacherStats from '../../components/features/teacher-dashboard/TeacherStats';
import TeacherLessonRatesManager from '../../components/features/teacher-dashboard/TeacherLessonRatesManager';
import apiClient from '../../api/apiClient';
import axios from 'axios';
import './TeacherDashboard.css';

interface TeacherProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string;
  lessonRates: LessonRate[];
}

interface LessonRate {
  id: string;
  type: string;
  rateInCents: number;
  isActive: boolean;
  deactivatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TeacherStats {
  totalLessons: number;
  completedLessons: number;
  upcomingLessons: number;
  activeQuotes: number;
}

const TeacherDashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [stats, setStats] = useState<TeacherStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  useEffect(() => {
    // Check for registration success in sessionStorage
    const registrationSuccess = sessionStorage.getItem('registrationSuccess');
    
    if (registrationSuccess === 'true') {
      setShowSuccessMessage(true);
      
      // Remove the success flag from sessionStorage
      sessionStorage.removeItem('registrationSuccess');
    }
  }, []);
  
  useEffect(() => {
    // Hide success message after 5 seconds
    if (showSuccessMessage) {
      const timer = setTimeout(() => {
        setShowSuccessMessage(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessMessage]);

  useEffect(() => {
    // Redirect if not logged in or not a teacher
    if (!user) {
      navigate('/auth');
      return;
    }

    if (user.userType !== 'TEACHER') {
      navigate('/');
      return;
    }

    // Fetch teacher profile and stats
    const fetchTeacherData = async () => {
      try {
        setLoading(true);
        
        // Use Promise.all to fetch profile and stats in parallel
        const [profileResponse, statsResponse] = await Promise.all([
          apiClient.get('/teachers/profile'),
          apiClient.get('/teachers/stats')
        ]);
        
        setProfile(profileResponse.data);
        setStats(statsResponse.data);
      } catch (err) {
        // Extract more detailed error information
        if (axios.isAxiosError(err)) {
          const errorMessage = err.response?.data?.error || err.message;
          const statusCode = err.response?.status;
          setError(`Error (${statusCode}): ${errorMessage}`);
        } else {
          setError(err instanceof Error ? err.message : 'An error occurred');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherData();
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="card card-primary">
        <div className="card-body">
          <h2 className="text-xl font-semibold mb-2">Loading your dashboard...</h2>
          <p>Please wait while we retrieve your information.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card card-primary">
        <div className="card-body">
          <div className="alert alert-error mb-4">
            <p>{error}</p>
          </div>
          <button onClick={handleLogout} className="btn btn-primary w-full">Logout</button>
        </div>
      </div>
    );
  }

  return (
    <div className="teacher-dashboard space-y-6">
      {showSuccessMessage && (
        <div className="alert alert-success">Registration successful!</div>
      )}
      
      <div className="dashboard-header">
        <h1 className="text-2xl font-semibold">Teacher Dashboard</h1>
        <button className="btn btn-secondary" onClick={handleLogout}>Logout</button>
      </div>

      {profile && (
        <div className="dashboard-content space-y-6">         
          <TeacherProfile profile={profile} />

          <TeacherLessonRatesManager 
            lessonRates={profile.lessonRates} 
            onRatesUpdated={(updatedRates) => {
              setProfile({
                ...profile,
                lessonRates: updatedRates
              });
            }}
          />

          <TeacherStats stats={stats} />
        </div>
      )}
    </div>
  );
};

export default TeacherDashboardPage; 