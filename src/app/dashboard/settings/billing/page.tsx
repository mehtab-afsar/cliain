import { requireCurrentDoctor } from "@/lib/current-doctor";
import { getTenantById } from "@/features/appointments/services/doctor-repository";
import { getUsageSummary } from "@/features/billing/services/billing-service";
import { getStripeConfig, PLACEHOLDER_PRO_PLAN_PRICE_USD } from "@/lib/stripe";
import { env } from "@/lib/env";
import { BillingTab } from "@/features/billing/components/billing-tab";

export default async function SettingsBillingPage() {
  const { doctorId } = await requireCurrentDoctor();
  const [tenant, usage] = await Promise.all([getTenantById(doctorId), getUsageSummary(doctorId)]);

  const stripeConfig = getStripeConfig();
  // Checkout only actually works when all three are true: a Stripe account is connected, the
  // Pro price id is set, and there's an APP_URL for Stripe to redirect back to (see
  // createCheckoutSession in billing-service.ts, which checks the exact same three things
  // server-side again before minting a real session).
  const checkoutAvailable = Boolean(stripeConfig?.priceIdPro) && Boolean(env.APP_URL);

  // Pass plain serializable values only — never `stripeConfig` (holds a live Stripe client
  // instance) or a function across the Server->Client boundary, same rule messaging/page.tsx
  // documents for TemplateDefinition.
  return (
    <BillingTab
      plan={tenant.plan}
      usage={usage}
      checkoutAvailable={checkoutAvailable}
      placeholderPriceUsd={PLACEHOLDER_PRO_PLAN_PRICE_USD}
    />
  );
}
