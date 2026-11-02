import { STATUS_LABEL, VERDICT_LABEL, type CheckStatus, type Verdict } from "@/lib/rules/types";

const STYLE: Record<CheckStatus, { tag: string; dot: string }> = {
  met: { tag: "bg-met-soft text-met", dot: "bg-met" },
  unmet: { tag: "bg-unmet-soft text-unmet", dot: "bg-unmet" },
  review: { tag: "bg-review-soft text-review", dot: "bg-review" },
};

const VERDICT_STATUS: Record<Verdict, CheckStatus> = { eligible: "met", ineligible: "unmet", review: "review" };

export function Tag({ label, tag, dot }: { label: string; tag: string; dot: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold whitespace-nowrap ${tag}`}>
      <span aria-hidden className={`size-2 rounded-[3px] ${dot}`} />
      {label}
    </span>
  );
}

export function StatusBadge({ status }: { status: CheckStatus }) {
  return <Tag label={STATUS_LABEL[status]} {...STYLE[status]} />;
}

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  return <Tag label={VERDICT_LABEL[verdict]} {...STYLE[VERDICT_STATUS[verdict]]} />;
}
