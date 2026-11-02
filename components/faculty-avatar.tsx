export function FacultyCell({ name, department }: { name: string; department?: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent">
        {name.slice(-2)}
      </span>
      <span className="min-w-0">
        <span className="block font-medium whitespace-nowrap">{name}</span>
        {department && <span className="block text-xs whitespace-nowrap text-muted">{department}</span>}
      </span>
    </span>
  );
}
