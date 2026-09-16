"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { TemplateContent } from "@/features/templates/types";

function buildTabs(labels: TemplateContent["labels"]) {
  return [
    { href: "/dashboard/settings/clinic", label: labels.businessNoun },
    { href: "/dashboard/settings/messaging", label: "Messaging" },
    { href: "/dashboard/settings/safety", label: "Safety" },
    { href: "/dashboard/settings/integrations", label: "Integrations" },
    { href: "/dashboard/settings/team", label: "Team" },
  ];
}

export function SettingsTabs({ labels }: { labels: TemplateContent["labels"] }) {
  const pathname = usePathname();
  const tabs = buildTabs(labels);

  return (
    <nav className="flex shrink-0 flex-col gap-0.5 sm:w-44">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm transition-colors",
              active
                ? "bg-accent font-medium text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
