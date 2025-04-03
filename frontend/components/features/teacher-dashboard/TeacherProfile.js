import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import './TeacherProfile.css';
const TeacherProfile = ({ profile }) => {
    return (_jsxs("div", { className: "teacher-profile card card-primary", children: [_jsx("div", { className: "card-header", children: _jsx("h2", { className: "text-xl font-semibold", children: "Profile Information" }) }), _jsx("div", { className: "card-body", children: _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6", children: [_jsxs("div", { className: "profile-field", children: [_jsx("p", { className: "text-sm font-medium text-gray-500", children: "Name" }), _jsxs("p", { className: "text-base", children: [profile.firstName, " ", profile.lastName] })] }), _jsxs("div", { className: "profile-field", children: [_jsx("p", { className: "text-sm font-medium text-gray-500", children: "Email" }), _jsx("p", { className: "text-base", children: profile.email })] }), _jsxs("div", { className: "profile-field", children: [_jsx("p", { className: "text-sm font-medium text-gray-500", children: "Phone" }), _jsx("p", { className: "text-base", children: profile.phoneNumber })] })] }) })] }));
};
export default TeacherProfile;
