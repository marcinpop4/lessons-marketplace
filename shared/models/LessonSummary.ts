import { z } from 'zod';

// Zod schema for LessonSummary validation (can be used for API input or frontend forms)
export const LessonSummarySchema = z.object({
    id: z.string().uuid(),
    lessonId: z.string().uuid(),
    summary: z.string().min(10, 'Summary must be at least 10 characters.').max(5000, 'Summary cannot exceed 5000 characters.'),
    homework: z.string().min(5, 'Homework must be at least 5 characters.').max(2000, 'Homework cannot exceed 2000 characters.'),
    createdAt: z.date(),
    updatedAt: z.date(),
});

// TypeScript type inferred from the Zod schema
export type LessonSummaryType = z.infer<typeof LessonSummarySchema>;

// Props for constructing a LessonSummary instance
export interface LessonSummaryProps {
    id: string;
    lessonId: string;
    summary: string;
    homework: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export class LessonSummary {
    readonly id: string;
    readonly lessonId: string;
    summary: string;
    homework: string;
    readonly createdAt: Date;
    readonly updatedAt: Date;

    constructor(props: LessonSummaryProps) {
        // Validate with Zod before assigning, if desired, or rely on service-level validation for creation
        // For simplicity here, direct assignment. Consider validation if constructing from untrusted sources.
        this.id = props.id;
        this.lessonId = props.lessonId;
        this.summary = props.summary;
        this.homework = props.homework;
        this.createdAt = props.createdAt || new Date();
        this.updatedAt = props.updatedAt || new Date();
    }
} 