import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="no-print flex items-baseline justify-between gap-4 border-b border-line py-3">
      <Link href="/" className="text-sm font-semibold tracking-tight text-ink">
        NextMove
      </Link>
      <nav className="flex gap-4 text-sm">
        <Link href="/" className="text-ink">
          Your move
        </Link>
        <Link href="/value" className="text-muted">
          For Toyota
        </Link>
      </nav>
    </header>
  );
}
