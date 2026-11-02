"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import type { AskResult, AskSource } from "@/lib/ai/ask";

const EXAMPLES = ["육아휴직은 몇 년까지 가능한가요?", "재임용 통지는 만료 몇 개월 전까지 해야 하나요?", "연구년 후 의무 복무 기간은 얼마인가요?"];

function SourceCard({ source }: { source: AskSource }) {
  const anchor = encodeURIComponent(source.article.replace(/\s/g, ""));
  return (
    <details className="panel px-4 py-3 text-sm">
      <summary className="cursor-pointer font-medium">
        {source.docTitle} {source.article}
        {source.heading && !source.article.startsWith("별표") && !source.article.startsWith("부칙") ? ` (${source.heading})` : ""}
        {source.outdated && <span className="ml-2 rounded bg-review-soft px-1.5 py-0.5 text-xs text-review">2017년판</span>}
      </summary>
      <p className="mt-2 leading-relaxed whitespace-pre-line text-muted">{source.text}</p>
      <Link href={`/regulations/${source.docId}#${anchor}`} className="mt-2 inline-block text-xs text-accent underline underline-offset-2">규정 전문에서 보기</Link>
    </details>
  );
}

export function AskView() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<AskResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function ask(text: string) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });
      const data = await response.json();
      if (!response.ok) setError(data.error ?? "요청을 처리하지 못했습니다.");
      else setResult(data);
    } catch {
      setError("서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (question.trim().length >= 2) ask(question.trim());
  }

  return (
    <>
      <form onSubmit={submit} className="panel p-4">
        <label htmlFor="question" className="text-sm font-medium">질문</label>
        <textarea
          id="question"
          className="field mt-1 min-h-20"
          maxLength={500}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="예: 질병휴직 중 봉급은 얼마나 받나요?"
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted">실제 교원의 이름이나 개인정보는 입력하지 마세요.</p>
          <button type="submit" disabled={loading || question.trim().length < 2} className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {loading ? "찾는 중" : "질문하기"}
          </button>
        </div>
      </form>

      {!result && !loading && !error && (
        <div className="mt-4 flex flex-wrap gap-2">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => {
                setQuestion(example);
                ask(example);
              }}
              className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-muted hover:border-accent hover:text-ink"
            >
              {example}
            </button>
          ))}
        </div>
      )}

      {error && <p role="alert" className="mt-4 text-sm text-unmet">{error}</p>}

      <div aria-live="polite">
        {result?.mode === "no-evidence" && (
          <p className="panel mt-4 p-4 text-sm">규정에서 근거를 찾지 못했습니다. 교원인사 규정과 관련된 표현으로 다시 질문해 주세요.</p>
        )}
        {result?.answer && (
          <section className="panel mt-4 p-4">
            <h2 className="mb-2 flex items-center gap-2 font-bold">
              답변
              {result.mode === "insufficient" && <span className="rounded bg-review-soft px-1.5 py-0.5 text-xs font-semibold text-review">근거 부족</span>}
            </h2>
            <p className="text-sm leading-relaxed whitespace-pre-line">{result.answer}</p>
            <p className="mt-3 text-xs text-muted">AI가 조문을 요약한 참고 정보입니다. 업무 처리 전 아래 원문을 확인하세요.</p>
          </section>
        )}
        {result?.notice && <p className="mt-4 rounded-md bg-review-soft px-3 py-2 text-sm text-review">{result.notice}</p>}
        {result && result.sources.length > 0 && (
          <section className="mt-5">
            <h2 className="mb-2 font-bold">{result.answer ? "근거 조문" : "관련 조문"}</h2>
            <div className="space-y-2">
              {result.sources.map((source) => <SourceCard key={source.id} source={source} />)}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
