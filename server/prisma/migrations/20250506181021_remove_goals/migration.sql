/*
  Warnings:

  - You are about to drop the `Goal` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GoalStatus` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Goal" DROP CONSTRAINT "Goal_currentStatusId_fkey";

-- DropForeignKey
ALTER TABLE "Goal" DROP CONSTRAINT "Goal_lessonId_fkey";

-- DropForeignKey
ALTER TABLE "GoalStatus" DROP CONSTRAINT "GoalStatus_goalId_fkey";

-- DropTable
DROP TABLE "Goal";

-- DropTable
DROP TABLE "GoalStatus";
