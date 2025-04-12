-- AlterTable
ALTER TABLE "LessonQuote" ADD COLUMN     "hourlyRateInCents" INTEGER;

-- Backfill existing rows
UPDATE "LessonQuote" AS lq
SET "hourlyRateInCents" = ROUND(("costInCents" * 60.0) / lr."durationMinutes")
FROM "LessonRequest" AS lr
WHERE lq."lessonRequestId" = lr.id
  AND lq."hourlyRateInCents" IS NULL
  AND lr."durationMinutes" IS NOT NULL 
  AND lr."durationMinutes" > 0;

-- CreateIndex
CREATE INDEX "LessonQuote_lessonRequestId_idx" ON "LessonQuote"("lessonRequestId");

-- CreateIndex
CREATE INDEX "LessonQuote_teacherId_idx" ON "LessonQuote"("teacherId");
