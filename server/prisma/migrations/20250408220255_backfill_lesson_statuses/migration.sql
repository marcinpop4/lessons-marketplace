-- This is a fixed migration for backfilling lesson statuses

-- Backfill lesson statuses for all lessons without a currentStatusId
-- Step 1: Create a status record for each lesson that doesn't have one
WITH lessons_needing_status AS (
  SELECT 
    "id",
    "confirmedAt"
  FROM "Lesson"
  WHERE "currentStatusId" IS NULL
)
INSERT INTO "LessonStatus" ("id", "lessonId", "status", "createdAt", "context")
SELECT 
  gen_random_uuid(),
  "id",
  'REQUESTED',
  "confirmedAt",
  '{}'::jsonb
FROM lessons_needing_status;

-- Step 2: Update lessons to link to their new status
WITH status_updates AS (
  SELECT 
    l."id" AS lesson_id, 
    ls."id" AS status_id
  FROM "Lesson" l
  JOIN "LessonStatus" ls ON l."id" = ls."lessonId"
  WHERE l."currentStatusId" IS NULL
)
UPDATE "Lesson" l
SET "currentStatusId" = s.status_id
FROM status_updates s
WHERE l."id" = s.lesson_id;

-- Verify operation
SELECT 
  COUNT(*) AS total_lessons,
  COUNT(CASE WHEN "currentStatusId" IS NULL THEN 1 END) AS lessons_without_status
FROM "Lesson";