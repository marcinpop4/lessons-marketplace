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
    <div className="teacher-profile card card-secondary">
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
  );
};

export default TeacherProfile; 