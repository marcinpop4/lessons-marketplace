import { jsx as _jsx } from "react/jsx-runtime";
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@frontend/contexts/AuthContext';
const ProtectedRoute = ({ userTypes }) => {
    const { user, loading } = useAuth();
    const location = useLocation();
    // Show loading state while checking authentication
    if (loading) {
        return (_jsx("div", { className: "flex justify-center items-center h-screen", children: _jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" }) }));
    }
    // If not authenticated, redirect to login page
    if (!user) {
        return _jsx(Navigate, { to: "/login", state: { from: location }, replace: true });
    }
    // If userTypes is specified, check if the user has the required type
    if (userTypes && !userTypes.includes(user.userType)) {
        return _jsx(Navigate, { to: "/", replace: true });
    }
    // If authenticated and has the required user type, render the children
    return _jsx(Outlet, {});
};
export default ProtectedRoute;
