import type { LucideIcon } from "lucide-react";

type StatTileProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
};

/** The KPI-card building block for the overview page — one number, one label, an optional
 *  hint line for the fine print (window, sample size, "no data yet"). */
export function StatTile({ icon: Icon, label, value, hint }: StatTileProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <p className="text-sm">{label}</p>
      </div>
      <p className="font-heading text-2xl text-foreground">{value}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
