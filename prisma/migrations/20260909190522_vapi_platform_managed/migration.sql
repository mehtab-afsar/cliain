/*
  Warnings:

  - You are about to drop the column `vapiApiKey` on the `Doctor` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Doctor" DROP COLUMN "vapiApiKey",
ADD COLUMN     "vapiPhoneNumber" TEXT;
