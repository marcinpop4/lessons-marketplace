-- CreateEnum
CREATE TYPE "AuthMethodType" AS ENUM ('PASSWORD', 'GOOGLE', 'FACEBOOK');

-- CreateTable
CREATE TABLE "UserAuthMethod" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userType" "UserType" NOT NULL,
    "method" "AuthMethodType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAuthMethod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserAuthMethod_userId_userType_idx" ON "UserAuthMethod"("userId", "userType");

-- CreateIndex
CREATE UNIQUE INDEX "UserAuthMethod_userId_userType_method_key" ON "UserAuthMethod"("userId", "userType", "method");

-- Data Migration: Create auth method entries for existing password credentials
INSERT INTO "UserAuthMethod" ("id", "userId", "userType", "method", "isActive", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid(), 
    "userId", 
    "userType", 
    'PASSWORD'::"AuthMethodType", 
    true, 
    CURRENT_TIMESTAMP, 
    CURRENT_TIMESTAMP
FROM "PasswordCredential";
