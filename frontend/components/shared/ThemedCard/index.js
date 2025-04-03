import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useTheme } from '../../../contexts/ThemeContext';
/**
 * A card component that demonstrates theme usage
 */
const ThemedCard = ({ title, children, variant = 'primary', className = '', }) => {
    const { themeName } = useTheme();
    // Build the card classes based on variant
    const getCardClasses = () => {
        const baseClasses = `card card-${variant} ${className}`;
        return baseClasses;
    };
    return (_jsxs("div", { className: getCardClasses(), children: [title && (_jsx("div", { className: "card-header", children: _jsxs("h3", { className: "text-xl font-semibold", children: [_jsxs("span", { className: "mr-2", children: [variant === 'primary' && '🌊', variant === 'accent' && '🔥', variant === 'secondary' && '✨'] }), title] }) })), _jsx("div", { className: "space-y-2", children: children }), _jsxs("div", { className: "text-xs text-secondary mt-4 pt-2 border-t border-secondary-200", children: ["Current theme: ", themeName] })] }));
};
export default ThemedCard;
