-- AlterTable
ALTER TABLE "User" ADD COLUMN     "activeDoctorId" TEXT;

-- AlterTable
ALTER TABLE "Doctor" ADD COLUMN     "whatsappAppSecret" TEXT,
ADD COLUMN     "vapiWebhookSecret" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_whatsappPhoneNumberId_key" ON "Doctor"("whatsappPhoneNumberId");

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_vapiPhoneNumberId_key" ON "Doctor"("vapiPhoneNumberId");
