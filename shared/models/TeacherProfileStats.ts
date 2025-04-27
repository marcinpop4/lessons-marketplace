/**
 * Class defining the structure for teacher statistics.
 */
export class TeacherProfileStats {
    totalLessons: number;
    completedLessons: number;
    upcomingLessons: number;
    activeQuotes: number;
    // Consider adding other stats like totalEarnings, goalCompletionRate if needed here

    // Constructor using object destructuring
    constructor({
        totalLessons,
        completedLessons,
        upcomingLessons,
        activeQuotes
    }: {
        totalLessons: number;
        completedLessons: number;
        upcomingLessons: number;
        activeQuotes: number;
    }) {
        this.totalLessons = totalLessons;
        this.completedLessons = completedLessons;
        this.upcomingLessons = upcomingLessons;
        this.activeQuotes = activeQuotes;
    }
} 