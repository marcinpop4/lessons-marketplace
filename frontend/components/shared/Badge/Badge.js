import { jsx as _jsx } from "react/jsx-runtime";
const Badge = ({ label, variant = 'primary', className = '' }) => {
    const getVariantClasses = () => {
        switch (variant) {
            case 'primary':
                return 'bg-primary-100 text-primary-800';
            case 'success':
                return 'bg-green-100 text-green-800';
            case 'warning':
                return 'bg-yellow-100 text-yellow-800';
            case 'accent':
                return 'bg-accent-100 text-accent-800';
            default:
                return 'bg-primary-100 text-primary-800';
        }
    };
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    const variantClasses = getVariantClasses();
    return (_jsx("span", { className: `${baseClasses} ${variantClasses} ${className}`, children: label }));
};
export default Badge;
