import type { ReactNode } from "react";
import Link from "next/link";
import { LogoMark } from "@/features/landing/components/logo-mark";
import { SiteFooter } from "@/features/landing/sections/site-footer";

type LegalPageProps = {
  title: string;
  updated: string;
  children: ReactNode;
};

export function LegalPage({ title, updated, children }: LegalPageProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto w-full max-w-3xl px-6 py-8">
        <Link href="/" className="inline-flex items-center gap-2">
          <LogoMark />
        </Link>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 pb-20">
        <h1 className="font-heading text-3xl tracking-tight text-foreground">{title}</h1>
        <p className="mt-2 font-mono text-xs text-muted-foreground">Last updated {updated}</p>

        <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-foreground [&_h2]:mt-4 [&_h2]:font-heading [&_h2]:text-lg [&_h2]:text-foreground [&_p]:text-muted-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-muted-foreground [&_li]:mt-1">
          {children}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
