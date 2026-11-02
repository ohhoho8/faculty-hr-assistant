import { Search } from "lucide-react";

export function HeaderSearch() {
  return (
    <form action="/ask" role="search" className="relative w-full sm:w-72">
      <Search size={15} aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-faint" />
      <input
        name="q"
        aria-label="규정 질문"
        placeholder="규정 질문하기"
        maxLength={500}
        className="h-10 w-full rounded-full bg-surface pr-4 pl-9 text-sm shadow-[0_1px_2px_rgb(23_25_31/0.04)] outline-none placeholder:text-faint focus-visible:outline-2 focus-visible:outline-accent"
      />
    </form>
  );
}
