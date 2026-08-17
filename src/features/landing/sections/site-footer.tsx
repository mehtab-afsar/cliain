export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col-reverse items-center justify-between gap-3 px-6 py-5 text-xs text-muted-foreground sm:flex-row">
        <p>© {new Date().getFullYear()} Cliain. All rights reserved.</p>
        <p>AI scheduling for clinics, over WhatsApp.</p>
      </div>
    </footer>
  );
}
