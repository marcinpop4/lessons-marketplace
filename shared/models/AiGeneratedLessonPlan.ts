export interface AiPlannedLesson {
    startTime: string; // Expected format e.g., "YYYY-MM-DD HH:MM" or full ISO from LLM
    durationMinutes: number; // LLM might output "30 minutes", will need parsing to number
}

export interface AiMilestone {
    title: string;
    description: string;
    dueDate: string; // Expected format "YYYY-MM-DD"
    lessons: AiPlannedLesson[];
}

export interface AiObjectiveForPlan {
    title: string;
    description: string;
    dueDate: string; // Expected format "YYYY-MM-DD"
}

export interface AiGeneratedLessonPlan {
    objective: AiObjectiveForPlan;
    milestones: AiMilestone[];
}

// Type for the expected array of recommendations from the LLM
export type AiLessonPlanRecommendationResponse = AiGeneratedLessonPlan[]; 