import { Phone } from "lucide-react";

export function CallPreviewCard() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-elevation-md">
      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary">
        <Phone className="h-4 w-4 text-primary-foreground" />
        <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-success ring-2 ring-card motion-safe:animate-pulse" />
      </span>
      <div>
        <p className="text-sm font-medium text-foreground">Call answered automatically</p>
        <p className="font-mono text-xs text-muted-foreground">0:38 · Cliain voice</p>
      </div>
    </div>
  );
}
