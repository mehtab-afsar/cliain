import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogoMark } from "../components/logo-mark";

const NAV_LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-4 z-40 mx-auto w-full max-w-5xl px-4">
      <div className="flex h-14 items-center justify-between rounded-2xl border border-border/60 bg-card/80 px-4 shadow-elevation-sm backdrop-blur-md sm:px-5">
        <Link href="/" className="flex items-center gap-2">
          <LogoMark />
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="hidden sm:inline-flex"
            render={<Link href="/login" />}
            nativeButton={false}
          >
            Sign in
          </Button>
          <Button size="sm" render={<Link href="/onboarding" />} nativeButton={false}>
            Get started
          </Button>
        </div>
      </div>
    </header>
  );
}
