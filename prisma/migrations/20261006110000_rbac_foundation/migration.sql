-- AlterTable
ALTER TABLE "User" ADD COLUMN "createdBy" TEXT,
ADD COLUMN "department" TEXT,
ADD COLUMN "designation" TEXT,
ADD COLUMN "lastLogin" TIMESTAMP(3);
