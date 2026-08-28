"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { NavItem } from "./nav-items";

type SidebarNavItemProps = {
  item: NavItem;
  isCollapsed: boolean;
  onNavigate?: () => void;
};

export function SidebarNavItem({ item, isCollapsed, onNavigate }: SidebarNavItemProps) {
  const pathname = usePathname();
  const isActive = pathname.startsWith(item.href);
  const Icon = item.icon;

  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      data-tour-id={item.tourId}
      className={cn(
        "flex items-center gap-3 rounded-lg border-l-2 border-transparent py-2 pl-[10px] pr-3 text-sm font-medium transition-colors",
        isCollapsed && "justify-center border-l-0 px-2",
        isActive
          ? "border-primary bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {isCollapsed ? null : <span>{item.label}</span>}
    </Link>
  );

  if (!isCollapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger render={<div />}>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}
