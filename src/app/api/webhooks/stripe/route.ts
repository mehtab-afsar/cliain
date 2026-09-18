import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { getStripeConfig } from "@/lib/stripe";

/**
 * Maps a Stripe subscription status onto Tenant.plan, the field billing-gating logic actually
 * reads. Anything not "active"/"trialing" collapses back to "trial" — a lapsed/canceled/
 * unpaid subscription should not keep gating open, and "past_due" specifically is surfaced
 * (rather than silently downgraded on the first missed payment) so a future dunning banner in
 * the Billing tab has something to key off.
 */
function planForSubscriptionStatus(status: Stripe.Subscription.Status): string {
  if (status === "active" || status === "trialing") return "pro";
  if (status === "past_due" || status === "unpaid") return "past_due";
  return "trial";
}

function subscriptionPeriodEnd(subscription: Stripe.Subscription): Date | null {
  const seconds = subscription.items.data[0]?.current_period_end;
  return typeof seconds === "number" ? new Date(seconds * 1000) : null;
}

/** Resolves which tenant a Stripe object belongs to: metadata first (set at checkout /
 *  subscription creation, see createCheckoutSession), falling back to looking the Stripe
 *  Customer id up against Tenant.stripeCustomerId for objects where metadata was somehow
 *  missed (e.g. a subscription created directly in the Stripe Dashboard). */
async function resolveTenantId(metadataTenantId: string | undefined, customerId: string | null): Promise<string | null> {
  if (metadataTenantId) return metadataTenantId;
  if (!customerId) return null;
  const tenant = await db.tenant.findUnique({ where: { stripeCustomerId: customerId }, select: { id: true } });
  return tenant?.id ?? null;
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const customerId = typeof session.customer === "string" ? session.customer : (session.customer?.id ?? null);
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : (session.subscription?.id ?? null);
  const tenantId = await resolveTenantId(session.client_reference_id ?? undefined, customerId);
  if (!tenantId) {
    console.error("[stripe-webhook] checkout.session.completed: could not resolve tenant", session.id);
    return;
  }

  await db.tenant.update({
    where: { id: tenantId },
    data: {
      ...(customerId ? { stripeCustomerId: customerId } : {}),
      ...(subscriptionId ? { stripeSubscriptionId: subscriptionId } : {}),
      plan: "pro",
    },
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const tenantId = await resolveTenantId(subscription.metadata?.tenantId, customerId);
  if (!tenantId) {
    console.error("[stripe-webhook] customer.subscription.updated: could not resolve tenant", subscription.id);
    return;
  }

  await db.tenant.update({
    where: { id: tenantId },
    data: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      stripeSubscriptionStatus: subscription.status,
      stripeCurrentPeriodEnd: subscriptionPeriodEnd(subscription),
      plan: planForSubscriptionStatus(subscription.status),
    },
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const tenantId = await resolveTenantId(subscription.metadata?.tenantId, customerId);
  if (!tenantId) {
    console.error("[stripe-webhook] customer.subscription.deleted: could not resolve tenant", subscription.id);
    return;
  }

  await db.tenant.update({
    where: { id: tenantId },
    data: {
      stripeSubscriptionStatus: subscription.status,
      stripeCurrentPeriodEnd: subscriptionPeriodEnd(subscription),
      plan: "trial",
    },
  });
}

/**
 * Verifies Stripe's signature against the RAW request body (same reasoning as
 * verifyMetaSignature in webhook-signatures.ts — re-serializing parsed JSON can change
 * byte-for-byte formatting and break the signature), using Stripe's own
 * `stripe.webhooks.constructEvent`. Returns 501 (not a 500 crash) when Stripe isn't configured
 * at all on this deployment — the whole billing surface is optional scaffolding until a real
 * Stripe account exists.
 */
export async function POST(request: Request) {
  const stripeConfig = getStripeConfig();
  if (!stripeConfig) {
    return NextResponse.json({ error: "Stripe is not configured on this deployment." }, { status: 501 });
  }
  if (!stripeConfig.webhookSecret) {
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET is not configured." }, { status: 501 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  let event: Stripe.Event;
  try {
    if (!signature) throw new Error("Missing stripe-signature header");
    event = stripeConfig.client.webhooks.constructEvent(rawBody, signature, stripeConfig.webhookSecret);
  } catch (error) {
    console.error("[stripe-webhook] Signature verification failed:", error);
    return new NextResponse("Invalid signature", { status: 401 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;
      default:
        break;
    }
  } catch (error) {
    // Stripe retries on a non-2xx response — log and still 500 here (unlike the webhooks
    // above, there's no live phone call or WhatsApp reply depending on this response, so
    // letting Stripe's own retry logic handle a transient DB error is the right behavior).
    console.error(`[stripe-webhook] Failed handling ${event.type}:`, error);
    return NextResponse.json({ error: "Failed to process event" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
