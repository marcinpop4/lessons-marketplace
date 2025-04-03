// Test importing from shared using path alias
import { LessonType } from '@shared/models/LessonType';
// Log the imported enum
const lessonTypes = Object.keys(LessonType);
console.log('Available lesson types:', lessonTypes);
