/**
 * LessonRequest model representing a student's requirements for a lesson
 * This is created before quotes and actual lessons
 */
export class LessonRequest {
    id;
    type;
    startTime;
    durationMinutes;
    address;
    student;
    constructor(id, type, startTime, durationMinutes, address, student) {
        this.id = id;
        this.type = type;
        this.startTime = startTime;
        this.durationMinutes = durationMinutes;
        this.address = address;
        this.student = student;
    }
    /**
     * Calculate the end time of the requested lesson based on start time and duration
     */
    get endTime() {
        const end = new Date(this.startTime);
        end.setMinutes(end.getMinutes() + this.durationMinutes);
        return end;
    }
    /**
     * Get the formatted address string
     */
    get formattedAddress() {
        return this.address.toString();
    }
    /**
     * Check if the lesson would end after 9pm
     */
    isLessonEndingAfter9pm() {
        return this.endTime.getHours() >= 21; // 9pm
    }
}
