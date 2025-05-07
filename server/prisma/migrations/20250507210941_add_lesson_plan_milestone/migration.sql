-- CreateEnum
CREATE TYPE "LessonPlanStatusValue" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MilestoneStatusValue" AS ENUM ('CREATED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- DropIndex
DROP INDEX "LessonStatus_status_idx";

-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "milestoneId" TEXT;

-- CreateTable
CREATE TABLE "LessonPlan" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "lessonId" TEXT,
    "teacherId" TEXT NOT NULL,
    "currentStatusId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonPlanStatus" (
    "id" TEXT NOT NULL,
    "lessonPlanId" TEXT NOT NULL,
    "status" "LessonPlanStatusValue" NOT NULL,
    "context" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonPlanStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "lessonPlanId" TEXT NOT NULL,
    "currentStatusId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MilestoneStatus" (
    "id" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "status" "MilestoneStatusValue" NOT NULL,
    "context" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MilestoneStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LessonPlan_lessonId_key" ON "LessonPlan"("lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "LessonPlan_currentStatusId_key" ON "LessonPlan"("currentStatusId");

-- CreateIndex
CREATE INDEX "LessonPlan_lessonId_idx" ON "LessonPlan"("lessonId");

-- CreateIndex
CREATE INDEX "LessonPlan_teacherId_idx" ON "LessonPlan"("teacherId");

-- CreateIndex
CREATE INDEX "LessonPlanStatus_lessonPlanId_idx" ON "LessonPlanStatus"("lessonPlanId");

-- CreateIndex
CREATE INDEX "LessonPlanStatus_status_idx" ON "LessonPlanStatus"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Milestone_currentStatusId_key" ON "Milestone"("currentStatusId");

-- CreateIndex
CREATE INDEX "Milestone_lessonPlanId_idx" ON "Milestone"("lessonPlanId");

-- CreateIndex
CREATE INDEX "MilestoneStatus_milestoneId_idx" ON "MilestoneStatus"("milestoneId");

-- CreateIndex
CREATE INDEX "MilestoneStatus_status_idx" ON "MilestoneStatus"("status");

-- CreateIndex
CREATE INDEX "Lesson_milestoneId_idx" ON "Lesson"("milestoneId");

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonPlan" ADD CONSTRAINT "LessonPlan_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonPlan" ADD CONSTRAINT "LessonPlan_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonPlan" ADD CONSTRAINT "LessonPlan_currentStatusId_fkey" FOREIGN KEY ("currentStatusId") REFERENCES "LessonPlanStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonPlanStatus" ADD CONSTRAINT "LessonPlanStatus_lessonPlanId_fkey" FOREIGN KEY ("lessonPlanId") REFERENCES "LessonPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_lessonPlanId_fkey" FOREIGN KEY ("lessonPlanId") REFERENCES "LessonPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_currentStatusId_fkey" FOREIGN KEY ("currentStatusId") REFERENCES "MilestoneStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneStatus" ADD CONSTRAINT "MilestoneStatus_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
