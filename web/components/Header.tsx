"use client";

import Link from "next/link";
import { useStatuses } from "./StatusProvider";

export default function Header() {
  const { appliedCount, ignoredCount } = useStatuses();

  return (
    <header className="border-b border-edge bg-paper/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container-main flex items-center justify-between h-14">
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="inline-block w-2 h-2 rounded-full bg-signal group-hover:scale-125 transition-transform" />
          <span className="font-display font-semibold text-sm tracking-tight text-ink">
            ASHBY TRACKER
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          <NavLink href="/" label="Feed" />
          <NavLink href="/applied" label="Applied" count={appliedCount} />
          <NavLink href="/ignored" label="Ignored" count={ignoredCount} />
        </nav>
      </div>
    </header>
  );
}

function NavLink({ href, label, count }: { href: string; label: string; count?: number }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium
                 text-ink-secondary hover:text-ink hover:bg-surface transition-colors"
    >
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <span className="font-mono text-xs text-ink-muted">{count}</span>
      )}
    </Link>
  );
}
