import { LessonSummary as PrismaLessonSummary } from '@prisma/client';
import { LessonSummary as SharedLessonSummary, LessonSummaryProps } from '../../shared/models/LessonSummary.js';

/**
 * Maps a Prisma LessonSummary object to a shared LessonSummary model.
 * @param prismaLessonSummary The LessonSummary object from Prisma.
 * @returns A shared LessonSummary model instance.
 */
export const toSharedLessonSummary = (prismaLessonSummary: PrismaLessonSummary): SharedLessonSummary => {
    const props: LessonSummaryProps = {
        id: prismaLessonSummary.id,
        lessonId: prismaLessonSummary.lessonId,
        summary: prismaLessonSummary.summary,
        homework: prismaLessonSummary.homework,
        createdAt: prismaLessonSummary.createdAt,
        updatedAt: prismaLessonSummary.updatedAt,
    };
    return new SharedLessonSummary(props);
};

// If you need to map from shared to Prisma (e.g., for updates, though less common for creation via DTOs):
// export const toPrismaLessonSummaryCreateInput = (sharedLessonSummary: SharedLessonSummary): Prisma.LessonSummaryCreateInput => {
//   return {
//     lesson: { connect: { id: sharedLessonSummary.lessonId } }, // Assuming lessonId is on shared model to connect
//     summary: sharedLessonSummary.summary,
//     homework: sharedLessonSummary.homework,
//     // id, createdAt, updatedAt are usually handled by Prisma
//   };
// }; 