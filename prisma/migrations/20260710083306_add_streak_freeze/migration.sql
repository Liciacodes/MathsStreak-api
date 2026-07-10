-- AlterTable
ALTER TABLE "User" ADD COLUMN     "freezesAvailable" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "lastFreezeReset" TIMESTAMP(3);
