import { PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

type CollapseToggleProps = {
  isCollapsed: boolean;
  onToggle: () => void;
};

export function CollapseToggle({ isCollapsed, onToggle }: CollapseToggleProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onToggle}
      aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
      <PanelLeft className="h-4 w-4" />
    </Button>
  );
}
