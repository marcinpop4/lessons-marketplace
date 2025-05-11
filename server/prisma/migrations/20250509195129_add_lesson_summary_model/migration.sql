-- CreateTable
CREATE TABLE "LessonSummary" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "homework" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LessonSummary_lessonId_key" ON "LessonSummary"("lessonId");

-- CreateIndex
CREATE INDEX "LessonSummary_lessonId_idx" ON "LessonSummary"("lessonId");

-- AddForeignKey
ALTER TABLE "LessonSummary" ADD CONSTRAINT "LessonSummary_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
