"use client";

import { Settings as SettingsIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TourMenuItem } from "@/features/product-tour";
import { LogoMark } from "@/features/landing/components/logo-mark";
import { MobileSidebar } from "./mobile-sidebar";
import { SignOutMenuItem } from "./sign-out-menu-item";
import { LanguageSwitcher } from "./language-switcher";
import type { TemplateContent } from "@/features/templates/types";

type TopNavProps = {
  clinicName?: string;
  doctorName?: string;
  labels: TemplateContent["labels"];
};

export function TopNav({ clinicName, doctorName, labels }: TopNavProps) {
  const initial = (doctorName ?? clinicName ?? "C").trim().charAt(0).toUpperCase();
  const t = useTranslations("Common");

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border/60 bg-background shadow-elevation-sm px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <MobileSidebar clinicName={clinicName} labels={labels} />
        <LogoMark compact />
        <span className="h-4 w-px bg-border" aria-hidden="true" />
        <p className="text-sm font-medium text-foreground">
          {clinicName ?? "Cliain"}
        </p>
      </div>

      <div className="flex items-center gap-1">
        <LanguageSwitcher />

        <DropdownMenu>
          <DropdownMenuTrigger
            data-tour-id="tour-account"
            render={<Button variant="ghost" className="h-9 gap-2 px-1.5" />}
          >
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-accent text-xs text-accent-foreground">
                {initial}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem render={<Link href="/dashboard/settings" />}>
              <SettingsIcon className="h-4 w-4" />
              {t("settings")}
            </DropdownMenuItem>
            <TourMenuItem />
            <DropdownMenuSeparator />
            <SignOutMenuItem />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
