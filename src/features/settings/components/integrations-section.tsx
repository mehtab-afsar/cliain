"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { useIntegrations } from "../hooks/use-integrations";
import { IntegrationCard } from "./integration-card";
import { IntegrationHelp, WHATSAPP_HELP } from "./integration-help";
import { RemindersExplainer } from "./reminders-explainer";
import { VapiStatusCard } from "./vapi-status-card";
import { GoogleCalendarStatusCard } from "./google-calendar-status-card";

/** Reads the `?googleCalendar=connected|cancelled|error` the OAuth callback redirects back
 *  with, shows it once, then strips it from the URL so a refresh doesn't repeat it. */
function useGoogleCalendarOAuthBanner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const raw = searchParams.get("googleCalendar");
  const banner = raw === "connected" || raw === "cancelled" || raw === "error" ? raw : null;

  // Derived straight from the URL above (not state) — this effect only performs the
  // side effect of cleaning the URL once, it never calls setState.
  useEffect(() => {
    if (banner) router.replace("/dashboard/settings/integrations");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when the param itself changes
  }, [banner]);

  return banner;
}

export function IntegrationsSection() {
  const { status, savingProvider, errorByProvider, save, disconnect, enablePhoneCalls, disablePhoneCalls } =
    useIntegrations();
  const googleCalendarBanner = useGoogleCalendarOAuthBanner();

  if (!status) return null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-heading text-lg text-foreground">Integrations</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect the channels Cliain uses to talk to your patients.
        </p>
      </div>

      {googleCalendarBanner === "connected" ? (
        <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3.5 py-2.5 text-sm text-success">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Google Calendar connected — new bookings will start mirroring over.
        </div>
      ) : googleCalendarBanner === "error" ? (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
          <XCircle className="h-4 w-4 shrink-0" />
          Couldn&apos;t connect Google Calendar — try again below.
        </div>
      ) : null}

      <RemindersExplainer vapiConnected={status.vapi.connected} />

      <IntegrationCard
        title="WhatsApp"
        description="Lets patients text your clinic and get booked by Cliain."
        connected={status.whatsapp.connected}
        isSaving={savingProvider === "whatsapp"}
        error={errorByProvider.whatsapp}
        help={<IntegrationHelp {...WHATSAPP_HELP} />}
        webhookUrl={{
          label: "Webhook URL — paste into your Meta App's WhatsApp product",
          value: status.webhookUrls?.whatsapp ?? null,
        }}
        fields={[
          {
            key: "phoneNumberId",
            label: "Phone number ID",
            placeholder: "From your Meta App's WhatsApp product",
            initialValue: status.whatsapp.phoneNumberId,
          },
          {
            key: "accessToken",
            label: "Access token",
            secret: true,
          },
          {
            key: "verifyToken",
            label: "Webhook verify token",
            placeholder: "Any secret string you choose",
            secret: true,
          },
          {
            key: "appSecret",
            label: "App secret",
            placeholder: status.whatsapp.hasAppSecret ? undefined : "Required — verifies requests came from Meta",
            secret: true,
          },
        ]}
        onSave={(values) => save({ provider: "whatsapp", ...values })}
        onDisconnect={() => disconnect("whatsapp")}
      />

      <VapiStatusCard
        connected={status.vapi.connected}
        phoneNumber={status.vapi.phoneNumber}
        platformConfigured={status.vapi.platformConfigured}
        isSaving={savingProvider === "vapi"}
        error={errorByProvider.vapi}
        onEnable={enablePhoneCalls}
        onDisable={disablePhoneCalls}
      />

      <GoogleCalendarStatusCard
        connected={status.googleCalendar.connected}
        accountEmail={status.googleCalendar.accountEmail}
        calendarId={status.googleCalendar.calendarId}
        platformConfigured={status.googleCalendar.platformConfigured}
        isSaving={savingProvider === "googleCalendar"}
        error={errorByProvider.googleCalendar}
        onSaveCalendarId={(calendarId) => save({ provider: "googleCalendar", calendarId })}
        onDisconnect={() => disconnect("googleCalendar")}
      />
    </div>
  );
}
