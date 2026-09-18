"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type BillingTabProps = {
  /** Tenant.plan verbatim — "trial" | "pro" | "past_due" today, or whatever a future plan adds. */
  plan: string;
  usage: {
    monthLabel: string;
    inputTokens: number;
    outputTokens: number;
    llmCallCount: number;
    estimatedCostUsd: number;
  };
  /** True only when getStripeConfig() is non-null AND a Pro price id AND APP_URL are set —
   *  i.e. checkout would actually succeed. Computed server-side (see the billing page) so the
   *  button is disabled with an explanation up front instead of silently failing on click. */
  checkoutAvailable: boolean;
  /** PLACEHOLDER_PRO_PLAN_PRICE_USD from src/lib/stripe.ts, passed as a plain number — that
   *  module is server-only (imports the `stripe` package) and can't be imported directly into
   *  this client component. */
  placeholderPriceUsd: number;
};

/** Reads the `?checkout=success|cancelled` Stripe's redirect comes back with, shows it once,
 *  then strips it from the URL — same pattern as the Google Calendar OAuth banner in
 *  integrations-section.tsx. */
function useCheckoutBanner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const raw = searchParams.get("checkout");
  const banner = raw === "success" || raw === "cancelled" ? raw : null;

  useEffect(() => {
    if (banner) router.replace("/dashboard/settings/billing");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when the param itself changes
  }, [banner]);

  return banner;
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(value);
}

export function BillingTab({ plan, usage, checkoutAvailable, placeholderPriceUsd }: BillingTabProps) {
  const t = useTranslations("Billing");
  const checkoutBanner = useCheckoutBanner();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const planLabel = plan === "trial" ? t("planTrial") : plan === "pro" ? t("planPro") : plan === "past_due" ? t("planPastDue") : t("planUnknown", { plan });
  const isPro = plan === "pro";

  async function handleUpgrade() {
    setIsRedirecting(true);
    setError(null);
    try {
      const response = await fetch("/api/billing/checkout", { method: "POST" });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        setError(data.error ?? t("checkoutGenericError"));
        setIsRedirecting(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError(t("checkoutGenericError"));
      setIsRedirecting(false);
    }
  }

  return (
    <div className="flex max-w-xl flex-col gap-6">
      {checkoutBanner === "success" ? (
        <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3.5 py-2.5 text-sm text-success">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {t("checkoutSuccessBanner")}
        </div>
      ) : checkoutBanner === "cancelled" ? (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3.5 py-2.5 text-sm text-muted-foreground">
          <XCircle className="h-4 w-4 shrink-0" />
          {t("checkoutCancelledBanner")}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>{t("planLabel")}</CardTitle>
            <Badge variant="outline" className={isPro ? "text-success" : plan === "past_due" ? "text-destructive" : "text-muted-foreground"}>
              {planLabel}
            </Badge>
          </div>
          {plan === "past_due" ? <CardDescription>{t("pastDueNotice")}</CardDescription> : null}
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("usageTitle")}</CardTitle>
          <CardDescription>{t("usageDescription", { month: usage.monthLabel })}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-muted/40 p-3.5">
            <p className="text-xs text-muted-foreground">{t("tokensLabel")}</p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {t("tokensValue", {
                input: usage.inputTokens.toLocaleString(),
                output: usage.outputTokens.toLocaleString(),
              })}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-muted/40 p-3.5">
            <p className="text-xs text-muted-foreground">{t("callsLabel")}</p>
            <p className="mt-1 text-sm font-medium text-foreground">{usage.llmCallCount.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/40 p-3.5">
            <p className="text-xs text-muted-foreground">{t("costLabel")}</p>
            <p className="mt-1 text-sm font-medium text-foreground">{formatUsd(usage.estimatedCostUsd)}</p>
          </div>
        </CardContent>
      </Card>

      {!isPro ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("upgradeTitle")}</CardTitle>
            <CardDescription>{t("upgradeDescription", { price: placeholderPriceUsd })}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {!checkoutAvailable ? (
              <p className="rounded-lg border border-border bg-muted/40 p-3.5 text-xs text-muted-foreground">
                {t("notConfiguredNotice")}
              </p>
            ) : null}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </CardContent>
          <CardFooter className="flex items-center justify-end bg-transparent border-t-0 pt-4">
            {checkoutAvailable ? (
              <Button type="button" size="sm" onClick={handleUpgrade} disabled={isRedirecting}>
                {isRedirecting ? t("upgradeButtonLoading") : t("upgradeButton")}
              </Button>
            ) : (
              <Tooltip>
                <TooltipTrigger render={<span />}>
                  <Button type="button" size="sm" disabled>
                    {t("upgradeButton")}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("notConfiguredNotice")}</TooltipContent>
              </Tooltip>
            )}
          </CardFooter>
        </Card>
      ) : null}
    </div>
  );
}
