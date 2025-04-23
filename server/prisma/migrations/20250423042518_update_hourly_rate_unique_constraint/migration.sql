-- DropIndex
DROP INDEX "TeacherLessonHourlyRate_teacherId_type_key";

-- Create partial unique index for active rates only
CREATE UNIQUE INDEX "TeacherLessonHourlyRate_teacherId_type_active_key" ON "TeacherLessonHourlyRate"("teacherId", "type") WHERE "deactivatedAt" IS NULL;
