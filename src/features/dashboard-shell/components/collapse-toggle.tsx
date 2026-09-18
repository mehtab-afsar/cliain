"use client";

import { PanelLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

type CollapseToggleProps = {
  isCollapsed: boolean;
  onToggle: () => void;
};

export function CollapseToggle({ isCollapsed, onToggle }: CollapseToggleProps) {
  const t = useTranslations("DashboardShell.collapseToggle");
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onToggle}
      aria-label={isCollapsed ? t("expand") : t("collapse")}
    >
      <PanelLeft className="h-4 w-4" />
    </Button>
  );
}
