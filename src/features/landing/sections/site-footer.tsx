import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col-reverse items-center justify-between gap-3 px-6 py-5 text-xs text-muted-foreground sm:flex-row">
        <p>© {new Date().getFullYear()} Cliain. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <Link href="/privacy" className="transition-colors hover:text-foreground">
            Privacy
          </Link>
          <Link href="/terms" className="transition-colors hover:text-foreground">
            Terms
          </Link>
          <p>AI scheduling for clinics, over WhatsApp.</p>
        </div>
      </div>
    </footer>
  );
}
