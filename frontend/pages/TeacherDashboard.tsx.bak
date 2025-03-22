// CACHE-BUSTER: 20250320101632
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import TeacherLessonRatesManager from '../components/TeacherLessonRatesManager';
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
  const location = useLocation();
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [stats, setStats] = useState<TeacherStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  useEffect(() => {
    // Check for registration success in sessionStorage instead of URL
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
    <div className="space-y-6">
      {showSuccessMessage && (
        <div className="alert alert-success">Registration successful!</div>
      )}
      
      <div className="card card-primary">
        <div className="card-header flex justify-between items-center">
          <h1 className="text-2xl font-semibold">Teacher Dashboard</h1>
          <button className="btn btn-secondary" onClick={handleLogout}>Logout</button>
        </div>

        {profile && (
          <div className="card-body space-y-6">
            <div className="card card-secondary">
              <div className="card-header">
                <h2 className="text-xl font-semibold">Profile Information</h2>
              </div>
              <div className="card-body">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Name</p>
                    <p>{profile.firstName} {profile.lastName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p>{profile.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Phone</p>
                    <p>{profile.phoneNumber}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card card-secondary">
              <div className="card-header">
                <h2 className="text-xl font-semibold">Teaching Statistics</h2>
              </div>
              <div className="card-body">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="card card-accent">
                    <div className="card-body text-center">
                      <div className="text-3xl font-bold">{stats?.totalLessons || 0}</div>
                      <div className="text-sm font-medium">Total Lessons</div>
                    </div>
                  </div>
                  <div className="card card-accent">
                    <div className="card-body text-center">
                      <div className="text-3xl font-bold">{stats?.completedLessons || 0}</div>
                      <div className="text-sm font-medium">Completed Lessons</div>
                    </div>
                  </div>
                  <div className="card card-accent">
                    <div className="card-body text-center">
                      <div className="text-3xl font-bold">{stats?.upcomingLessons || 0}</div>
                      <div className="text-sm font-medium">Upcoming Lessons</div>
                    </div>
                  </div>
                  <div className="card card-accent">
                    <div className="card-body text-center">
                      <div className="text-3xl font-bold">{stats?.activeQuotes || 0}</div>
                      <div className="text-sm font-medium">Active Quotes</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card card-secondary">
              <div className="card-header">
                <h2 className="text-xl font-semibold">Lesson Rates Management</h2>
              </div>
              <div className="card-body">
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard; 