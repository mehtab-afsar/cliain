"use client";

import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { signOutAction } from "@/features/login/actions";

export function SignOutMenuItem() {
  const t = useTranslations("Common");
  return (
    <DropdownMenuItem onClick={() => signOutAction()}>
      <LogOut className="h-4 w-4" />
      {t("signOut")}
    </DropdownMenuItem>
  );
}
