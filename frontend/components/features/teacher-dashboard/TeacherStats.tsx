import React from 'react';
import './TeacherStats.css';

interface TeacherStatsProps {
  stats: {
    totalLessons: number;
    completedLessons: number;
    upcomingLessons: number;
    activeQuotes: number;
  } | null;
}

const TeacherStats: React.FC<TeacherStatsProps> = ({ stats }) => {
  return (
    <div className="teacher-stats card card-secondary">
      <div className="card-header">
        <h2 className="text-xl font-semibold">Teaching Statistics</h2>
      </div>
      <div className="card-body">
        <div className="stats-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="stat-card card card-accent">
            <div className="card-body text-center">
              <div className="text-3xl font-bold">{stats?.totalLessons || 0}</div>
              <div className="text-sm font-medium">Total Lessons</div>
            </div>
          </div>
          <div className="stat-card card card-accent">
            <div className="card-body text-center">
              <div className="text-3xl font-bold">{stats?.completedLessons || 0}</div>
              <div className="text-sm font-medium">Completed Lessons</div>
            </div>
          </div>
          <div className="stat-card card card-accent">
            <div className="card-body text-center">
              <div className="text-3xl font-bold">{stats?.upcomingLessons || 0}</div>
              <div className="text-sm font-medium">Upcoming Lessons</div>
            </div>
          </div>
          <div className="stat-card card card-accent">
            <div className="card-body text-center">
              <div className="text-3xl font-bold">{stats?.activeQuotes || 0}</div>
              <div className="text-sm font-medium">Active Quotes</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherStats; 