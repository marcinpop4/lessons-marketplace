/*
  Warnings:

  - Made the column `hourlyRateInCents` on table `LessonQuote` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "LessonQuote" ALTER COLUMN "hourlyRateInCents" SET NOT NULL;
