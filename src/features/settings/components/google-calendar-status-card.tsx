"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type GoogleCalendarStatusCardProps = {
  connected: boolean;
  accountEmail: string | null;
  calendarId: string | null;
  platformConfigured: boolean;
  isSaving: boolean;
  error?: string;
  onSaveCalendarId: (calendarId: string) => Promise<boolean>;
  onDisconnect: () => Promise<void>;
};

/** Unlike WhatsApp, connecting is a real "Connect with Google" OAuth button (see
 *  google-calendar-oauth.ts) — nothing to paste in, same shape as the app's own sign-in. Once
 *  connected, the only thing left to configure is which calendar to sync to. */
export function GoogleCalendarStatusCard({
  connected,
  accountEmail,
  calendarId,
  platformConfigured,
  isSaving,
  error,
  onSaveCalendarId,
  onDisconnect,
}: GoogleCalendarStatusCardProps) {
  const [value, setValue] = useState(calendarId ?? "");
  const [justSaved, setJustSaved] = useState(false);

  async function handleSave() {
    const ok = await onSaveCalendarId(value.trim() || "primary");
    if (ok) {
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>Google Calendar</CardTitle>
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
          Mirrors bookings to a calendar you choose. Best-effort — never blocks a booking.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {!platformConfigured ? (
          <p className="rounded-lg border border-border bg-muted/40 p-3.5 text-xs text-muted-foreground">
            Google Calendar isn&apos;t configured on this deployment yet.
          </p>
        ) : connected ? (
          <>
            <p className="text-sm text-foreground">
              Connected as <span className="font-medium">{accountEmail ?? "your Google account"}</span>
            </p>
            <div className="flex flex-col gap-2">
              <Label htmlFor="googleCalendarId">Calendar to sync to</Label>
              <Input
                id="googleCalendarId"
                value={value}
                placeholder="primary"
                onChange={(event) => setValue(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Defaults to the main calendar on the account you connected. Only change this if
                you want bookings mirrored to a different calendar instead.
              </p>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Click below, sign in with the Google account whose calendar you want bookings
            mirrored to, and approve access — that&apos;s the whole setup.
          </p>
        )}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </CardContent>

      <CardFooter className="flex items-center justify-between bg-transparent border-t-0 pt-4">
        {connected ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10"
            onClick={onDisconnect}
            disabled={isSaving}
          >
            Disconnect
          </Button>
        ) : (
          <span />
        )}
        {connected ? (
          <Button type="button" size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving…" : justSaved ? "Saved ✓" : "Save"}
          </Button>
        ) : (
          <Button type="button" size="sm" render={<a href="/api/settings/integrations/google-calendar/connect" />} disabled={!platformConfigured}>
            Connect Google Calendar
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
