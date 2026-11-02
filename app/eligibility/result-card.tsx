import { CitationLinks } from "@/components/citation-links";
import { StatusBadge, VerdictBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/rules/dates";
import type { RuleResult } from "@/lib/rules/types";

export function ResultCard({ result }: { result: RuleResult }) {
  return (
    <section aria-live="polite" className="panel overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-line p-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{result.task}</h2>
          <p className="mt-1 text-sm text-muted">{result.summary}</p>
        </div>
        <VerdictBadge verdict={result.verdict} />
      </div>

      <ul className="divide-y divide-line">
        {result.checks.map((check) => (
          <li key={check.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-semibold">{check.label}</h3>
              <StatusBadge status={check.status} />
            </div>
            <p className="mt-1 text-sm text-muted">{check.detail}</p>
            <div className="mt-1.5"><CitationLinks citations={check.citations} /></div>
          </li>
        ))}
      </ul>

      {result.facts.length > 0 && (
        <div className="border-t border-line p-4">
          <h3 className="eyebrow mb-2.5">적용 내용</h3>
          <dl className="space-y-2 text-sm">
            {result.facts.map((fact) => (
              <div key={fact.label} className="grid gap-x-3 sm:grid-cols-[7rem_minmax(0,1fr)]">
                <dt className="text-muted">{fact.label}</dt>
                <dd>
                  {fact.value}
                  <div><CitationLinks citations={fact.citations} /></div>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {result.dates.length > 0 && (
        <div className="border-t border-line p-4">
          <h3 className="eyebrow mb-2.5">주요 날짜</h3>
          <dl className="space-y-2 text-sm">
            {result.dates.map((item) => (
              <div key={item.label} className="grid grid-cols-[1fr_auto] gap-x-3">
                <dt className="text-muted">{item.label}</dt>
                <dd className="font-semibold tabular-nums">{formatDate(item.date)}</dd>
                <dd className="col-span-2"><CitationLinks citations={item.citations} /></dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {result.notes.length > 0 && (
        <ul className="list-disc space-y-1 border-t border-line bg-tint p-4 pl-8 text-xs leading-relaxed text-muted">
          {result.notes.map((note) => <li key={note}>{note}</li>)}
        </ul>
      )}
    </section>
  );
}
