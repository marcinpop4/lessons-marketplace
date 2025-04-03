import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Badge } from '../shared/Badge';
const BadgesShowcase = ({ className = '' }) => {
    return (_jsxs("div", { className: `flex flex-wrap gap-4 ${className}`, children: [_jsx(Badge, { variant: "primary", label: "Primary" }), _jsx(Badge, { variant: "success", label: "Success" }), _jsx(Badge, { variant: "warning", label: "Warning" }), _jsx(Badge, { variant: "accent", label: "Accent" }), _jsx(Badge, { variant: "primary", label: "New" }), _jsx(Badge, { variant: "success", label: "Completed" }), _jsx(Badge, { variant: "warning", label: "Pending" }), _jsx(Badge, { variant: "accent", label: "Featured" })] }));
};
export default BadgesShowcase;
