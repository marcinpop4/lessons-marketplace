import { jsx as _jsx } from "react/jsx-runtime";
import './FormattedDateTime.css';
const FormattedDateTime = ({ date }) => {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        throw new Error('FormattedDateTime: Invalid date provided');
    }
    const formatDateTime = () => {
        return new Intl.DateTimeFormat('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
        }).format(date);
    };
    return (_jsx("span", { className: "formatted-datetime", children: formatDateTime() }));
};
export { FormattedDateTime };
export default FormattedDateTime;
