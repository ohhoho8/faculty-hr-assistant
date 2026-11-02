import Link from "next/link";
import { citationHref, citationLabel } from "@/lib/doc-labels";
import type { Citation } from "@/lib/rules/types";

export function CitationLinks({ citations }: { citations: Citation[] }) {
  if (citations.length === 0) return null;
  return (
    <span className="flex flex-wrap gap-x-2 gap-y-0.5">
      {citations.map((citation) => (
        <Link
          key={`${citation.docId}-${citation.article}`}
          href={citationHref(citation)}
          className="text-xs text-accent underline underline-offset-2 hover:no-underline"
        >
          {citationLabel(citation)}
        </Link>
      ))}
    </span>
  );
}
