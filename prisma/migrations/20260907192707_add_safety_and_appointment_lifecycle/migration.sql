-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AppointmentStatus" ADD VALUE 'arrived';
ALTER TYPE "AppointmentStatus" ADD VALUE 'in_progress';
ALTER TYPE "AppointmentStatus" ADD VALUE 'rescheduled';

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "completedBy" TEXT,
ADD COLUMN     "rescheduledFromId" TEXT,
ADD COLUMN     "statusReason" TEXT;

-- AlterTable
ALTER TABLE "Doctor" ADD COLUMN     "emergencyScript" TEXT,
ADD COLUMN     "escalationWhatsappNumber" TEXT;

-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "consentGivenAt" TIMESTAMP(3),
ADD COLUMN     "needsHumanReview" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "needsHumanReviewAt" TIMESTAMP(3),
ADD COLUMN     "needsHumanReviewReason" TEXT;

-- CreateTable
CREATE TABLE "AppointmentEvent" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fromStatus" "AppointmentStatus",
    "toStatus" "AppointmentStatus" NOT NULL,
    "actor" TEXT NOT NULL,
    "channel" TEXT,
    "reason" TEXT,

    CONSTRAINT "AppointmentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AppointmentEvent_doctorId_at_idx" ON "AppointmentEvent"("doctorId", "at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_rescheduledFromId_key" ON "Appointment"("rescheduledFromId");

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_rescheduledFromId_fkey" FOREIGN KEY ("rescheduledFromId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentEvent" ADD CONSTRAINT "AppointmentEvent_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

