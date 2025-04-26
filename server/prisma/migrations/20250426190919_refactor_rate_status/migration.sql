/*
  Warnings:

  - You are about to drop the column `deactivatedAt` on the `TeacherLessonHourlyRate` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[currentStatusId]` on the table `TeacherLessonHourlyRate` will be added. If there are existing duplicate values, this will fail.

*/
-- Step 1: Add the new column FIRST, but don\'t drop the old one yet
ALTER TABLE "TeacherLessonHourlyRate" ADD COLUMN "currentStatusId" TEXT;

-- Step 2: Create the new status table
CREATE TABLE "TeacherLessonHourlyRateStatus" (
    "id" TEXT NOT NULL,
    "rateId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "context" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherLessonHourlyRateStatus_pkey" PRIMARY KEY ("id")
);

-- Step 3: Create initial status records based on deactivatedAt
-- Create INACTIVE statuses for rates that were deactivated
INSERT INTO "TeacherLessonHourlyRateStatus" ("id", "rateId", "status", "createdAt")
SELECT gen_random_uuid(), "id", 'INACTIVE', "deactivatedAt"
FROM "TeacherLessonHourlyRate"
WHERE "deactivatedAt" IS NOT NULL;

-- Create ACTIVE statuses for rates that were active (deactivatedAt IS NULL)
INSERT INTO "TeacherLessonHourlyRateStatus" ("id", "rateId", "status", "createdAt")
SELECT gen_random_uuid(), "id", 'ACTIVE', "createdAt" -- Use original rate creation time for initial active status
FROM "TeacherLessonHourlyRate"
WHERE "deactivatedAt" IS NULL;

-- Step 4: Update the currentStatusId on the main table
-- Link each rate to its newly created status record
UPDATE "TeacherLessonHourlyRate" AS rate
SET "currentStatusId" = status.id
FROM "TeacherLessonHourlyRateStatus" AS status
WHERE rate.id = status."rateId";

-- Step 5: Add indexes and constraints for the new table and column
CREATE INDEX "TeacherLessonHourlyRateStatus_rateId_idx" ON "TeacherLessonHourlyRateStatus"("rateId");
CREATE INDEX "TeacherLessonHourlyRateStatus_status_idx" ON "TeacherLessonHourlyRateStatus"("status");
CREATE UNIQUE INDEX "TeacherLessonHourlyRate_currentStatusId_key" ON "TeacherLessonHourlyRate"("currentStatusId");

-- Add Foreign Key constraints
ALTER TABLE "TeacherLessonHourlyRate" ADD CONSTRAINT "TeacherLessonHourlyRate_currentStatusId_fkey" FOREIGN KEY ("currentStatusId") REFERENCES "TeacherLessonHourlyRateStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TeacherLessonHourlyRateStatus" ADD CONSTRAINT "TeacherLessonHourlyRateStatus_rateId_fkey" FOREIGN KEY ("rateId") REFERENCES "TeacherLessonHourlyRate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 6: NOW drop the old column
ALTER TABLE "TeacherLessonHourlyRate" DROP COLUMN "deactivatedAt";
