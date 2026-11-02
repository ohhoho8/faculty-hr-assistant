import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { DOCUMENTS, articlesOf } from "@/lib/corpus";
import { formatDate } from "@/lib/rules/dates";

export function generateStaticParams() {
  return DOCUMENTS.map((document) => ({ docId: document.id }));
}

export default async function RegulationPage({ params }: { params: Promise<{ docId: string }> }) {
  const { docId } = await params;
  const document = DOCUMENTS.find((item) => item.id === docId);
  if (!document) notFound();

  const articles = articlesOf(docId);
  return (
    <>
      <PageHeader title={document.title} description={document.amended ? `${formatDate(document.amended)} 개정 기준` : "개정일 미상"}>
        <Link href="/regulations" className="text-sm text-accent underline underline-offset-2">규정 목록</Link>
      </PageHeader>
      {document.outdated && (
        <p className="mb-4 rounded-xl bg-review-soft px-3 py-2 text-sm text-review">2017년판입니다. 휴직 조문(제44~47조)을 제외한 내용은 현행과 다를 수 있습니다.</p>
      )}
      <div className="space-y-2">
        {articles.map((article) => (
          <article key={article.id} id={article.id.split(":")[1]} className="panel scroll-mt-4 px-4 py-3 text-sm leading-relaxed whitespace-pre-line">
            {article.text}
          </article>
        ))}
      </div>
    </>
  );
}
