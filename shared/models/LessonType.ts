/**
 * @openapi
 * components:
 *   schemas:
 *     LessonType:
 *       type: string
 *       enum:
 *         - VOICE
 *         - GUITAR
 *         - BASS
 *         - DRUMS
 *       description: The type of music lesson.
 */
export enum LessonType {
  VOICE = "VOICE",
  GUITAR = "GUITAR",
  BASS = "BASS",
  DRUMS = "DRUMS"
}

/**
 * Format a lesson type for display by capitalizing first letter and lowercasing the rest
 * 
 * @param type The lesson type to format
 * @returns Formatted lesson type string
 */
export const formatDisplayLabel = (type: string): string => {
  return type.charAt(0) + type.slice(1).toLowerCase();
}; 