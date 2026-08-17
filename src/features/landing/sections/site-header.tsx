import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogoMark } from "../components/logo-mark";

export function SiteHeader() {
  return (
    <header className="border-b border-border/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <LogoMark />
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="ghost" render={<Link href="/dashboard" />} nativeButton={false}>
            Sign in
          </Button>
          <Button render={<Link href="/onboarding" />} nativeButton={false}>
            Get started
          </Button>
        </div>
      </div>
    </header>
  );
}
