-- AlterTable
ALTER TABLE "Doctor" ADD COLUMN     "googleServiceAccountJson" TEXT,
ADD COLUMN     "vapiApiKey" TEXT,
ADD COLUMN     "vapiPhoneNumberId" TEXT,
ADD COLUMN     "vapiToolWebhookUrl" TEXT,
ADD COLUMN     "whatsappAccessToken" TEXT,
ADD COLUMN     "whatsappPhoneNumberId" TEXT,
ADD COLUMN     "whatsappVerifyToken" TEXT;
