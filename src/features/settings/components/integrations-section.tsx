"use client";

import { useIntegrations } from "../hooks/use-integrations";
import { IntegrationCard } from "./integration-card";

export function IntegrationsSection() {
  const { status, savingProvider, errorByProvider, save, disconnect } = useIntegrations();

  if (!status) return null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-heading text-lg text-foreground">Integrations</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect the channels Cliain uses to talk to your patients.
        </p>
      </div>

      <IntegrationCard
        title="WhatsApp"
        description="Lets patients text your clinic and get booked by Claude."
        connected={status.whatsapp.connected}
        isSaving={savingProvider === "whatsapp"}
        error={errorByProvider.whatsapp}
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
        ]}
        onSave={(values) => save({ provider: "whatsapp", ...values })}
        onDisconnect={() => disconnect("whatsapp")}
      />

      <IntegrationCard
        title="Voice (Vapi)"
        description="Lets patients call in, and lets Cliain place reminder calls."
        connected={status.vapi.connected}
        isSaving={savingProvider === "vapi"}
        error={errorByProvider.vapi}
        fields={[
          {
            key: "apiKey",
            label: "API key",
            secret: true,
          },
          {
            key: "phoneNumberId",
            label: "Phone number ID",
            initialValue: status.vapi.phoneNumberId,
          },
          {
            key: "webhookUrl",
            label: "Tool webhook URL",
            placeholder: "https://your-domain.com/api/webhooks/vapi",
            initialValue: status.vapi.webhookUrl,
          },
        ]}
        onSave={(values) => save({ provider: "vapi", ...values })}
        onDisconnect={() => disconnect("vapi")}
      />

      <IntegrationCard
        title="Google Calendar"
        description="Mirrors bookings to a calendar you choose. Best-effort — never blocks a booking."
        connected={status.googleCalendar.connected}
        isSaving={savingProvider === "googleCalendar"}
        error={errorByProvider.googleCalendar}
        fields={[
          {
            key: "serviceAccountJson",
            label: "Service account JSON",
            placeholder: "Paste the whole key file contents",
            secret: true,
            multiline: true,
          },
          {
            key: "calendarId",
            label: "Calendar ID",
            placeholder: "the-calendar@group.calendar.google.com",
            initialValue: status.googleCalendar.calendarId,
          },
        ]}
        onSave={(values) => save({ provider: "googleCalendar", ...values })}
        onDisconnect={() => disconnect("googleCalendar")}
      />
    </div>
  );
}
