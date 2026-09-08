"use client";

import { useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

const DISMISS_KEY = "cliain:not-connected-banner-dismissed";

function readDismissed(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return sessionStorage.getItem(DISMISS_KEY) === "true";
  } catch {
    return false;
  }
}

/** Shown on every dashboard page until WhatsApp is connected — dismissible per session only
 * (sessionStorage, not localStorage), so it comes back next time the clinic actually needs it. */
export function NotConnectedBanner({ whatsappConnected }: { whatsappConnected: boolean }) {
  const [dismissed, setDismissed] = useState(readDismissed);

  if (whatsappConnected || dismissed) return null;

  function dismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "true");
    } catch {
      // Private browsing or storage disabled — dismissal just won't persist this session.
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-warning/30 bg-warning/10 px-4 py-2 text-sm sm:px-6">
      <p className="text-foreground">
        Cliain isn&apos;t answering yet.{" "}
        <Link href="/dashboard/settings/integrations" className="font-medium underline underline-offset-2">
          Connect WhatsApp
        </Link>{" "}
        to go live.
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
