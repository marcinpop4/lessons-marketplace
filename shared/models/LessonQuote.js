import { centsToDisplayDollars } from '../types/CurrencyTypes.js';
/**
 * LessonQuote model representing a teacher's quote for a specific lesson request
 * This is created after a student submits a lesson request and before a lesson is booked
 */
export class LessonQuote {
    id;
    lessonRequest;
    teacher;
    costInCents;
    hourlyRateInCents;
    createdAt;
    expiresAt; // Quotes can expire after a certain time period
    constructor(id, lessonRequest, teacher, costInCents, createdAt = new Date(), expiresAt, hourlyRateInCents) {
        this.id = id;
        this.lessonRequest = lessonRequest;
        this.teacher = teacher;
        this.costInCents = costInCents;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
        this.hourlyRateInCents = hourlyRateInCents;
    }
    /**
     * Create a LessonQuote from a LessonRequest and a Teacher
     * Automatically calculates the cost based on teacher's hourly rate
     * @param id Unique identifier for the quote
     * @param lessonRequest The lesson request
     * @param teacher The teacher providing the quote
     * @param expiresAt When the quote expires
     * @returns A new LessonQuote instance
     */
    static createFromRequest(id, lessonRequest, teacher, expiresAt) {
        const hourlyRate = teacher.getHourlyRate(lessonRequest.type);
        if (!hourlyRate) {
            throw new Error(`Teacher does not offer lessons of type: ${lessonRequest.type}`);
        }
        const costInCents = Math.round((hourlyRate.rateInCents * lessonRequest.durationMinutes) / 60);
        return new LessonQuote(id, lessonRequest, teacher, costInCents, new Date(), expiresAt, hourlyRate.rateInCents);
    }
    /**
     * Format the cost as a currency string
     * Note: This should only be used in client-side code for display purposes
     * @param locale The locale to use for formatting (defaults to en-US)
     * @param currency The currency code to use (defaults to USD)
     * @returns Formatted currency string
     */
    getFormattedCost(locale = 'en-US', currency = 'USD') {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency
        }).format(centsToDisplayDollars(this.costInCents));
    }
    /**
     * Check if the quote is still valid (not expired)
     * @returns Boolean indicating if the quote is still valid
     */
    isValid() {
        return new Date() < this.expiresAt;
    }
}
