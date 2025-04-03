import React from 'react';
import './TeacherProfile.css';

interface TeacherProfileProps {
  profile: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
  };
}

const TeacherProfile: React.FC<TeacherProfileProps> = ({ profile }) => {
  return (
    <div className="teacher-profile card card-primary">
      <div className="card-header">
        <h2 className="text-xl font-semibold">Profile Information</h2>
      </div>
      <div className="card-body">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="profile-field">
            <p className="text-sm font-medium text-gray-500">Name</p>
            <p className="text-base">{profile.firstName} {profile.lastName}</p>
          </div>
          <div className="profile-field">
            <p className="text-sm font-medium text-gray-500">Email</p>
            <p className="text-base">{profile.email}</p>
          </div>
          <div className="profile-field">
            <p className="text-sm font-medium text-gray-500">Phone</p>
            <p className="text-base">{profile.phoneNumber}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherProfile; 