-- AlterTable
-- The Vapi tool webhook URL is now fully deterministic (APP_URL + /api/webhooks/vapi/<doctorId>)
-- now that routing is per-clinic, so it's computed at call time instead of stored — a stored,
-- separately-editable copy could drift from the real URL and silently misroute tool calls.
ALTER TABLE "Doctor" DROP COLUMN "vapiToolWebhookUrl";
