/*
  Warnings:

  - You are about to drop the column `googleServiceAccountJson` on the `Doctor` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Doctor" DROP COLUMN "googleServiceAccountJson",
ADD COLUMN     "googleCalendarAccountEmail" TEXT,
ADD COLUMN     "googleCalendarRefreshToken" TEXT;
