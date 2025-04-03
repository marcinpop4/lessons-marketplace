import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const Alert = ({ type, title, message, className = '', onClose, }) => {
    const getAlertClasses = () => {
        const baseClasses = 'alert p-4 rounded-md';
        const typeClasses = type === 'success'
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200';
        return `${baseClasses} ${typeClasses} ${className}`;
    };
    const getIcon = () => {
        if (type === 'success') {
            return (_jsx("svg", { className: "w-5 h-5 text-green-600", fill: "currentColor", viewBox: "0 0 20 20", xmlns: "http://www.w3.org/2000/svg", children: _jsx("path", { fillRule: "evenodd", d: "M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z", clipRule: "evenodd" }) }));
        }
        return (_jsx("svg", { className: "w-5 h-5 text-red-600", fill: "currentColor", viewBox: "0 0 20 20", xmlns: "http://www.w3.org/2000/svg", children: _jsx("path", { fillRule: "evenodd", d: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z", clipRule: "evenodd" }) }));
    };
    return (_jsx("div", { className: getAlertClasses(), role: "alert", children: _jsxs("div", { className: "flex", children: [_jsx("div", { className: "flex-shrink-0", children: getIcon() }), _jsxs("div", { className: "ml-3", children: [title && (_jsx("h3", { className: "text-sm font-medium", children: title })), _jsx("div", { className: "text-sm mt-1", children: message })] }), onClose && (_jsx("div", { className: "ml-auto pl-3", children: _jsx("button", { type: "button", className: "inline-flex text-gray-400 hover:text-gray-500 focus:outline-none", onClick: onClose, "aria-label": "Close", children: _jsx("svg", { className: "h-5 w-5", fill: "currentColor", viewBox: "0 0 20 20", xmlns: "http://www.w3.org/2000/svg", children: _jsx("path", { fillRule: "evenodd", d: "M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z", clipRule: "evenodd" }) }) }) }))] }) }));
};
export default Alert;
