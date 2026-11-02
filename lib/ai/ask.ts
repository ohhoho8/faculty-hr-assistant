import type { Article } from "@/lib/corpus";
import { retrieve } from "@/lib/search/search";
import { modelAnswerSchema, type AnswerGenerator } from "./gemini";

export type AskMode = "answer" | "insufficient" | "no-evidence" | "search-only";

export type AskSource = Pick<Article, "id" | "docId" | "docTitle" | "article" | "heading" | "text" | "outdated">;

export type AskResult = {
  mode: AskMode;
  answer: string | null;
  sources: AskSource[];
  /** AI를 쓰지 못한 이유. 사용자에게 그대로 보여준다. */
  notice: string | null;
};

const toSource = ({ id, docId, docTitle, article, heading, text, outdated }: Article): AskSource => ({
  id,
  docId,
  docTitle,
  article,
  heading,
  text,
  outdated,
});

/** 모델이 응답하지 않아도 찾아둔 조문은 보여주기 위한 제한시간 */
const ANSWER_TIMEOUT_MS = 30_000;

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("timeout")), ms);
  });
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}

const NO_KEY = "AI 답변이 꺼져 있어 관련 조문만 표시합니다.";
const FAILED = "AI 답변을 만들지 못해 관련 조문만 표시합니다.";

export async function askRegulation(question: string, generator: AnswerGenerator | null, timeoutMs = ANSWER_TIMEOUT_MS): Promise<AskResult> {
  const hits = retrieve(question);
  if (hits.length === 0) {
    return { mode: "no-evidence", answer: null, sources: [], notice: null };
  }
  const sources = hits.map((hit) => hit.article);
  if (!generator) {
    return { mode: "search-only", answer: null, sources: sources.map(toSource), notice: NO_KEY };
  }

  let parsed;
  try {
    parsed = modelAnswerSchema.parse(await withTimeout(generator(question, sources), timeoutMs));
  } catch (error) {
    // 질문과 조문이 섞일 수 있어 오류의 종류만 남긴다.
    const { name, status } = error as { name?: string; status?: number };
    console.error("AI 답변 실패", name, status ?? "");
    return { mode: "search-only", answer: null, sources: sources.map(toSource), notice: FAILED };
  }

  // 모델이 검색 결과에 없는 조문을 인용해도 화면에는 실제 조문만 남긴다.
  const allowed = new Map(sources.map((source) => [source.id, source]));
  const cited = parsed.citedIds.flatMap((id) => {
    const source = allowed.get(id);
    return source ? [source] : [];
  });
  if (cited.length === 0 && !parsed.insufficient) {
    return { mode: "search-only", answer: null, sources: sources.map(toSource), notice: FAILED };
  }
  return {
    mode: parsed.insufficient ? "insufficient" : "answer",
    answer: parsed.answer,
    sources: (cited.length > 0 ? cited : sources).map(toSource),
    notice: null,
  };
}
