import { jsx as _jsx } from "react/jsx-runtime";
const Button = ({ variant = 'primary', size = 'md', className = '', children, ...rest }) => {
    const baseClasses = 'btn';
    const variantClasses = `btn-${variant}`;
    const sizeClasses = size !== 'md' ? `btn-${size}` : '';
    const combinedClasses = [
        baseClasses,
        variantClasses,
        sizeClasses,
        className
    ].filter(Boolean).join(' ');
    return (_jsx("button", { className: combinedClasses, ...rest, children: children }));
};
export default Button;
