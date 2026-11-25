import { Link } from "@tanstack/react-router";

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-card/70 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 rounded-sm font-serif text-lg font-semibold text-foreground">
          <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-sm text-primary-foreground">✓</span>
          CONSORT Check
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          <Link to="/check/$id" params={{ id: "demo" }} className="rounded-sm text-muted-foreground hover:text-foreground">Sample report</Link>
          <Link to="/check" className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground hover:bg-primary/90">Check a paper</Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-7xl px-4 py-6 text-center text-sm text-muted-foreground sm:px-6">
        An automated aid, not a substitute for the official CONSORT checklist or editorial review.
      </div>
    </footer>
  );
}
