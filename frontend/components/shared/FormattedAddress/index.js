import { jsx as _jsx } from "react/jsx-runtime";
import { Address } from '@shared/models/Address';
import './FormattedAddress.css';
const FormattedAddress = ({ address }) => {
    if (!(address instanceof Address)) {
        throw new Error('FormattedAddress: Invalid address provided');
    }
    return (_jsx("span", { className: "formatted-address", children: address.toString() }));
};
export { FormattedAddress };
export default FormattedAddress;
