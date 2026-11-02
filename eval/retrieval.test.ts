import { describe, expect, it } from "vitest";
import { retrieve } from "@/lib/search/search";
import questions from "./questions.json";
import unanswerable from "./unanswerable.json";
import holdout from "./holdout.json";

describe("규정 검색 평가", () => {
  it("질문의 정답 조문을 상위 6개 안에서 찾는다", () => {
    const missed = questions.filter(({ q, expect: ids }) => {
      const found = retrieve(q).map((hit) => hit.article.id);
      return !ids.some((id) => found.includes(id));
    });
    const top1 = questions.filter(({ q, expect: ids }) => ids.includes(retrieve(q)[0]?.article.id)).length;
    console.log(`Recall@6 ${questions.length - missed.length}/${questions.length}, Top-1 ${top1}/${questions.length}`);
    for (const { q, expect: ids } of missed) {
      console.log(`  놓침: ${q} → 정답 ${ids[0]} / 결과 ${retrieve(q).slice(0, 3).map((hit) => hit.article.id).join(", ")}`);
    }
    expect(missed.length / questions.length).toBeLessThanOrEqual(0.05);
  });

  it("규정에 없는 질문에는 근거가 없다고 판단한다", () => {
    const wrong = unanswerable.filter((question) => retrieve(question).length > 0);
    console.log(`무근거 판별 ${unanswerable.length - wrong.length}/${unanswerable.length}`, wrong);
    const answered = questions.filter(({ q }) => retrieve(q).length === 0).map(({ q }) => q);
    console.log(`답변 가능 질문을 무근거로 판단 ${answered.length}`, answered);
    expect(wrong.length).toBeLessThanOrEqual(2);
    expect(answered.length).toBeLessThanOrEqual(1);
  });
});

describe("별도 평가 세트", () => {
  it("조정에 쓰지 않은 질문으로 측정한다", () => {
    const hit = holdout.answerable.filter(({ q, expect: ids }) => {
      const found = retrieve(q).map((item) => item.article.id);
      return ids.some((id) => found.includes(id));
    });
    const top1 = holdout.answerable.filter(({ q, expect: ids }) => ids.includes(retrieve(q)[0]?.article.id));
    const rejected = holdout.unanswerable.filter((question) => retrieve(question).length === 0);
    const accepted = holdout.answerable.filter(({ q }) => retrieve(q).length > 0);
    console.log(`별도 세트 Recall@6 ${hit.length}/${holdout.answerable.length}, Top-1 ${top1.length}/${holdout.answerable.length}, 규정 밖 거절 ${rejected.length}/${holdout.unanswerable.length}, 답변 가능 통과 ${accepted.length}/${holdout.answerable.length}`);
    for (const { q } of holdout.answerable.filter((item) => !hit.includes(item))) console.log(`  별도 세트 놓침: ${q} / ${retrieve(q).slice(0, 3).map((item) => item.article.id).join(", ")}`);
    for (const q of holdout.unanswerable.filter((item) => !rejected.includes(item))) console.log(`  별도 세트 오통과: ${q}`);
    expect(hit.length / holdout.answerable.length).toBeGreaterThanOrEqual(0.8);
  });
});
