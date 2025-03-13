import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import TeacherLessonRatesManager from '../components/TeacherLessonRatesManager';
import '../styles/TeacherDashboard.css';
import apiClient from '../api/apiClient';
import axios from 'axios';

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

const TeacherDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [stats, setStats] = useState<TeacherStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
        console.error('Error fetching teacher data:', err);
        
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
      <div className="teacher-dashboard loading">
        <h2>Loading your dashboard...</h2>
        <p>Please wait while we retrieve your information.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="teacher-dashboard error">
        <h2>Error Loading Dashboard</h2>
        <p>{error}</p>
        <button onClick={handleLogout} className="logout-button">Logout</button>
      </div>
    );
  }

  return (
    <div className="teacher-dashboard">
      <div className="dashboard-header">
        <h1>Teacher Dashboard</h1>
        <button className="logout-button" onClick={handleLogout}>Logout</button>
      </div>

      {profile && (
        <>
          <div className="profile-section">
            <h2>Profile Information</h2>
            <div className="profile-details">
              <p><strong>Name: </strong>{profile.firstName} {profile.lastName}</p>
              <p><strong>Email: </strong>{profile.email}</p>
              <p><strong>Phone: </strong>{profile.phoneNumber}</p>
            </div>
          </div>

          <div className="profile-section">
            <h2>Teaching Statistics</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">{stats?.totalLessons || 0}</div>
                <div className="stat-label">Total Lessons</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats?.completedLessons || 0}</div>
                <div className="stat-label">Completed Lessons</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats?.upcomingLessons || 0}</div>
                <div className="stat-label">Upcoming Lessons</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats?.activeQuotes || 0}</div>
                <div className="stat-label">Active Quotes</div>
              </div>
            </div>
          </div>

          <div className="lesson-rates-section">
            <h2>Lesson Rates Management</h2>
            <TeacherLessonRatesManager 
              lessonRates={profile.lessonRates} 
              onRatesUpdated={(updatedRates) => {
                setProfile({
                  ...profile,
                  lessonRates: updatedRates
                });
              }}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default TeacherDashboard; 