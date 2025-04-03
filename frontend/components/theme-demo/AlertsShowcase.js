import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Alert } from '../shared/Alert';
const AlertsShowcase = ({ className = '' }) => {
    return (_jsxs("div", { className: `space-y-4 ${className}`, children: [_jsx(Alert, { type: "success", title: "Success Alert", message: "This is a success message that can be used to confirm an action." }), _jsx(Alert, { type: "error", title: "Error Alert", message: "This is an error message that can be used to indicate a problem." }), _jsx(Alert, { type: "success", message: "This is a success alert without a title." }), _jsx(Alert, { type: "error", message: "This is an error alert without a title." }), _jsx(Alert, { type: "success", title: "Closable Success Alert", message: "This success alert includes a close button that can be clicked.", onClose: () => alert('Close button clicked') }), _jsx(Alert, { type: "error", title: "Closable Error Alert", message: "This error alert includes a close button that can be clicked.", onClose: () => alert('Close button clicked') })] }));
};
export default AlertsShowcase;
