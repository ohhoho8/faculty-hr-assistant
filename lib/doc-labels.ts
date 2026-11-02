import type { Citation } from "@/lib/rules/types";

const SHORT_TITLES: Record<string, string> = {
  "faculty-personnel": "교원인사 규정",
  sabbatical: "연구년제 규정",
  "charter-leave": "정관",
  "appendix-1": "교원인사 규정",
};

export function citationLabel({ docId, article }: Citation): string {
  return `${SHORT_TITLES[docId] ?? docId} ${article}`;
}

export function citationHref({ docId, article }: Citation): string {
  return `/regulations/${docId}#${encodeURIComponent(article.replace(/\s/g, ""))}`;
}
