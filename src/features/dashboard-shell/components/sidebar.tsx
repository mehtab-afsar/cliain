"use client";

import { cn } from "@/lib/utils";
import { useSidebarState } from "../hooks/use-sidebar-state";
import { SidebarBody } from "./sidebar-body";
import { CollapseToggle } from "./collapse-toggle";

type SidebarProps = {
  clinicName?: string;
};

export function Sidebar({ clinicName }: SidebarProps) {
  const { isCollapsed, toggle } = useSidebarState();

  return (
    <aside
      className={cn(
        "hidden shrink-0 border-r border-border bg-sidebar transition-[width] duration-200 md:flex md:flex-col",
        isCollapsed ? "w-16" : "w-60",
      )}
    >
      <div className="flex-1 overflow-y-auto">
        <SidebarBody isCollapsed={isCollapsed} clinicName={clinicName} />
      </div>
      <div
        className={cn(
          "flex border-t border-border p-2",
          isCollapsed ? "justify-center" : "justify-end",
        )}
      >
        <CollapseToggle isCollapsed={isCollapsed} onToggle={toggle} />
      </div>
    </aside>
  );
}
