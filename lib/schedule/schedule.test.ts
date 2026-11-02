import { describe, expect, it } from "vitest";
import { findArticle } from "@/lib/corpus";
import { NEW_FACULTY, ROSTER } from "@/lib/faculty/roster";
import { buildSchedule, retirementDate } from "./schedule";

describe("업무 일정", () => {
  const asOf = "2026-11-02";
  const events = buildSchedule(ROSTER, asOf, 365 * 5);

  it("기준일 이후 일정만 날짜순으로 보여준다", () => {
    expect(events.every((event) => event.date >= asOf)).toBe(true);
    expect([...events].sort((a, b) => a.date.localeCompare(b.date)).map((event) => event.date)).toEqual(events.map((event) => event.date));
  });

  it("규정 계산 일정에는 근거 조문이 있고 가상 일정에는 없다", () => {
    for (const event of events) {
      if (event.basis === "규정 계산") {
        expect(event.citations.length, event.title).toBeGreaterThan(0);
        for (const citation of event.citations) expect(findArticle(citation.docId, citation.article)).toBeDefined();
      } else {
        expect(event.citations).toHaveLength(0);
      }
    }
    expect(events.some((event) => event.basis === "가상")).toBe(true);
  });

  it("재임용 통지 기한을 교원별로 계산한다", () => {
    const record = { ...NEW_FACULTY, contractEndDate: "2027-08-31" };
    const list = buildSchedule([record], "2027-01-01", 240);
    expect(list.find((event) => event.title.includes("통지 기한") && event.faculty)?.date).toBe("2027-04-30");
  });

  it("정년보장 교원은 재임용 일정이 없다", () => {
    const list = buildSchedule([{ ...NEW_FACULTY, rank: "교수", tenured: true, contractEndDate: "2027-08-31" }], "2027-01-01", 240);
    expect(list.some((event) => event.category === "재임용")).toBe(false);
  });

  it("정년은 만 65세가 되는 학기 말일이다", () => {
    expect(retirementDate("1961-12-30")).toBe("2027-02-28");
    expect(retirementDate("1962-04-01")).toBe("2027-08-31");
  });

  it("범위를 벗어난 일정은 제외한다", () => {
    expect(buildSchedule(ROSTER, asOf, 30).every((event) => event.date <= "2026-12-02")).toBe(true);
  });
});
