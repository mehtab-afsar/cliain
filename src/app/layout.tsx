import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { TooltipProvider } from "@/components/ui/tooltip";
import { fontVariables } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cliain — AI reception for clinics, gyms, and appointment-based businesses",
  description:
    "Cliain answers WhatsApp messages and phone calls, checks real availability, and books it — a patient with a doctor, a member into a class — while keeping your calendar in sync automatically.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Resolves from the NEXT_LOCALE cookie (see src/i18n/request.ts) — no [locale] URL segment.
  // NextIntlClientProvider is left without explicit locale/messages props: rendered from this
  // Server Component, next-intl resolves it to its RSC-aware variant, which reads both
  // straight from the request config below it in the tree.
  const locale = await getLocale();

  return (
    <html lang={locale} className={`${fontVariables} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>
          <TooltipProvider delay={200}>{children}</TooltipProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
