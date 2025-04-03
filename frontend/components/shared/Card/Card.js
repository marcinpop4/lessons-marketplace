import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const Card = ({ title, children, variant = 'primary', className = '', }) => {
    const baseClasses = `card card-${variant} ${className}`;
    return (_jsxs("div", { className: baseClasses, children: [title && (_jsx("div", { className: "card-header", children: _jsx("h3", { className: "text-xl font-semibold", children: title }) })), _jsx("div", { className: "space-y-2", children: children })] }));
};
export default Card;
