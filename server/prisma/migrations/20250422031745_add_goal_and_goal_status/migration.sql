-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "estimatedLessonCount" INTEGER NOT NULL,
    "currentStatusId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalStatus" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "context" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoalStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Goal_currentStatusId_key" ON "Goal"("currentStatusId");

-- CreateIndex
CREATE INDEX "Goal_lessonId_idx" ON "Goal"("lessonId");

-- CreateIndex
CREATE INDEX "GoalStatus_goalId_idx" ON "GoalStatus"("goalId");

-- CreateIndex
CREATE INDEX "GoalStatus_status_idx" ON "GoalStatus"("status");

-- CreateIndex
CREATE INDEX "LessonStatus_status_idx" ON "LessonStatus"("status");

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_currentStatusId_fkey" FOREIGN KEY ("currentStatusId") REFERENCES "GoalStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalStatus" ADD CONSTRAINT "GoalStatus_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
