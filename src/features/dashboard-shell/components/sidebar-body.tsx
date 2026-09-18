"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/features/landing/components/logo-mark";
import { buildNavItems } from "./nav-items";
import { SidebarNavItem } from "./sidebar-nav-item";
import type { TemplateContent } from "@/features/templates/types";

type SidebarBodyProps = {
  isCollapsed: boolean;
  clinicName?: string;
  labels: TemplateContent["labels"];
  onNavigate?: () => void;
};

export function SidebarBody({ isCollapsed, clinicName, labels, onNavigate }: SidebarBodyProps) {
  const navT = useTranslations("DashboardShell.nav");
  const navItems = buildNavItems(labels, navT);
  return (
    <div className="flex h-full flex-col gap-6 px-3 py-5">
      <div className={cn("px-2", isCollapsed && "flex justify-center px-0")}>
        <LogoMark compact={isCollapsed} />
        {!isCollapsed && clinicName ? (
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {clinicName}
          </p>
        ) : null}
      </div>

      <nav className="flex flex-col gap-1">
        {navItems.map((item) => (
          <SidebarNavItem
            key={item.href}
            item={item}
            isCollapsed={isCollapsed}
            onNavigate={onNavigate}
          />
        ))}
      </nav>
    </div>
  );
}
