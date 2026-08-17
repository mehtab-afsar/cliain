import { LogOut, Settings as SettingsIcon } from "lucide-react";
import Link from "next/link";
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
import { MobileSidebar } from "./mobile-sidebar";

type TopNavProps = {
  clinicName?: string;
  doctorName?: string;
};

export function TopNav({ clinicName, doctorName }: TopNavProps) {
  const initial = (doctorName ?? clinicName ?? "C").trim().charAt(0).toUpperCase();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <MobileSidebar clinicName={clinicName} />
        <p className="text-sm font-medium text-foreground">
          {clinicName ?? "Cliain"}
        </p>
      </div>

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
            Settings
          </DropdownMenuItem>
          <TourMenuItem />
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<Link href="/" />}>
            <LogOut className="h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
