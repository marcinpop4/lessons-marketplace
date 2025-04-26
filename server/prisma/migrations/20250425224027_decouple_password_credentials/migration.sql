/*
  Warnings:

  - You are about to drop the column `authMethods` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `authMethods` on the `Teacher` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `Teacher` table. All the data in the column will be lost.

*/

-- CreateTable: Create the new table first
CREATE TABLE "PasswordCredential" (
    "id" TEXT NOT NULL,
    "hashedPassword" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userType" "UserType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PasswordCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PasswordCredential_userId_userType_idx" ON "PasswordCredential"("userId", "userType");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordCredential_userId_userType_key" ON "PasswordCredential"("userId", "userType");

-- Data Migration: Copy existing passwords before dropping columns
-- Copy passwords from Teacher table
INSERT INTO "PasswordCredential" ("id", "hashedPassword", "userId", "userType", "createdAt", "updatedAt")
SELECT gen_random_uuid(), "password", "id", 'TEACHER'::"UserType", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Teacher"
WHERE "password" IS NOT NULL;

-- Copy passwords from Student table
INSERT INTO "PasswordCredential" ("id", "hashedPassword", "userId", "userType", "createdAt", "updatedAt")
SELECT gen_random_uuid(), "password", "id", 'STUDENT'::"UserType", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Student"
WHERE "password" IS NOT NULL;

-- AlterTable: Now drop the old columns
ALTER TABLE "Student" DROP COLUMN "authMethods",
DROP COLUMN "password";

-- AlterTable
ALTER TABLE "Teacher" DROP COLUMN "authMethods",
DROP COLUMN "password";
