-- CreateTable
CREATE TABLE "Objective" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "lessonType" "LessonType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "targetDate" TIMESTAMP(3) NOT NULL,
    "currentStatusId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Objective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ObjectiveStatus" (
    "id" TEXT NOT NULL,
    "objectiveId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "context" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ObjectiveStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Objective_currentStatusId_key" ON "Objective"("currentStatusId");

-- CreateIndex
CREATE INDEX "Objective_studentId_idx" ON "Objective"("studentId");

-- CreateIndex
CREATE INDEX "Objective_lessonType_idx" ON "Objective"("lessonType");

-- CreateIndex
CREATE INDEX "ObjectiveStatus_objectiveId_idx" ON "ObjectiveStatus"("objectiveId");

-- CreateIndex
CREATE INDEX "ObjectiveStatus_status_idx" ON "ObjectiveStatus"("status");

-- AddForeignKey
ALTER TABLE "Objective" ADD CONSTRAINT "Objective_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Objective" ADD CONSTRAINT "Objective_currentStatusId_fkey" FOREIGN KEY ("currentStatusId") REFERENCES "ObjectiveStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObjectiveStatus" ADD CONSTRAINT "ObjectiveStatus_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "Objective"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
