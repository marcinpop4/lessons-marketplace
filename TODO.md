# Project TODOs

## Refactoring
- [x] Refactor model constructors to use object destructuring (`LessonQuote`, `Lesson`, `LessonRequest`, `Student`, `Teacher`, etc.)
- [ ] Address remaining `@shared/*` path aliases (decide between relative paths or `tsc-alias`).

## Features
- [ ] Build out Teacher Lesson page functionality.

## Housekeeping / Review
- [ ] Review migration file `server/prisma/migrations/20250412015846_update_lesson_status_rate_optionality/migration.sql`.
- [ ] Run full test suite (`pnpm test:clean`) after refactoring is complete.
