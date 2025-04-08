/*
  Warnings:

  - A unique constraint covering the columns `[quoteId]` on the table `Lesson` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[currentStatusId]` on the table `Lesson` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "LessonRequest" DROP CONSTRAINT "LessonRequest_addressId_fkey";

-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "currentStatusId" TEXT;

-- CreateTable
CREATE TABLE "LessonStatus" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "context" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LessonStatus_lessonId_idx" ON "LessonStatus"("lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "Lesson_quoteId_key" ON "Lesson"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "Lesson_currentStatusId_key" ON "Lesson"("currentStatusId");

-- AddForeignKey
ALTER TABLE "LessonRequest" ADD CONSTRAINT "LessonRequest_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_currentStatusId_fkey" FOREIGN KEY ("currentStatusId") REFERENCES "LessonStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonStatus" ADD CONSTRAINT "LessonStatus_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
