import { LessonStatus, LessonStatusValue } from '@shared/models/LessonStatus';

describe('LessonStatus Model', () => {
    describe('isValidTransition', () => {

        // --- Valid Transitions --- 

        it('should allow REQUESTED -> ACCEPTED', () => {
            expect(LessonStatus.isValidTransition(LessonStatusValue.REQUESTED, LessonStatusValue.ACCEPTED)).toBe(true);
        });

        it('should allow REQUESTED -> REJECTED', () => {
            expect(LessonStatus.isValidTransition(LessonStatusValue.REQUESTED, LessonStatusValue.REJECTED)).toBe(true);
        });

        it('should allow ACCEPTED -> COMPLETED', () => {
            expect(LessonStatus.isValidTransition(LessonStatusValue.ACCEPTED, LessonStatusValue.COMPLETED)).toBe(true);
        });

        it('should allow ACCEPTED -> VOIDED', () => {
            expect(LessonStatus.isValidTransition(LessonStatusValue.ACCEPTED, LessonStatusValue.VOIDED)).toBe(true);
        });

        it('should allow ACCEPTED -> REJECTED', () => {
            expect(LessonStatus.isValidTransition(LessonStatusValue.ACCEPTED, LessonStatusValue.REJECTED)).toBe(true);
        });

        // --- Invalid Transitions --- 

        it('should NOT allow REQUESTED -> COMPLETED', () => {
            expect(LessonStatus.isValidTransition(LessonStatusValue.REQUESTED, LessonStatusValue.COMPLETED)).toBe(false);
        });

        it('should NOT allow REQUESTED -> VOIDED', () => {
            expect(LessonStatus.isValidTransition(LessonStatusValue.REQUESTED, LessonStatusValue.VOIDED)).toBe(false);
        });

        it('should NOT allow ACCEPTED -> REQUESTED', () => {
            expect(LessonStatus.isValidTransition(LessonStatusValue.ACCEPTED, LessonStatusValue.REQUESTED)).toBe(false);
        });

        // --- Terminal States --- 

        it('should NOT allow transitions FROM REJECTED', () => {
            expect(LessonStatus.isValidTransition(LessonStatusValue.REJECTED, LessonStatusValue.ACCEPTED)).toBe(false);
            expect(LessonStatus.isValidTransition(LessonStatusValue.REJECTED, LessonStatusValue.REQUESTED)).toBe(false);
            expect(LessonStatus.isValidTransition(LessonStatusValue.REJECTED, LessonStatusValue.COMPLETED)).toBe(false);
            expect(LessonStatus.isValidTransition(LessonStatusValue.REJECTED, LessonStatusValue.VOIDED)).toBe(false);
        });

        it('should NOT allow transitions FROM COMPLETED', () => {
            expect(LessonStatus.isValidTransition(LessonStatusValue.COMPLETED, LessonStatusValue.ACCEPTED)).toBe(false);
            expect(LessonStatus.isValidTransition(LessonStatusValue.COMPLETED, LessonStatusValue.REQUESTED)).toBe(false);
            expect(LessonStatus.isValidTransition(LessonStatusValue.COMPLETED, LessonStatusValue.REJECTED)).toBe(false);
            expect(LessonStatus.isValidTransition(LessonStatusValue.COMPLETED, LessonStatusValue.VOIDED)).toBe(false);
        });

        it('should NOT allow transitions FROM VOIDED', () => {
            expect(LessonStatus.isValidTransition(LessonStatusValue.VOIDED, LessonStatusValue.ACCEPTED)).toBe(false);
            expect(LessonStatus.isValidTransition(LessonStatusValue.VOIDED, LessonStatusValue.REQUESTED)).toBe(false);
            expect(LessonStatus.isValidTransition(LessonStatusValue.VOIDED, LessonStatusValue.REJECTED)).toBe(false);
            expect(LessonStatus.isValidTransition(LessonStatusValue.VOIDED, LessonStatusValue.COMPLETED)).toBe(false);
        });

        // --- Same Status (Considered valid by the function, handled as no-op by controller) ---
        it('should allow transitions TO the same status', () => {
            expect(LessonStatus.isValidTransition(LessonStatusValue.REQUESTED, LessonStatusValue.REQUESTED)).toBe(true);
            expect(LessonStatus.isValidTransition(LessonStatusValue.ACCEPTED, LessonStatusValue.ACCEPTED)).toBe(true);
            expect(LessonStatus.isValidTransition(LessonStatusValue.REJECTED, LessonStatusValue.REJECTED)).toBe(true);
            expect(LessonStatus.isValidTransition(LessonStatusValue.COMPLETED, LessonStatusValue.COMPLETED)).toBe(true);
            expect(LessonStatus.isValidTransition(LessonStatusValue.VOIDED, LessonStatusValue.VOIDED)).toBe(true);
        });

    });
}); 