-- Cliain 2.0 Phase 0: generalize the tenant/domain model.
-- Hand-written (not `prisma migrate dev`'s naive diff) so existing dev data survives as
-- renames + backfills instead of drop/recreate. See cliain-2.0-prd.md and the Phase 0 plan.

-- =========================================================================================
-- 1. Enums
-- =========================================================================================
ALTER TYPE "AppointmentStatus" RENAME TO "BookingStatus";
CREATE TYPE "BookingMode" AS ENUM ('appointment', 'class', 'reservation', 'request');

-- =========================================================================================
-- 2. Table renames (Doctor -> Tenant, Patient -> Customer, Appointment -> Booking,
--    AppointmentEvent -> BookingEvent) + primary key constraint renames
-- =========================================================================================
ALTER TABLE "Doctor" RENAME TO "Tenant";
ALTER TABLE "Patient" RENAME TO "Customer";
ALTER TABLE "Appointment" RENAME TO "Booking";
ALTER TABLE "AppointmentEvent" RENAME TO "BookingEvent";

ALTER TABLE "Tenant" RENAME CONSTRAINT "Doctor_pkey" TO "Tenant_pkey";
ALTER TABLE "Customer" RENAME CONSTRAINT "Patient_pkey" TO "Customer_pkey";
ALTER TABLE "Booking" RENAME CONSTRAINT "Appointment_pkey" TO "Booking_pkey";
ALTER TABLE "BookingEvent" RENAME CONSTRAINT "AppointmentEvent_pkey" TO "BookingEvent_pkey";

-- =========================================================================================
-- 3. New Tenant columns (vertical/template/plan/market — see src/features/templates)
-- =========================================================================================
ALTER TABLE "Tenant"
  ADD COLUMN "market" TEXT,
  ADD COLUMN "regionCell" TEXT,
  ADD COLUMN "vertical" TEXT NOT NULL DEFAULT 'clinic',
  ADD COLUMN "templateVersion" TEXT NOT NULL DEFAULT 'clinic-v1',
  ADD COLUMN "plan" TEXT NOT NULL DEFAULT 'trial',
  ADD COLUMN "overrides" JSONB NOT NULL DEFAULT '{}';

-- Rename Tenant's own unique indexes for consistency with the new table name.
ALTER INDEX "Doctor_whatsappPhoneNumberId_key" RENAME TO "Tenant_whatsappPhoneNumberId_key";
ALTER INDEX "Doctor_vapiPhoneNumberId_key" RENAME TO "Tenant_vapiPhoneNumberId_key";
ALTER INDEX "Doctor_googleCalendarWatchChannelId_key" RENAME TO "Tenant_googleCalendarWatchChannelId_key";

-- =========================================================================================
-- 4. Simple `doctorId` -> `tenantId` / `patientId` -> `customerId` / `appointmentId` ->
--    `bookingId` column renames. WorkingHours.doctorId is handled separately in section 6
--    (it must become resourceId, not tenantId).
-- =========================================================================================
ALTER TABLE "Membership" RENAME COLUMN "doctorId" TO "tenantId";
ALTER TABLE "Invitation" RENAME COLUMN "doctorId" TO "tenantId";
ALTER TABLE "ClinicSettings" RENAME COLUMN "doctorId" TO "tenantId";
ALTER TABLE "SettingsAudit" RENAME COLUMN "doctorId" TO "tenantId";
ALTER TABLE "Customer" RENAME COLUMN "doctorId" TO "tenantId";
ALTER TABLE "Booking" RENAME COLUMN "doctorId" TO "tenantId";
ALTER TABLE "Booking" RENAME COLUMN "patientId" TO "customerId";
ALTER TABLE "BookingEvent" RENAME COLUMN "doctorId" TO "tenantId";
ALTER TABLE "BookingEvent" RENAME COLUMN "appointmentId" TO "bookingId";
ALTER TABLE "Conversation" RENAME COLUMN "patientId" TO "customerId";

-- Rename the foreign key constraints and indexes that rode along with the columns above, so
-- their names match what a fresh `prisma migrate dev` would generate for the new schema.
ALTER TABLE "Membership" RENAME CONSTRAINT "Membership_doctorId_fkey" TO "Membership_tenantId_fkey";
ALTER INDEX "Membership_doctorId_idx" RENAME TO "Membership_tenantId_idx";
ALTER INDEX "Membership_userId_doctorId_key" RENAME TO "Membership_userId_tenantId_key";

ALTER TABLE "Invitation" RENAME CONSTRAINT "Invitation_doctorId_fkey" TO "Invitation_tenantId_fkey";
ALTER INDEX "Invitation_doctorId_idx" RENAME TO "Invitation_tenantId_idx";

ALTER TABLE "ClinicSettings" RENAME CONSTRAINT "ClinicSettings_doctorId_fkey" TO "ClinicSettings_tenantId_fkey";
ALTER INDEX "ClinicSettings_doctorId_key" RENAME TO "ClinicSettings_tenantId_key";

ALTER TABLE "SettingsAudit" RENAME CONSTRAINT "SettingsAudit_doctorId_fkey" TO "SettingsAudit_tenantId_fkey";
ALTER INDEX "SettingsAudit_doctorId_at_idx" RENAME TO "SettingsAudit_tenantId_at_idx";

ALTER TABLE "Customer" RENAME CONSTRAINT "Patient_doctorId_fkey" TO "Customer_tenantId_fkey";
ALTER INDEX "Patient_doctorId_phone_key" RENAME TO "Customer_tenantId_phone_key";

ALTER TABLE "Booking" RENAME CONSTRAINT "Appointment_doctorId_fkey" TO "Booking_tenantId_fkey";
ALTER TABLE "Booking" RENAME CONSTRAINT "Appointment_patientId_fkey" TO "Booking_customerId_fkey";
ALTER TABLE "Booking" RENAME CONSTRAINT "Appointment_rescheduledFromId_fkey" TO "Booking_rescheduledFromId_fkey";
ALTER INDEX "Appointment_doctorId_startAt_idx" RENAME TO "Booking_tenantId_startAt_idx";
ALTER INDEX "Appointment_patientId_idx" RENAME TO "Booking_customerId_idx";
ALTER INDEX "Appointment_rescheduledFromId_key" RENAME TO "Booking_rescheduledFromId_key";

ALTER TABLE "BookingEvent" RENAME CONSTRAINT "AppointmentEvent_appointmentId_fkey" TO "BookingEvent_bookingId_fkey";
ALTER INDEX "AppointmentEvent_doctorId_at_idx" RENAME TO "BookingEvent_tenantId_at_idx";

ALTER TABLE "Conversation" RENAME CONSTRAINT "Conversation_patientId_fkey" TO "Conversation_customerId_fkey";
ALTER INDEX "Conversation_patientId_createdAt_idx" RENAME TO "Conversation_customerId_createdAt_idx";

-- =========================================================================================
-- 5. Location — one per tenant, backfilled from Tenant.timezone and, where present,
--    ClinicSettings.data.clinic.address.
-- =========================================================================================
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT,
    "timezone" TEXT NOT NULL,
    "address" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Location" ADD CONSTRAINT "Location_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Location" ("id", "tenantId", "name", "timezone", "address", "isPrimary", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  t."id",
  t."clinicName",
  t."timezone",
  cs."data" -> 'clinic' ->> 'address',
  true,
  now(),
  now()
FROM "Tenant" t
LEFT JOIN "ClinicSettings" cs ON cs."tenantId" = t."id";

-- =========================================================================================
-- 6. Resource — one per tenant (the tenant's single practitioner today), backfilled from the
--    name/title/specialty columns that used to live directly on Doctor/Tenant. Those columns
--    are dropped from Tenant in section 10, once this backfill has read them.
-- =========================================================================================
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "attributes" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Resource" ADD CONSTRAINT "Resource_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Resource" ("id", "tenantId", "locationId", "type", "name", "title", "attributes", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  t."id",
  l."id",
  'practitioner',
  t."name",
  t."title",
  CASE WHEN t."specialty" IS NOT NULL THEN jsonb_build_object('specialty', t."specialty") ELSE '{}'::jsonb END,
  now(),
  now()
FROM "Tenant" t
JOIN "Location" l ON l."tenantId" = t."id";

-- =========================================================================================
-- 7. Offering — one per tenant ("Consultation"), backfilled with today's hardcoded
--    SLOT_DURATION_MINUTES (30) from availability-service.ts.
-- =========================================================================================
CREATE TABLE "Offering" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "resourceType" TEXT NOT NULL,
    "fields" JSONB NOT NULL DEFAULT '{}',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Offering_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Offering" ADD CONSTRAINT "Offering_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Offering" ("id", "tenantId", "name", "durationMinutes", "resourceType", "fields", "active", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, t."id", 'Consultation', 30, 'practitioner', '{}', true, now(), now()
FROM "Tenant" t;

-- =========================================================================================
-- 8. WorkingHours: doctorId (-> Tenant) becomes resourceId (-> Resource). Each tenant has
--    exactly one Resource at this point in the migration, so the join is unambiguous.
-- =========================================================================================
ALTER TABLE "WorkingHours" ADD COLUMN "resourceId" TEXT;

UPDATE "WorkingHours" wh
SET "resourceId" = r."id"
FROM "Resource" r
WHERE r."tenantId" = wh."doctorId";

ALTER TABLE "WorkingHours" ALTER COLUMN "resourceId" SET NOT NULL;

ALTER TABLE "WorkingHours" DROP CONSTRAINT "WorkingHours_doctorId_fkey";
DROP INDEX "WorkingHours_doctorId_dayOfWeek_key";
ALTER TABLE "WorkingHours" DROP COLUMN "doctorId";

ALTER TABLE "WorkingHours" ADD CONSTRAINT "WorkingHours_resourceId_fkey"
  FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "WorkingHours_resourceId_dayOfWeek_key" ON "WorkingHours"("resourceId", "dayOfWeek");

-- =========================================================================================
-- 9. Booking: add resourceId/offeringId (backfilled via each tenant's single Resource/
--    Offering), plus mode/partySize/sourceChannel/fields/idempotencyKey.
--    Correctness fix (not just a rename): the double-booking conflict check in
--    appointment-service.ts used to be scoped by doctorId alone, which was fine when a tenant
--    had exactly one resource. It is being rescoped to resourceId in the application code
--    that ships alongside this migration — a multi-resource tenant would otherwise
--    false-conflict across resources.
-- =========================================================================================
ALTER TABLE "Booking"
  ADD COLUMN "resourceId" TEXT,
  ADD COLUMN "offeringId" TEXT,
  ADD COLUMN "mode" "BookingMode" NOT NULL DEFAULT 'appointment',
  ADD COLUMN "partySize" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "sourceChannel" TEXT,
  ADD COLUMN "fields" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "idempotencyKey" TEXT;

UPDATE "Booking" b
SET "resourceId" = r."id"
FROM "Resource" r
WHERE r."tenantId" = b."tenantId";

UPDATE "Booking" b
SET "offeringId" = o."id"
FROM "Offering" o
WHERE o."tenantId" = b."tenantId";

ALTER TABLE "Booking" ALTER COLUMN "resourceId" SET NOT NULL;
ALTER TABLE "Booking" ALTER COLUMN "offeringId" SET NOT NULL;

ALTER TABLE "Booking" ADD CONSTRAINT "Booking_resourceId_fkey"
  FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_offeringId_fkey"
  FOREIGN KEY ("offeringId") REFERENCES "Offering"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Booking_resourceId_startAt_idx" ON "Booking"("resourceId", "startAt");
-- Postgres treats NULLs as distinct in a unique index, so bookings without an idempotency
-- key (anything created before this phase, or via a path that doesn't pass one) never
-- spuriously conflict with each other.
CREATE UNIQUE INDEX "Booking_tenantId_idempotencyKey_key" ON "Booking"("tenantId", "idempotencyKey");

-- =========================================================================================
-- 10. Customer: consentGivenAt -> consents jsonb; add language/tags/fields.
-- =========================================================================================
ALTER TABLE "Customer"
  ADD COLUMN "consents" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "language" TEXT,
  ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "fields" JSONB NOT NULL DEFAULT '{}';

UPDATE "Customer"
SET "consents" = jsonb_build_object('whatsappDisclosure', jsonb_build_object('grantedAt', to_char("consentGivenAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')))
WHERE "consentGivenAt" IS NOT NULL;

ALTER TABLE "Customer" DROP COLUMN "consentGivenAt";

-- =========================================================================================
-- 11. Drop the Tenant columns that moved to Resource in section 6.
-- =========================================================================================
ALTER TABLE "Tenant"
  DROP COLUMN "name",
  DROP COLUMN "title",
  DROP COLUMN "specialty";

-- =========================================================================================
-- 12. UsageEvent — new usage/billing ledger (see src/lib/model-router).
-- =========================================================================================
CREATE TABLE "UsageEvent" (
    "id" BIGSERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "provider" TEXT,
    "model" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "costUsdMicros" BIGINT,
    "channel" TEXT,
    "conversationId" TEXT,
    "bookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UsageEvent_tenantId_createdAt_idx" ON "UsageEvent"("tenantId", "createdAt");
