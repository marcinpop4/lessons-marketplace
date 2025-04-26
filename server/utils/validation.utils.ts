/**
 * Checks if a string is a valid UUID.
 * @param id The string to check.
 * @returns True if the string is a valid UUID, false otherwise.
 */
export const isUuid = (id: string): boolean => {
    if (!id || typeof id !== 'string') {
        return false;
    }
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    return uuidRegex.test(id);
}; 