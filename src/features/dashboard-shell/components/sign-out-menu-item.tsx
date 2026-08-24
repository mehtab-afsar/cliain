"use client";

import { LogOut } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { signOutAction } from "@/features/login/actions";

export function SignOutMenuItem() {
  return (
    <DropdownMenuItem onClick={() => signOutAction()}>
      <LogOut className="h-4 w-4" />
      Sign out
    </DropdownMenuItem>
  );
}
