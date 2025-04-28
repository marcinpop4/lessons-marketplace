# Project TODOs

## Refactoring
- [x] Refactor model constructors to use object destructuring (`LessonQuote`, `Lesson`, `LessonRequest`, `Student`, `Teacher`, etc.)
- [x] Address remaining `@shared/*` path aliases (decide between relative paths or `tsc-alias`).
- [ ] Update the Service layer so that it receives full objects as inputs.

## Features
- [x] Build out Teacher Lesson page functionality. It will be a /teacher/lessons page. On that page, teachers will be able to see the lessons, grouped by status. REQUESTED, ACCEPTED, COMPLETED, REJECTED, VOIDED. Add buttons that correspond to the allowed transitions in LessonStatus.isValidTransition. Add an h1 for "Lessons Dashboard", h2 for the lesson status, and then create a lesson component, outputing all details. 

## Housekeeping / Review
- [x] Review migration file `server/prisma/migrations/20250412015846_update_lesson_status_rate_optionality/migration.sql`.
- [x] Run full test suite (`pnpm test:clean`) after refactoring is complete.
