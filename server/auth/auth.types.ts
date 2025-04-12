// Define types related to authentication

export interface LoginCredentials {
    email: string;
    password: string;
    userType: 'STUDENT' | 'TEACHER';
}

// Add other auth-related types if needed