import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card } from '../shared/Card';
const CardsShowcase = ({ className = '' }) => {
    return (_jsxs("div", { className: `grid grid-cols-1 md:grid-cols-3 gap-6 ${className}`, children: [_jsxs(Card, { variant: "primary", title: "Primary Card", children: [_jsx("p", { children: "This is a primary-themed card with customizable content." }), _jsx("p", { className: "text-sm mt-2", children: "It's styled with the primary color theme." })] }), _jsxs(Card, { variant: "secondary", title: "Secondary Card", children: [_jsx("p", { children: "This is a secondary-themed card with customizable content." }), _jsx("p", { className: "text-sm mt-2", children: "It's styled with the secondary color theme." })] }), _jsxs(Card, { variant: "accent", title: "Accent Card", children: [_jsx("p", { children: "This is an accent-themed card with customizable content." }), _jsx("p", { className: "text-sm mt-2", children: "It's styled with the accent color theme." })] })] }));
};
export default CardsShowcase;
