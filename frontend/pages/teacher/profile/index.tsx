import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import TeacherProfileComponent from '../../../components/features/teacher-dashboard/TeacherProfile';
import TeacherStatsComponent from '../../../components/features/teacher-dashboard/TeacherStats';
import TeacherLessonRatesManager from '../../../components/features/teacher-dashboard/TeacherLessonRatesManager';
import apiClient from '../../../api/apiClient';
import axios from 'axios';
import './profile.css';

// Import shared models
import { Teacher } from '@shared/models/Teacher.js';
import { TeacherLessonHourlyRate } from '@shared/models/TeacherLessonHourlyRate.js';
import { TeacherProfileStats } from '@shared/models/TeacherProfileStats.js';

// Define the new combined profile structure using shared models
interface TeacherDashboardData {
  teacher: Teacher;
  teacherLessonHourlyRates: TeacherLessonHourlyRate[];
  teacherProfileStats: TeacherProfileStats;
}

const TeacherDashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<TeacherDashboardData | null>(null);
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

        if (!user?.id) {
          throw new Error("User ID not found. Cannot fetch teacher data.");
        }

        const [profileResponse, statsResponse] = await Promise.all([
          apiClient.get(`/api/v1/teachers/${user.id}`),
          apiClient.get('/api/v1/teachers/stats')
        ]);

        // Instantiate shared models from API data
        const rawProfileData = profileResponse.data;
        const rawStatsData = statsResponse.data;

        // Instantiate Teacher model (requires mapping rates)
        const mappedRates = (rawProfileData.hourlyRates || []).map((rateData: any) =>
          new TeacherLessonHourlyRate({ ...rateData }) // Assuming API data matches props for now
          // TODO: Add proper mapping if API structure differs from TeacherLessonHourlyRateProps
        );

        const teacherInstance = new Teacher({
          ...rawProfileData,
          dateOfBirth: new Date(rawProfileData.dateOfBirth), // Convert date string
          hourlyRates: mappedRates
        });

        // Instantiate TeacherProfileStats model
        const statsInstance = new TeacherProfileStats(rawStatsData);

        // Set the combined dashboard state
        setDashboardData({
          teacher: teacherInstance,
          teacherLessonHourlyRates: teacherInstance.hourlyRates, // Use rates from the Teacher instance
          teacherProfileStats: statsInstance
        });

      } catch (err) {
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

      {dashboardData && (
        <div className="dashboard-content space-y-6">
          <TeacherProfileComponent profile={{
            firstName: dashboardData.teacher.firstName,
            lastName: dashboardData.teacher.lastName,
            email: dashboardData.teacher.email,
            phoneNumber: dashboardData.teacher.phoneNumber
          }} />

          <TeacherLessonRatesManager
            lessonRates={dashboardData.teacherLessonHourlyRates}
            onRatesUpdated={(updatedRates) => {
              setDashboardData(prevData => {
                if (!prevData) return null;
                const updatedTeacher = new Teacher({
                  ...prevData.teacher,
                  hourlyRates: updatedRates
                });
                return {
                  ...prevData,
                  teacher: updatedTeacher,
                  teacherLessonHourlyRates: updatedRates
                };
              });
            }}
          />

          <TeacherStatsComponent stats={dashboardData.teacherProfileStats} />
        </div>
      )}
    </div>
  );
};

export default TeacherDashboardPage; 