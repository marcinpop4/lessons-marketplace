/*
  Warnings:

  - You are about to modify the Lesson table to implement the new booking flow with LessonRequest and LessonQuote.
    This migration handles existing data by creating corresponding LessonRequest and LessonQuote records.
*/

-- First drop the foreign keys
ALTER TABLE "Lesson" DROP CONSTRAINT IF EXISTS "Lesson_studentId_fkey";
ALTER TABLE "Lesson" DROP CONSTRAINT IF EXISTS "Lesson_teacherId_fkey";

-- Create the new tables first
-- CreateTable
CREATE TABLE "LessonRequest" (
    "id" TEXT NOT NULL,
    "type" "LessonType" NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonQuote" (
    "id" TEXT NOT NULL,
    "costInCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lessonRequestId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonQuote_pkey" PRIMARY KEY ("id")
);

-- Add foreign keys for the new tables
-- AddForeignKey
ALTER TABLE "LessonRequest" ADD CONSTRAINT "LessonRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonQuote" ADD CONSTRAINT "LessonQuote_lessonRequestId_fkey" FOREIGN KEY ("lessonRequestId") REFERENCES "LessonRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonQuote" ADD CONSTRAINT "LessonQuote_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Migrate existing data
-- Create a temporary column to store the quote ID for each lesson
ALTER TABLE "Lesson" ADD COLUMN "tmp_quote_id" TEXT;

-- For each existing lesson, create a LessonRequest (use student or a default)
DO $$
DECLARE
    lesson_record RECORD;
    default_student_id TEXT;
    request_id TEXT;
    quote_id TEXT;
    cost_in_cents INTEGER;
BEGIN
    -- Get a default student ID for lessons without a student
    SELECT id INTO default_student_id FROM "Student" LIMIT 1;
    
    -- Process each lesson
    FOR lesson_record IN SELECT * FROM "Lesson" LOOP
        -- Generate UUIDs for new records
        request_id := gen_random_uuid()::TEXT;
        quote_id := gen_random_uuid()::TEXT;
        
        -- Calculate approximate cost (60 minutes * rate / 60)
        SELECT COALESCE(
            (SELECT "rateInCents" FROM "TeacherLessonHourlyRate" WHERE "teacherId" = lesson_record."teacherId" AND "type" = lesson_record."type"),
            5000 -- Default to $50 if no rate found
        ) INTO cost_in_cents;
        
        -- Create LessonRequest
        INSERT INTO "LessonRequest" ("id", "type", "startTime", "durationMinutes", "address", "studentId", "createdAt", "updatedAt")
        VALUES (
            request_id,
            lesson_record."type",
            lesson_record."startTime",
            lesson_record."durationMinutes",
            lesson_record."address",
            COALESCE(lesson_record."studentId", default_student_id),
            lesson_record."createdAt",
            lesson_record."updatedAt"
        );
        
        -- Create LessonQuote
        INSERT INTO "LessonQuote" ("id", "costInCents", "createdAt", "expiresAt", "lessonRequestId", "teacherId", "updatedAt")
        VALUES (
            quote_id,
            cost_in_cents,
            lesson_record."createdAt",
            lesson_record."createdAt" + INTERVAL '48 HOURS',
            request_id,
            lesson_record."teacherId",
            lesson_record."updatedAt"
        );
        
        -- Update the lesson with the quote ID
        UPDATE "Lesson" SET "tmp_quote_id" = quote_id WHERE "id" = lesson_record."id";
    END LOOP;
END $$;

-- Add the quoteId column with NOT NULL constraint and copy data from temp column
ALTER TABLE "Lesson" ADD COLUMN "quoteId" TEXT;
UPDATE "Lesson" SET "quoteId" = "tmp_quote_id";
ALTER TABLE "Lesson" ALTER COLUMN "quoteId" SET NOT NULL;

-- Add the confirmedAt column
ALTER TABLE "Lesson" ADD COLUMN "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Drop the temporary column and old columns
ALTER TABLE "Lesson" DROP COLUMN "tmp_quote_id";
ALTER TABLE "Lesson" DROP COLUMN "type";
ALTER TABLE "Lesson" DROP COLUMN "startTime";
ALTER TABLE "Lesson" DROP COLUMN "durationMinutes";
ALTER TABLE "Lesson" DROP COLUMN "address";
ALTER TABLE "Lesson" DROP COLUMN "teacherId";
ALTER TABLE "Lesson" DROP COLUMN "studentId";

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "LessonQuote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
