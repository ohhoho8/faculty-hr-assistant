import { Tag } from "@/components/status-badge";

type Urgency = { label: string; tag: string; dot: string; text: string };

const LEVELS: Urgency[] = [
  { label: "기한 지남", tag: "bg-unmet-soft text-unmet", dot: "bg-unmet", text: "text-unmet" },
  { label: "임박", tag: "bg-unmet-soft text-unmet", dot: "bg-unmet", text: "text-unmet" },
  { label: "주의", tag: "bg-high-soft text-high", dot: "bg-high", text: "text-high" },
  { label: "예정", tag: "bg-review-soft text-review", dot: "bg-review", text: "text-ink" },
  { label: "여유", tag: "bg-tint text-muted", dot: "bg-faint", text: "text-muted" },
];

export const URGENCY_ORDER = LEVELS.map((level) => level.label);

export function urgencyOf(days: number): Urgency {
  if (days < 0) return LEVELS[0];
  if (days <= 14) return LEVELS[1];
  if (days <= 30) return LEVELS[2];
  if (days <= 90) return LEVELS[3];
  return LEVELS[4];
}

export function relativeDays(days: number): string {
  if (days === 0) return "오늘";
  return days > 0 ? `${days}일 남음` : `${-days}일 지남`;
}

export function UrgencyTag({ days }: { days: number }) {
  const { label, tag, dot } = urgencyOf(days);
  return <Tag label={label} tag={tag} dot={dot} />;
}

export function DueCell({ days }: { days: number }) {
  return <span className={`block font-medium whitespace-nowrap ${urgencyOf(days).text}`}>{relativeDays(days)}</span>;
}
