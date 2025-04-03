import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ThemedCard } from '../shared';
const HeaderElementsCard = ({ className = '' }) => {
    return (_jsx(ThemedCard, { title: "Header Elements in Card", variant: "primary", className: className, children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("h1", { className: "mb-2", children: "H1: Main Page Title" }), _jsx("div", { className: "text-xs mb-4", children: _jsx("code", { className: "bg-secondary-100 px-1 py-0.5 rounded", children: "text-3xl font-bold" }) }), _jsx("h2", { className: "mb-2", children: "H2: Section Heading" }), _jsx("div", { className: "text-xs mb-4", children: _jsx("code", { className: "bg-secondary-100 px-1 py-0.5 rounded", children: "text-2xl font-bold" }) }), _jsx("h3", { className: "mb-2", children: "H3: Subsection Heading" }), _jsx("div", { className: "text-xs mb-4", children: _jsx("code", { className: "bg-secondary-100 px-1 py-0.5 rounded", children: "text-xl font-semibold" }) }), _jsx("h4", { className: "mb-2", children: "H4: Group Heading" }), _jsx("div", { className: "text-xs mb-4", children: _jsx("code", { className: "bg-secondary-100 px-1 py-0.5 rounded", children: "text-lg font-medium" }) }), _jsx("h5", { className: "mb-2", children: "H5: Minor Heading" }), _jsx("div", { className: "text-xs mb-4", children: _jsx("code", { className: "bg-secondary-100 px-1 py-0.5 rounded", children: "text-base font-medium" }) }), _jsx("h6", { className: "mb-2", children: "H6: Detail Heading" }), _jsx("div", { className: "text-xs mb-4", children: _jsx("code", { className: "bg-secondary-100 px-1 py-0.5 rounded", children: "text-sm font-medium" }) })] }), _jsxs("div", { className: "border-t border-secondary-200 pt-4", children: [_jsx("h4", { className: "text-sm font-medium mb-2", children: "Theme-specific Variations" }), _jsxs("div", { className: "space-y-2", children: [_jsx("p", { className: "text-primary", children: "Primary text variation" }), _jsx("p", { className: "text-secondary", children: "Secondary text variation" }), _jsx("p", { className: "text-accent", children: "Accent text variation" })] })] })] }) }));
};
export default HeaderElementsCard;
