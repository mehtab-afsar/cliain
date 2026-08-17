import type { LucideIcon } from "lucide-react";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-24 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent">
        <Icon className="h-5 w-5 text-accent-foreground" />
      </div>
      <p className="font-heading text-lg text-foreground">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
