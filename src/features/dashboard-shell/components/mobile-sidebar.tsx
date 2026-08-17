"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SidebarBody } from "./sidebar-body";

type MobileSidebarProps = {
  clinicName?: string;
};

export function MobileSidebar({ clinicName }: MobileSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger
        render={<Button variant="ghost" size="icon" className="md:hidden" />}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Open navigation</span>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <SheetDescription className="sr-only">
          Cliain dashboard navigation
        </SheetDescription>
        <SidebarBody
          isCollapsed={false}
          clinicName={clinicName}
          onNavigate={() => setIsOpen(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
