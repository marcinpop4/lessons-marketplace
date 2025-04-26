-- AlterTable
ALTER TABLE "LessonQuote" ADD COLUMN     "currentStatusId" TEXT;

-- CreateTable
CREATE TABLE "LessonQuoteStatus" (
    "id" TEXT NOT NULL,
    "lessonQuoteId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "context" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonQuoteStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LessonQuoteStatus_lessonQuoteId_idx" ON "LessonQuoteStatus"("lessonQuoteId");

-- CreateIndex
CREATE INDEX "LessonQuoteStatus_status_idx" ON "LessonQuoteStatus"("status");

-- CreateIndex
CREATE UNIQUE INDEX "LessonQuote_currentStatusId_key" ON "LessonQuote"("currentStatusId");

-- AddForeignKey
ALTER TABLE "LessonQuote" ADD CONSTRAINT "LessonQuote_currentStatusId_fkey" FOREIGN KEY ("currentStatusId") REFERENCES "LessonQuoteStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonQuoteStatus" ADD CONSTRAINT "LessonQuoteStatus_lessonQuoteId_fkey" FOREIGN KEY ("lessonQuoteId") REFERENCES "LessonQuote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill 'ACCEPTED' statuses for existing LessonQuotes linked to a Lesson
-- Uses the LessonQuote's createdAt as the status createdAt for consistency.
-- Includes gen_random_uuid() for the id column.
INSERT INTO "LessonQuoteStatus" ("id", "lessonQuoteId", "status", "createdAt")
SELECT 
    gen_random_uuid(), -- Generate UUID for the id
    lq.id, 
    'ACCEPTED', 
    lq."createdAt"
FROM "LessonQuote" lq
INNER JOIN "Lesson" l ON l."quoteId" = lq.id;

-- Backfill 'CREATED' statuses for existing LessonQuotes NOT linked to a Lesson
-- Uses the LessonQuote's createdAt as the status createdAt for consistency.
-- Includes gen_random_uuid() for the id column.
INSERT INTO "LessonQuoteStatus" ("id", "lessonQuoteId", "status", "createdAt")
SELECT 
    gen_random_uuid(), -- Generate UUID for the id
    lq.id, 
    'CREATED', 
    lq."createdAt"
FROM "LessonQuote" lq
LEFT JOIN "Lesson" l ON l."quoteId" = lq.id
WHERE l.id IS NULL;

-- Update LessonQuote table to link to the newly created statuses
UPDATE "LessonQuote" lq
SET "currentStatusId" = lqs.id
FROM "LessonQuoteStatus" lqs
WHERE lq.id = lqs."lessonQuoteId";
