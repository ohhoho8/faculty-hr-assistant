import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { COLLECTED_DATE, DOCUMENTS, SOURCE_URL } from "@/lib/corpus";
import { formatDate } from "@/lib/rules/dates";

export default function RegulationsPage() {
  const groups = [
    { title: "판정 근거 규정", documents: DOCUMENTS.filter((document) => document.core) },
    { title: "참고 규정", documents: DOCUMENTS.filter((document) => !document.core) },
  ];
  return (
    <>
      <PageHeader title="규정 열람" description={`${formatDate(COLLECTED_DATE)} 기준으로 수집한 조문입니다. 최신 규정은 출처에서 확인해야 합니다.`}>
        <a href={SOURCE_URL} target="_blank" rel="noreferrer" className="text-sm text-accent underline underline-offset-2">규정집 출처</a>
      </PageHeader>
      {groups.map((group) => (
        <section key={group.title} className="mb-6">
          <h2 className="eyebrow mb-2 px-1">{group.title}</h2>
          <ul className="panel divide-y divide-line overflow-hidden">
            {group.documents.map((document) => (
              <li key={document.id}>
                <Link href={`/regulations/${document.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-tint">
                  <span className="font-medium">
                    {document.title}
                    {document.outdated && <span className="ml-2 rounded-md bg-review-soft px-1.5 py-0.5 text-xs text-review">구버전</span>}
                  </span>
                  <span className="text-xs text-muted">
                    {document.amended ? `${formatDate(document.amended)} 개정 · ` : ""}{document.count}개 항목
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
