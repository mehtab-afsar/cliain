import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogoMark } from "../components/logo-mark";

export function SiteHeader() {
  return (
    <header className="sticky top-4 z-40 mx-auto w-full max-w-5xl px-4">
      <div className="flex h-14 items-center justify-between rounded-2xl border border-border/60 bg-card/80 px-4 shadow-[0_1px_2px_rgba(31,42,40,0.04),0_8px_24px_rgba(31,42,40,0.08)] backdrop-blur-md sm:px-5">
        <Link href="/" className="flex items-center gap-2">
          <LogoMark />
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            render={<Link href="/dashboard" />}
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
