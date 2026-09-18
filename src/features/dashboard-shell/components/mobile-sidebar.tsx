"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SidebarBody } from "./sidebar-body";
import type { TemplateContent } from "@/features/templates/types";

type MobileSidebarProps = {
  clinicName?: string;
  labels: TemplateContent["labels"];
};

export function MobileSidebar({ clinicName, labels }: MobileSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations("DashboardShell.mobileSidebar");

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger
        render={<Button variant="ghost" size="icon" className="md:hidden" />}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">{t("openNavigation")}</span>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetTitle className="sr-only">{t("navigationTitle")}</SheetTitle>
        <SheetDescription className="sr-only">
          {t("navigationDescription")}
        </SheetDescription>
        <SidebarBody
          isCollapsed={false}
          clinicName={clinicName}
          labels={labels}
          onNavigate={() => setIsOpen(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
