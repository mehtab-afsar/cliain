"use client";

import { cn } from "@/lib/utils";
import { useSidebarState } from "../hooks/use-sidebar-state";
import { SidebarBody } from "./sidebar-body";
import { CollapseToggle } from "./collapse-toggle";
import type { TemplateContent } from "@/features/templates/types";

type SidebarProps = {
  clinicName?: string;
  labels: TemplateContent["labels"];
};

export function Sidebar({ clinicName, labels }: SidebarProps) {
  const { isCollapsed, isHovering, setHovering, toggle } = useSidebarState();

  // Pinned open — renders exactly as a normal in-flow panel, same as before this existed.
  // Hovering has nothing to do since it's already open.
  if (!isCollapsed) {
    return (
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-sidebar shadow-elevation-sm transition-[width] duration-200 md:flex">
        <div className="flex-1 overflow-y-auto">
          <SidebarBody isCollapsed={false} clinicName={clinicName} labels={labels} />
        </div>
        <div className="flex justify-end border-t border-border p-2">
          <CollapseToggle isCollapsed={false} onToggle={toggle} />
        </div>
      </aside>
    );
  }

  // Pinned narrow — a static w-16 spacer reserves the layout space so hovering never
  // reflows the page; the actual rail floats above the content as an overlay while hovered.
  const expanded = isHovering;

  return (
    <>
      <div className="hidden w-16 shrink-0 md:block" aria-hidden="true" />
      <aside
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        className={cn(
          "fixed top-0 left-0 z-20 hidden h-dvh flex-col border-r border-border bg-sidebar transition-[width] duration-200 md:flex",
          expanded ? "w-60 shadow-elevation-md" : "w-16 shadow-elevation-sm",
        )}
      >
        <div className="flex-1 overflow-y-auto">
          <SidebarBody isCollapsed={!expanded} clinicName={clinicName} labels={labels} />
        </div>
        <div
          className={cn(
            "flex border-t border-border p-2",
            expanded ? "justify-end" : "justify-center",
          )}
        >
          {/* Reflects the pinned preference, not the ephemeral hover peek — clicking this
              always pins the sidebar open, regardless of whether you're currently hovering it. */}
          <CollapseToggle isCollapsed={isCollapsed} onToggle={toggle} />
        </div>
      </aside>
    </>
  );
}
