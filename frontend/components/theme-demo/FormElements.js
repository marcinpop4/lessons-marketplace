import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const FormElements = ({ className = '' }) => {
    return (_jsxs("div", { className: `card card-secondary ${className}`, children: [_jsx("div", { className: "card-header", children: _jsx("h3", { className: "text-xl font-semibold", children: "Form Elements" }) }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "demo-input", children: "Text Input" }), _jsx("input", { id: "demo-input", type: "text", placeholder: "Enter text" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "demo-select", children: "Select" }), _jsxs("select", { id: "demo-select", children: [_jsx("option", { value: "", children: "Select an option" }), _jsx("option", { value: "1", children: "Option 1" }), _jsx("option", { value: "2", children: "Option 2" }), _jsx("option", { value: "3", children: "Option 3" })] })] }), _jsxs("div", { className: "form-row", children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "demo-date", children: "Date" }), _jsx("input", { id: "demo-date", type: "date" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "demo-number", children: "Number" }), _jsx("input", { id: "demo-number", type: "number", placeholder: "0" })] })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "demo-textarea", children: "Textarea" }), _jsx("textarea", { id: "demo-textarea", placeholder: "Enter multiple lines of text", rows: 3 })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "block mb-2", children: "Checkbox" }), _jsxs("div", { className: "flex items-center", children: [_jsx("input", { id: "demo-checkbox", type: "checkbox" }), _jsx("label", { htmlFor: "demo-checkbox", className: "ml-2 cursor-pointer", children: "Checkbox option" })] })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { className: "block mb-2", children: "Radio Options" }), _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center", children: [_jsx("input", { id: "demo-radio-1", type: "radio", name: "demo-radio" }), _jsx("label", { htmlFor: "demo-radio-1", className: "ml-2 cursor-pointer", children: "Radio option 1" })] }), _jsxs("div", { className: "flex items-center", children: [_jsx("input", { id: "demo-radio-2", type: "radio", name: "demo-radio" }), _jsx("label", { htmlFor: "demo-radio-2", className: "ml-2 cursor-pointer", children: "Radio option 2" })] })] })] })] })] }));
};
export default FormElements;
