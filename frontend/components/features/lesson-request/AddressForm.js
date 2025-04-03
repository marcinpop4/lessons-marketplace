import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import './AddressForm.css';
const AddressForm = ({ address, onChange }) => {
    return (_jsxs("div", { className: "card card-accent lesson-request-card", children: [_jsx("div", { className: "card-header", children: _jsx("h3", { children: "Lesson Location" }) }), _jsxs("div", { className: "card-body", children: [_jsxs("div", { className: "form-row", children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "addressObj.street", children: "Street Address" }), _jsx("input", { type: "text", id: "addressObj.street", name: "addressObj.street", value: address.street, onChange: onChange, required: true })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "addressObj.city", children: "City" }), _jsx("input", { type: "text", id: "addressObj.city", name: "addressObj.city", value: address.city, onChange: onChange, required: true })] })] }), _jsxs("div", { className: "form-row", children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "addressObj.state", children: "State" }), _jsx("input", { type: "text", id: "addressObj.state", name: "addressObj.state", value: address.state, onChange: onChange, required: true })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "addressObj.postalCode", children: "Postal Code" }), _jsx("input", { type: "text", id: "addressObj.postalCode", name: "addressObj.postalCode", value: address.postalCode, onChange: onChange, required: true })] })] })] })] }));
};
export default AddressForm;
