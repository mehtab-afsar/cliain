"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { TemplateContent } from "@/features/templates/types";

// `labels.businessNoun` is vertical terminology (resolved per-tenant, English-only for now —
// see src/i18n/request.ts) so it's left untouched; `tabsT` supplies the locale-aware chrome for
// the other, non-vertical tab names.
function buildTabs(labels: TemplateContent["labels"], tabsT: (key: string) => string) {
  return [
    { href: "/dashboard/settings/clinic", label: labels.businessNoun },
    { href: "/dashboard/settings/messaging", label: tabsT("messaging") },
    { href: "/dashboard/settings/safety", label: tabsT("safety") },
    { href: "/dashboard/settings/integrations", label: tabsT("integrations") },
    { href: "/dashboard/settings/team", label: tabsT("team") },
    { href: "/dashboard/settings/billing", label: tabsT("billing") },
  ];
}

export function SettingsTabs({ labels }: { labels: TemplateContent["labels"] }) {
  const pathname = usePathname();
  const tabsT = useTranslations("Settings.tabs");
  const tabs = buildTabs(labels, tabsT);

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
