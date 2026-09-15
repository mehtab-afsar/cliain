-- AlterTable
ALTER TABLE "Doctor" ADD COLUMN     "googleCalendarSyncToken" TEXT,
ADD COLUMN     "googleCalendarWatchChannelId" TEXT,
ADD COLUMN     "googleCalendarWatchExpiresAt" TIMESTAMP(3),
ADD COLUMN     "googleCalendarWatchResourceId" TEXT,
ADD COLUMN     "googleCalendarWatchToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_googleCalendarWatchChannelId_key" ON "Doctor"("googleCalendarWatchChannelId");
