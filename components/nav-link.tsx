"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function NavLink({ href, badge, children }: { href: string; badge?: number; children: ReactNode }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
        active ? "bg-ink text-white" : "text-muted hover:bg-tint hover:text-ink"
      }`}
    >
      {children}
      {badge ? (
        <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-white">{badge}</span>
      ) : null}
    </Link>
  );
}
