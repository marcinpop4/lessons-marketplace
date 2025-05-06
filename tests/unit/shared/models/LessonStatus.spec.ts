import { LessonStatus, LessonStatusValue, LessonStatusTransition } from '@shared/models/LessonStatus';

describe('LessonStatus Model', () => {
    describe('isValidTransition (static method)', () => {

        // --- Valid Transitions based on LessonStatus.StatusTransitions ---

        it('should allow ACCEPT transition from REQUESTED', () => {
            expect(LessonStatus.isValidTransition(LessonStatusValue.REQUESTED, LessonStatusTransition.ACCEPT)).toBe(true);
        });

        it('should allow REJECT transition from REQUESTED', () => {
            expect(LessonStatus.isValidTransition(LessonStatusValue.REQUESTED, LessonStatusTransition.REJECT)).toBe(true);
        });

        it('should allow VOID transition from ACCEPTED', () => {
            expect(LessonStatus.isValidTransition(LessonStatusValue.ACCEPTED, LessonStatusTransition.VOID)).toBe(true);
        });

        it('should allow VOID transition from REJECTED', () => {
            expect(LessonStatus.isValidTransition(LessonStatusValue.REJECTED, LessonStatusTransition.VOID)).toBe(true);
        });

        it('should allow VOID transition from COMPLETED', () => {
            expect(LessonStatus.isValidTransition(LessonStatusValue.COMPLETED, LessonStatusTransition.VOID)).toBe(true);
        });


        // --- Invalid Transitions based on LessonStatus.StatusTransitions ---

        it('should NOT allow COMPLETE transition from REQUESTED', () => {
            expect(LessonStatus.isValidTransition(LessonStatusValue.REQUESTED, LessonStatusTransition.COMPLETE)).toBe(false);
        });

        it('should NOT allow VOID transition from REQUESTED', () => {
            expect(LessonStatus.isValidTransition(LessonStatusValue.REQUESTED, LessonStatusTransition.VOID)).toBe(false);
        });

        it('should NOT allow ACCEPT transition from ACCEPTED', () => {
            // Cannot ACCEPT again if already ACCEPTED
            expect(LessonStatus.isValidTransition(LessonStatusValue.ACCEPTED, LessonStatusTransition.ACCEPT)).toBe(false);
        });

        it('should NOT allow REJECT transition from ACCEPTED', () => {
            // REJECT is not defined as a transition from ACCEPTED
            expect(LessonStatus.isValidTransition(LessonStatusValue.ACCEPTED, LessonStatusTransition.REJECT)).toBe(false);
        });

        // --- Transitions from States with Limited/No Outgoing Transitions ---

        it('should NOT allow non-VOID transitions FROM REJECTED', () => {
            expect(LessonStatus.isValidTransition(LessonStatusValue.REJECTED, LessonStatusTransition.ACCEPT)).toBe(false);
            expect(LessonStatus.isValidTransition(LessonStatusValue.REJECTED, LessonStatusTransition.REJECT)).toBe(false);
            expect(LessonStatus.isValidTransition(LessonStatusValue.REJECTED, LessonStatusTransition.COMPLETE)).toBe(false);
            // Only VOID is allowed from REJECTED
        });

        it('should NOT allow non-VOID transitions FROM COMPLETED', () => {
            expect(LessonStatus.isValidTransition(LessonStatusValue.COMPLETED, LessonStatusTransition.ACCEPT)).toBe(false);
            expect(LessonStatus.isValidTransition(LessonStatusValue.COMPLETED, LessonStatusTransition.REJECT)).toBe(false);
            expect(LessonStatus.isValidTransition(LessonStatusValue.COMPLETED, LessonStatusTransition.COMPLETE)).toBe(false);
            // Only VOID is allowed from COMPLETED
        });

        it('should NOT allow ANY transitions FROM VOIDED', () => {
            // VOIDED has {} in StatusTransitions map, no transitions allowed
            expect(LessonStatus.isValidTransition(LessonStatusValue.VOIDED, LessonStatusTransition.ACCEPT)).toBe(false);
            expect(LessonStatus.isValidTransition(LessonStatusValue.VOIDED, LessonStatusTransition.REJECT)).toBe(false);
            expect(LessonStatus.isValidTransition(LessonStatusValue.VOIDED, LessonStatusTransition.COMPLETE)).toBe(false);
            expect(LessonStatus.isValidTransition(LessonStatusValue.VOIDED, LessonStatusTransition.VOID)).toBe(false);
        });

        // NOTE: Tests checking transitions TO the same status were removed as they are not applicable
        // to the isValidTransition(currentStatus, transition) signature.
    });

    // Add tests for getResultingStatus
    describe('getResultingStatus (static method)', () => {
        it('should return ACCEPTED when ACCEPT is applied to REQUESTED', () => {
            expect(LessonStatus.getResultingStatus(LessonStatusValue.REQUESTED, LessonStatusTransition.ACCEPT)).toBe(LessonStatusValue.ACCEPTED);
        });

        it('should return REJECTED when REJECT is applied to REQUESTED', () => {
            expect(LessonStatus.getResultingStatus(LessonStatusValue.REQUESTED, LessonStatusTransition.REJECT)).toBe(LessonStatusValue.REJECTED);
        });

        it('should return VOIDED when VOID is applied to ACCEPTED', () => {
            expect(LessonStatus.getResultingStatus(LessonStatusValue.ACCEPTED, LessonStatusTransition.VOID)).toBe(LessonStatusValue.VOIDED);
        });

        it('should return VOIDED when VOID is applied to REJECTED', () => {
            expect(LessonStatus.getResultingStatus(LessonStatusValue.REJECTED, LessonStatusTransition.VOID)).toBe(LessonStatusValue.VOIDED);
        });

        it('should return VOIDED when VOID is applied to COMPLETED', () => {
            expect(LessonStatus.getResultingStatus(LessonStatusValue.COMPLETED, LessonStatusTransition.VOID)).toBe(LessonStatusValue.VOIDED);
        });

        it('should return undefined for invalid transitions (e.g., COMPLETE from REQUESTED)', () => {
            expect(LessonStatus.getResultingStatus(LessonStatusValue.REQUESTED, LessonStatusTransition.COMPLETE)).toBeUndefined();
        });

        it('should return undefined for invalid transitions (e.g., REJECT from ACCEPTED)', () => {
            expect(LessonStatus.getResultingStatus(LessonStatusValue.ACCEPTED, LessonStatusTransition.REJECT)).toBeUndefined();
        });

        it('should return undefined for any transition from terminal state VOIDED', () => {
            expect(LessonStatus.getResultingStatus(LessonStatusValue.VOIDED, LessonStatusTransition.VOID)).toBeUndefined();
            expect(LessonStatus.getResultingStatus(LessonStatusValue.VOIDED, LessonStatusTransition.ACCEPT)).toBeUndefined();
        });
    });
}); 