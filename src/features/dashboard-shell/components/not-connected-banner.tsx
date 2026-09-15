"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

const DISMISS_KEY = "cliain:not-connected-banner-dismissed";

/** Shown on every dashboard page until WhatsApp is connected — dismissible per session only
 * (sessionStorage, not localStorage), so it comes back next time the clinic actually needs it.
 *
 * Always starts as "not dismissed" on both server and client — sessionStorage doesn't exist
 * during SSR, so reading it as the initial state (as this used to do) makes the server render
 * nothing while the client immediately renders the banner, a hydration mismatch on every load.
 * The real dismissed state is applied after mount instead, in the effect below; that trades a
 * one-frame flash of the banner (if it was already dismissed this session) for never crashing
 * hydration, which is the right side of that trade. */
export function NotConnectedBanner({ whatsappConnected }: { whatsappConnected: boolean }) {
  const [dismissed, setDismissed] = useState(false);

  // Reading an external system (sessionStorage) after mount and syncing it into state is
  // exactly what this lint rule is otherwise guarding against accidental re-derivation of —
  // there's no way to do this without an effect, since sessionStorage doesn't exist at SSR time.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "true") setDismissed(true);
    } catch {
      // Private browsing or storage disabled — just stays not-dismissed.
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

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
