"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setLocaleAction } from "@/i18n/actions";
import { locales, type AppLocale } from "@/i18n/config";

// Language *endonyms* ("English", "हिन्दी") — not translated through the message catalog on
// purpose, a language names itself the same way regardless of which locale is currently active.
const LOCALE_NAMES: Record<AppLocale, string> = {
  en: "English",
  hi: "हिन्दी",
};

/** Sets the staff member's dashboard-chrome language — a per-browser cookie (NEXT_LOCALE), not
 *  tenant data (see src/i18n/request.ts). Unrelated to the `languages` field on the clinic/gym
 *  settings tab, which is what the AI speaks *to customers* in, not what staff see here. */
export function LanguageSwitcher() {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("DashboardShell.languageSwitcher");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSelect(next: AppLocale) {
    if (next === locale || isPending) return;
    startTransition(async () => {
      await setLocaleAction(next);
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" className="h-9 w-9" disabled={isPending} />}
      >
        <Languages className="h-4 w-4" />
        <span className="sr-only">{t("label")}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((option) => (
          <DropdownMenuItem key={option} onClick={() => handleSelect(option)}>
            <span className={option === locale ? "font-medium text-foreground" : undefined}>
              {LOCALE_NAMES[option]}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
