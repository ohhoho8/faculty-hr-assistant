import type { ReactNode } from "react";

export function PageHeader({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-3xl font-medium tracking-tight md:text-[2.5rem] md:leading-tight">{title}</h1>
        <p className="mt-1.5 text-sm text-muted">{description}</p>
      </div>
      {children}
    </header>
  );
}
