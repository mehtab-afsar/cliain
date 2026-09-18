-- Cliain 2.0 billing scaffolding: Stripe customer/subscription linkage on Tenant.
-- Fully additive (new nullable columns only, no renames, no drops) — no risk to existing
-- data. `plan` already existed (default "trial") and is reused, not touched here; the
-- webhook handler in src/app/api/webhooks/stripe/route.ts is what writes "pro"/"trial"/
-- "past_due" into it as subscription state changes.

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT,
ADD COLUMN     "stripeSubscriptionStatus" TEXT,
ADD COLUMN     "stripeCurrentPeriodEnd" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_stripeCustomerId_key" ON "Tenant"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_stripeSubscriptionId_key" ON "Tenant"("stripeSubscriptionId");
