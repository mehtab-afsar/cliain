import "server-only";
import Stripe from "stripe";
import { env } from "./env";

/**
 * PLACEHOLDER PRICING NOTICE (not yet confirmed by the founder): the scaffolding in this repo
 * assumes a simple two-tier model —
 *
 *   - "Trial" (free, no card required): today's default (`Tenant.plan === "trial"`), what a
 *     tenant starts on and stays on until they upgrade.
 *   - "Pro" ($49/mo flat, one tier, no seat/usage metering yet): picked as a reasonable
 *     starting anchor for an AI-reception SaaS aimed at small clinics/gyms — in the same
 *     neighborhood as Weave/Podium-style front-desk tools those businesses already evaluate,
 *     comfortably above the LLM cost this deployment actually incurs per tenant per month
 *     (see UsageEvent / getUsageSummary below), and simple enough to not need a pricing page
 *     with tiers before the founder has talked to a single paying customer.
 *
 * This number has NOT been validated against real willingness-to-pay and must be confirmed
 * (or replaced) before going live — treat it as a placeholder wired through STRIPE_PRICE_ID_PRO,
 * not a final price. Create the real Product/Price in the Stripe Dashboard once confirmed.
 */
export const PLACEHOLDER_PRO_PLAN_PRICE_USD = 49;

export type StripeConfig = {
  client: Stripe;
  webhookSecret: string | undefined;
  priceIdPro: string | undefined;
};

/**
 * Env-var feature detection, mirroring getVapiConfig()/googleCalendarConfigured() in
 * integration-credentials.ts: returns null when STRIPE_SECRET_KEY isn't set, so the whole app
 * (build, tests, dev server) keeps working with zero Stripe credentials configured — true of
 * this environment today. Every caller must check for null before acting; nothing here throws
 * on missing config.
 *
 * `webhookSecret`/`priceIdPro` are surfaced (possibly undefined) rather than gating this
 * helper's own nullness, so a caller can give a precise "which piece is missing" error instead
 * of a blanket "Stripe isn't configured" once STRIPE_SECRET_KEY itself is set.
 */
export function getStripeConfig(): StripeConfig | null {
  if (!env.STRIPE_SECRET_KEY) return null;
  return {
    client: new Stripe(env.STRIPE_SECRET_KEY),
    webhookSecret: env.STRIPE_WEBHOOK_SECRET,
    priceIdPro: env.STRIPE_PRICE_ID_PRO,
  };
}
