import { STATUS_LABEL, VERDICT_LABEL, type CheckStatus, type Verdict } from "@/lib/rules/types";

const STYLE: Record<CheckStatus, string> = {
  met: "bg-met-soft text-met",
  unmet: "bg-unmet-soft text-unmet",
  review: "bg-review-soft text-review",
};

const VERDICT_STATUS: Record<Verdict, CheckStatus> = { eligible: "met", ineligible: "unmet", review: "review" };

export function StatusBadge({ status }: { status: CheckStatus }) {
  return <span className={`inline-block shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${STYLE[status]}`}>{STATUS_LABEL[status]}</span>;
}

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const status = VERDICT_STATUS[verdict];
  return <span className={`inline-block shrink-0 rounded px-2.5 py-1 text-sm font-bold ${STYLE[status]}`}>{VERDICT_LABEL[verdict]}</span>;
}
