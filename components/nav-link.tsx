"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
        active ? "bg-accent-soft text-accent" : "text-muted hover:bg-canvas hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}
