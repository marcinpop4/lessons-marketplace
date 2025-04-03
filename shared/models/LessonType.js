/**
 * Enum representing the types of music lessons offered in the marketplace
 */
export var LessonType;
(function (LessonType) {
    LessonType["VOICE"] = "VOICE";
    LessonType["GUITAR"] = "GUITAR";
    LessonType["BASS"] = "BASS";
    LessonType["DRUMS"] = "DRUMS";
})(LessonType || (LessonType = {}));
/**
 * Format a lesson type for display by capitalizing first letter and lowercasing the rest
 * @param type The lesson type to format
 * @returns Formatted lesson type string
 */
export const formatDisplayLabel = (type) => {
    return type.charAt(0) + type.slice(1).toLowerCase();
};
