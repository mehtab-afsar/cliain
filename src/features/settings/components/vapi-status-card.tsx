"use client";

import { Check, PhoneCall } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

type VapiStatusCardProps = {
  connected: boolean;
  phoneNumber: string | null;
  platformConfigured: boolean;
  isSaving: boolean;
  error?: string;
  onEnable: () => void;
  onDisable: () => void;
};

/** Unlike WhatsApp/Google Calendar, there is nothing here for a clinic to type in — phone
 *  calls are Cliain-hosted (see vapi-provisioning.ts). This is a status + one button, not a
 *  credentials form, which is why it isn't an IntegrationCard. */
export function VapiStatusCard({
  connected,
  phoneNumber,
  platformConfigured,
  isSaving,
  error,
  onEnable,
  onDisable,
}: VapiStatusCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>Phone calls</CardTitle>
          {connected ? (
            <Badge variant="outline" className="gap-1 text-success">
              <Check className="h-3 w-3" />
              Connected
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              Not connected
            </Badge>
          )}
        </div>
        <CardDescription>
          Lets patients call your clinic and get booked, and lets Cliain place the automatic
          reminder call — hosted by Cliain, there&apos;s nothing to connect yourself.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {!platformConfigured ? (
          <p className="rounded-lg border border-border bg-muted/40 p-3.5 text-xs text-muted-foreground">
            Phone calls aren&apos;t available on this deployment yet — it needs Cliain&apos;s own
            Vapi account connected first (not something a clinic sets up).
          </p>
        ) : connected ? (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3.5">
            <PhoneCall className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">{phoneNumber}</p>
              <p className="text-xs text-muted-foreground">
                What it says on a call comes from the Messaging and Safety tabs — same greeting,
                tone and emergency script as WhatsApp.
              </p>
            </div>
          </div>
        ) : (
          <p className="rounded-lg border border-border bg-muted/40 p-3.5 text-xs text-muted-foreground">
            We&apos;ll provision a phone number and connect it automatically — nothing to paste
            in. What it says comes from the Messaging and Safety tabs.
          </p>
        )}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </CardContent>

      <CardFooter className="flex items-center justify-between bg-transparent border-t-0 pt-4">
        <span />
        {connected ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10"
            onClick={onDisable}
            disabled={isSaving}
          >
            Disable phone calls
          </Button>
        ) : (
          <Button type="button" size="sm" onClick={onEnable} disabled={isSaving || !platformConfigured}>
            {isSaving ? "Enabling…" : "Enable phone calls"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
