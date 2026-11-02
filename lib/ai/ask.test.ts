import { beforeEach, describe, expect, it } from "vitest";
import { ARTICLES } from "@/lib/corpus";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { search } from "@/lib/search/search";
import { formatSources } from "./gemini";
import { askRegulation } from "./ask";

const QUESTION = "연구년 신청서는 언제까지 내야 하나요?";
const REAL_ID = "sabbatical:제7조";

describe("규정 질의응답", () => {
  it("근거가 없으면 모델을 부르지 않는다", async () => {
    let called = false;
    const result = await askRegulation("오늘 학생식당 점심 메뉴가 뭐야?", async () => {
      called = true;
      return {};
    });
    expect(result.mode).toBe("no-evidence");
    expect(called).toBe(false);
  });

  it("API 키가 없으면 관련 조문만 돌려준다", async () => {
    const result = await askRegulation(QUESTION, null);
    expect(result.mode).toBe("search-only");
    expect(result.answer).toBeNull();
    expect(result.sources.map((source) => source.id)).toContain(REAL_ID);
  });

  it("검색 결과에 없는 인용은 버린다", async () => {
    const result = await askRegulation(QUESTION, async () => ({
      answer: "개시 1년 전까지 제출합니다.",
      citedIds: [REAL_ID, "faculty-personnel:제999조"],
      insufficient: false,
    }));
    expect(result.mode).toBe("answer");
    expect(result.sources.map((source) => source.id)).toEqual([REAL_ID]);
  });

  it("실제 조문을 하나도 인용하지 않은 답변은 보여주지 않는다", async () => {
    const result = await askRegulation(QUESTION, async () => ({
      answer: "지어낸 답변입니다.",
      citedIds: ["faculty-personnel:제999조"],
      insufficient: false,
    }));
    expect(result.mode).toBe("search-only");
    expect(result.answer).toBeNull();
  });

  it("근거 부족 답변은 표시를 달아 전달한다", async () => {
    const result = await askRegulation(QUESTION, async () => ({
      answer: "조문만으로는 확인할 수 없습니다.",
      citedIds: [],
      insufficient: true,
    }));
    expect(result.mode).toBe("insufficient");
    expect(result.sources.length).toBeGreaterThan(0);
  });

  it("형식이 잘못되었거나 모델이 실패하면 조문 검색으로 돌아간다", async () => {
    expect((await askRegulation(QUESTION, async () => ({ answer: "" }))).mode).toBe("search-only");
    const failed = await askRegulation(QUESTION, async () => {
      throw new Error("provider error");
    });
    expect(failed.mode).toBe("search-only");
    expect(failed.notice).not.toContain("provider");
  });

  it("모델이 제한시간 안에 답하지 않으면 조문을 먼저 보여준다", async () => {
    const result = await askRegulation(QUESTION, () => new Promise(() => {}), 10);
    expect(result.mode).toBe("search-only");
    expect(result.sources.map((source) => source.id)).toContain(REAL_ID);
  });

  it("2017년판 조문에는 현행과 다를 수 있다고 표시해 모델에 넘긴다", () => {
    const article = ARTICLES.find((item) => item.outdated)!;
    expect(formatSources([article])).toContain("2017년판");
  });

  it("2017년판 휴직 조문은 코퍼스에서 제외한다", () => {
    const ids = search("휴직 기간", 20).map((hit) => hit.article.id);
    expect(ids.some((id) => /^charter-2017:제4[4-7]조$/.test(id))).toBe(false);
  });
});

describe("사용량 제한", () => {
  beforeEach(resetRateLimit);

  it("같은 사용자는 1시간에 10번까지 허용한다", () => {
    for (let i = 0; i < 10; i += 1) expect(checkRateLimit("a", 200, 1000)).toBe("ok");
    expect(checkRateLimit("a", 200, 1000)).toBe("client");
    expect(checkRateLimit("b", 200, 1000)).toBe("ok");
    expect(checkRateLimit("a", 200, 1000 + 60 * 60 * 1000 + 1)).toBe("ok");
  });

  it("하루 전체 상한을 넘기지 않는다", () => {
    expect(checkRateLimit("a", 1, 1000)).toBe("ok");
    expect(checkRateLimit("b", 1, 1000)).toBe("daily");
    expect(checkRateLimit("b", 1, 1000 + 86_400_000)).toBe("ok");
  });
});

describe("근거 범위", () => {
  it("다른 직종을 묻지 않으면 전임교원 규정만 넘긴다", async () => {
    const result = await askRegulation("육아휴직은 몇 년까지 가능한가요?", null);
    expect(result.sources.map((source) => source.docId)).not.toContain("lecturer");
    expect(result.sources.map((source) => source.id)).toContain("charter-leave:제45조");
  });

  it("조교수를 조교로 오인하지 않는다", async () => {
    const result = await askRegulation("조교수 임용기간은 몇 년인가요?", null);
    expect(result.sources.map((source) => source.docId)).not.toContain("teaching-assistant");
  });

  it("다른 직종을 물으면 해당 규정을 포함한다", async () => {
    const result = await askRegulation("강사 재임용 통지는 언제 하나요?", null);
    expect(result.sources.map((source) => source.docId)).toContain("lecturer");
  });
});
