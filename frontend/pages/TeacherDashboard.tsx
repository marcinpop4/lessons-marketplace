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

const TeacherDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
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

    // Fetch teacher profile
    const fetchProfile = async () => {
      try {
        setLoading(true);
        // Use apiClient instead of fetch for consistent error handling and token management
        const response = await apiClient.get('/teachers/profile');
        setProfile(response.data);
      } catch (err) {
        console.error('Error fetching teacher profile:', err);
        
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

    fetchProfile();
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="teacher-dashboard loading">
        <h2>Loading profile...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="teacher-dashboard error">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={handleLogout}>Logout</button>
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
              <p><strong>Name:</strong> {profile.firstName} {profile.lastName}</p>
              <p><strong>Email:</strong> {profile.email}</p>
              <p><strong>Phone:</strong> {profile.phoneNumber}</p>
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