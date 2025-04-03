import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTheme } from '../../contexts/ThemeContext';
import { ColorSwatch } from '../shared';
const ColorPalettes = ({ className = '' }) => {
    const { theme } = useTheme();
    return (_jsxs("div", { className: `grid grid-cols-1 md:grid-cols-3 gap-6 ${className}`, children: [_jsxs("div", { className: "space-y-2", children: [_jsx("h3", { className: "text-xl font-semibold text-primary", children: "Primary Colors" }), _jsx("div", { className: "space-y-1", children: Object.entries(theme.colors.primary).map(([shade, color]) => (_jsx(ColorSwatch, { color: color, shade: shade, variant: "primary" }, `primary-${shade}`))) })] }), _jsxs("div", { className: "space-y-2", children: [_jsx("h3", { className: "text-xl font-semibold text-secondary", children: "Secondary Colors" }), _jsx("div", { className: "space-y-1", children: Object.entries(theme.colors.secondary).map(([shade, color]) => (_jsx(ColorSwatch, { color: color, shade: shade, variant: "secondary" }, `secondary-${shade}`))) })] }), _jsxs("div", { className: "space-y-2", children: [_jsx("h3", { className: "text-xl font-semibold text-accent", children: "Accent Colors" }), _jsx("div", { className: "space-y-1", children: Object.entries(theme.colors.accent).map(([shade, color]) => (_jsx(ColorSwatch, { color: color, shade: shade, variant: "accent" }, `accent-${shade}`))) })] })] }));
};
export default ColorPalettes;
