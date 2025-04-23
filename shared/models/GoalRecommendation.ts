/**
 * Represents a single AI-generated goal recommendation with flattened properties.
 */
export class GoalRecommendation {
    /** The suggested title for the goal. */
    title: string;
    /** The suggested description for the goal. */
    description: string;
    /** The estimated number of lessons to achieve the goal. */
    estimatedLessonCount: number;
    /** The AI-classified difficulty level (e.g., 'Beginner', 'Intermediate', 'Advanced'). */
    difficulty: string;

    /**
     * Creates an instance of GoalRecommendation from raw data containing a nested 'goal' object.
     * @param data - The raw data object, expected to have a 'goal' property.
     */
    constructor(data: { goal: { title: string; description: string; estimatedLessonCount: number; difficultyLevel: string; } }) {
        // Basic validation: ensure data and data.goal exist
        if (!data || typeof data.goal !== 'object' || data.goal === null) {
            throw new Error('Invalid data provided to GoalRecommendation constructor: missing or invalid "goal" property.');
        }

        // Destructure from the nested goal object
        const { title, description, estimatedLessonCount, difficultyLevel } = data.goal;

        // Basic validation for required fields within goal
        if (typeof title !== 'string' || typeof description !== 'string' || typeof estimatedLessonCount !== 'number' || typeof difficultyLevel !== 'string') {
            console.error("Invalid goal data:", data.goal);
            throw new Error('Invalid data provided for goal properties in GoalRecommendation constructor.');
        }

        // Assign to top-level properties
        this.title = title;
        this.description = description;
        this.estimatedLessonCount = estimatedLessonCount; // Rename happened here
        this.difficulty = difficultyLevel; // Rename happened here
    }

    // Optional: Static factory method if needed later
    /*
    static fromApiResponse(data: any): GoalRecommendation {
      // ... validation ...
      return new GoalRecommendation(data);
    }
    */
}
