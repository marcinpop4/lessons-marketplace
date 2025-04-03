import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useTheme } from '../../../contexts/ThemeContext';
const ThemeSwitcher = ({ className = '' }) => {
    const { themeName, setTheme, availableThemes } = useTheme();
    return (_jsx("div", { className: `theme-switcher ${className}`, children: _jsx("select", { value: themeName, onChange: (e) => setTheme(e.target.value), className: "select text-sm", style: {
                backgroundColor: 'var(--color-gray-50)',
                color: 'var(--color-gray-800)',
                borderColor: 'var(--color-gray-200)',
                borderRadius: 'var(--radius-md, 0.375rem)',
            }, children: availableThemes.map((theme) => (_jsxs("option", { value: theme, children: [theme.charAt(0).toUpperCase() + theme.slice(1), " Theme"] }, theme))) }) }));
};
export default ThemeSwitcher;
