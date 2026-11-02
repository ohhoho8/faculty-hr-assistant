import { describe, expect, it } from "vitest";
import { ARTICLES, findArticle } from "@/lib/corpus";
import { NEW_FACULTY, ROSTER } from "@/lib/faculty/roster";
import { addMonths, monthsBetween, nextAppointmentDate, semesterEnd } from "./dates";
import { LEAVE_REASONS, evaluateLeave, type LeaveInput } from "./leave";
import { evaluatePromotion } from "./promotion";
import { evaluateReappointment, nextTerm, reappointmentDates } from "./reappointment";
import { countedService, departmentCheck, evaluateSabbatical, sabbaticalEligibleDate } from "./sabbatical";
import { GRADE_TABLE, gradeFor, promotedGrade } from "./salary-grade";
import { evaluateTenure, tenureEligibility } from "./tenure";
import type { FacultyRecord, RuleResult } from "./types";

const faculty = (overrides: Partial<FacultyRecord>): FacultyRecord => ({ ...NEW_FACULTY, ...overrides });
const statusOf = (result: RuleResult, id: string) => result.checks.find((check) => check.id === id)?.status;

describe("날짜 계산", () => {
  it("없는 날짜는 그 달의 말일로 맞춘다", () => {
    expect(addMonths("2027-06-30", -4)).toBe("2027-02-28");
    expect(addMonths("2028-02-29", 12)).toBe("2029-02-28");
  });
  it("채운 개월만 센다", () => {
    expect(monthsBetween("2020-03-01", "2027-03-01")).toBe(84);
    expect(monthsBetween("2020-03-01", "2027-02-28")).toBe(83);
  });
  it("임용일은 3월 1일과 9월 1일이다", () => {
    expect(nextAppointmentDate("2026-03-01")).toBe("2026-03-01");
    expect(nextAppointmentDate("2026-03-02")).toBe("2026-09-01");
    expect(nextAppointmentDate("2026-09-02")).toBe("2027-03-01");
  });
  it("학기 말일을 구한다", () => {
    expect(semesterEnd("2026-05-01")).toBe("2026-08-31");
    expect(semesterEnd("2026-10-01")).toBe("2027-02-28");
    expect(semesterEnd("2028-01-15")).toBe("2028-02-29");
  });
});

describe("별표 1", () => {
  it("표의 모든 행이 원문과 일치한다", () => {
    const text = ARTICLES.find((article) => article.id === "appendix-1:별표1")!.text;
    const lines = text.split("\n").map((line) => line.split(" | "));
    const cell = (range: [number, number] | null) => {
      if (!range) return "-";
      return range[0] === 0 ? `교육⋅연구경력이 ${range[1]}년미만인 자` : `교육⋅연구경력이 ${range[0]}년이상 ${range[1]}년미만인 자`;
    };
    expect(GRADE_TABLE).toHaveLength(28);
    for (const row of GRADE_TABLE) {
      const line = lines.find((item) => item[0].replace(/\s/g, "") === row.rank && item[1] === String(row.grade));
      expect(line?.[2].trim(), `${row.rank} ${row.grade}호봉 박사`).toBe(cell(row.doctorate));
      expect(line?.[3].trim(), `${row.rank} ${row.grade}호봉 미소지`).toBe(cell(row.nonDoctorate));
    }
  });
  it("경력으로 호봉을 찾는다", () => {
    expect(gradeFor("조교수", true, 0)?.grade).toBe(7);
    expect(gradeFor("조교수", false, 0)?.grade).toBe(9);
    expect(gradeFor("부교수", true, 7.5)?.grade).toBe(5);
    expect(gradeFor("교수", true, 12)?.grade).toBe(10);
    expect(gradeFor("조교수", true, 7)).toBeNull();
  });
  it("승진 호봉은 승진자격년수를 채운 경력의 호봉과 같다", () => {
    expect(promotedGrade("조교수", true, false)).toBe(gradeFor("부교수", true, 7)?.grade);
    expect(promotedGrade("부교수", true, false)).toBe(gradeFor("교수", true, 12)?.grade);
    expect(promotedGrade("조교수", false, false)).toBe(gradeFor("부교수", false, 9)?.grade);
    expect(promotedGrade("부교수", false, false)).toBe(gradeFor("교수", false, 16)?.grade);
  });
});

describe("승진", () => {
  const base = { rank: "조교수", rankStartDate: "2020-03-01", hireDate: "2020-03-01" } as const;

  it("박사 조교수는 7년이 필요하다", () => {
    expect(statusOf(evaluatePromotion(faculty(base), "2027-02-28"), "years")).toBe("unmet");
    expect(statusOf(evaluatePromotion(faculty(base), "2027-03-01"), "years")).toBe("met");
  });
  it("부교수는 5년이 필요하다", () => {
    const result = evaluatePromotion(faculty({ ...base, rank: "부교수" }), "2025-03-01");
    expect(statusOf(result, "years")).toBe("met");
    expect(result.dates[0].date).toBe("2025-03-01");
  });
  it("박사 미소지자는 2년, 공연전시설계실기분야는 1년을 더한다", () => {
    const none = faculty({ ...base, hasDoctorate: false });
    const arts = faculty({ ...base, hasDoctorate: false, isArtsPractice: true });
    expect(evaluatePromotion(none, "2026-01-01").dates[0].date).toBe("2029-03-01");
    expect(evaluatePromotion(arts, "2026-01-01").dates[0].date).toBe("2028-03-01");
  });
  it("인정 경력을 근무년수에 포함한다", () => {
    const result = evaluatePromotion(faculty({ ...base, recognizedYears: 2 }), "2025-03-01");
    expect(statusOf(result, "years")).toBe("met");
  });
  it("임용 제한 기간을 자격년수에 더한다", () => {
    const result = evaluatePromotion(faculty({ ...base, discipline: "감봉", disciplineEndDate: "2026-06-30" }), "2026-01-01");
    expect(result.dates[0].date).toBe("2028-03-01");
  });
  it("징계 집행 종료 후 제한 기간에는 승진할 수 없다", () => {
    const record = faculty({ ...base, recognizedYears: 5, discipline: "견책", disciplineEndDate: "2026-06-30" });
    expect(statusOf(evaluatePromotion(record, "2026-12-29"), "restriction")).toBe("unmet");
    expect(statusOf(evaluatePromotion(record, "2026-12-30"), "restriction")).toBe("met");
  });
  it("휴직 중이면 승진할 수 없다", () => {
    expect(statusOf(evaluatePromotion(faculty({ ...base, restricted: true }), "2028-01-01"), "restriction")).toBe("unmet");
  });
  it("과거 휴직은 가산 여부를 단정하지 않는다", () => {
    const record = faculty({ ...base, leaves: [{ kind: "휴직", start: "2022-03-01", end: "2023-02-28" }] });
    expect(statusOf(evaluatePromotion(record, "2028-01-01"), "past-leave")).toBe("review");
  });
  it("요건을 모두 갖춰도 업적 기준이 없어 확인 필요로 끝난다", () => {
    const result = evaluatePromotion(faculty(base), "2028-01-01");
    expect(result.verdict).toBe("review");
    expect(statusOf(result, "achievement")).toBe("review");
  });
  it("비정년트랙과 교수는 대상이 아니다", () => {
    expect(evaluatePromotion(faculty({ ...base, track: "non-tenure" }), "2030-01-01").verdict).toBe("ineligible");
    expect(evaluatePromotion(faculty({ ...base, rank: "교수" }), "2030-01-01").verdict).toBe("ineligible");
  });
});

describe("재임용", () => {
  it("절차 기한을 계산한다", () => {
    const [notice, apply, decide] = reappointmentDates("2027-02-28");
    expect(notice.date).toBe("2026-10-28");
    expect(apply.date).toBe("2026-11-12");
    expect(decide.date).toBe("2026-12-28");
  });
  it("실제 통지일이 있으면 그날부터 15일을 센다", () => {
    expect(reappointmentDates("2027-02-28", "2026-09-30")[1].date).toBe("2026-10-15");
  });
  it("조교수는 3년, 승진자격 잔여 4년 이하면 잔여기간이다", () => {
    const early = faculty({ rank: "조교수", rankStartDate: "2026-03-01", hireDate: "2026-03-01" });
    expect(nextTerm(early, "2026-03-01").value).toBe("3년");
    const near = faculty({ rank: "조교수", rankStartDate: "2024-03-01", hireDate: "2024-03-01" });
    expect(nextTerm(near, "2029-03-01").value).toContain("2년");
    const last = faculty({ rank: "조교수", rankStartDate: "2024-03-01", hireDate: "2024-03-01" });
    expect(nextTerm(last, "2030-09-01").value).toContain("1년");
  });
  it("승진자격년수를 지나면 2년 이내다", () => {
    const record = faculty({ rank: "조교수", rankStartDate: "2019-03-01", hireDate: "2019-03-01" });
    expect(nextTerm(record, "2027-03-01").value).toContain("2년 이내");
  });
  it("개정 전 임용자는 적용 조항을 확인하게 한다", () => {
    const record = faculty({ rank: "조교수", rankStartDate: "2017-03-01", hireDate: "2017-03-01", recognizedYears: -3 });
    expect(nextTerm(record, "2026-09-01").review).toContain("2018.07.01");
    const professor = faculty({ rank: "부교수", rankStartDate: "2021-03-01", hireDate: "2015-03-01", recognizedYears: -3 });
    expect(nextTerm(professor, "2026-03-01").review).toContain("2021.09.01");
  });
  it("정년보장 교원은 대상이 아니다", () => {
    expect(evaluateReappointment(faculty({ tenured: true, rank: "교수" }), "2026-01-01").verdict).toBe("ineligible");
  });
  it("통지 기한이 지나면 확인을 요구한다", () => {
    const result = evaluateReappointment(faculty({ contractEndDate: "2027-02-28" }), "2026-11-02");
    expect(statusOf(result, "notice")).toBe("review");
  });
  it("비정년트랙 기준은 별도 지침이라 확인 필요다", () => {
    const result = evaluateReappointment(faculty({ track: "non-tenure", contractEndDate: "2027-02-28" }), "2026-01-01");
    expect(result.verdict).toBe("review");
    expect(result.facts[0].value).toContain("2년");
  });
});

describe("정년보장", () => {
  it("조교수는 대상이 아니다", () => {
    expect(evaluateTenure(faculty({ rank: "조교수" }), "2030-01-01").verdict).toBe("ineligible");
  });
  it("부교수는 교수 승진자격년수 도달 시 자격을 얻고 5년 안에 신청한다", () => {
    const record = faculty({ rank: "부교수", hireDate: "2015-03-01", rankStartDate: "2021-03-01" });
    expect(tenureEligibility(record).applicationDeadline).toBe("2031-03-01");
    expect(statusOf(evaluateTenure(record, "2031-03-02"), "window")).toBe("unmet");
  });
  it("신규채용 후 3년이 지난 부교수도 자격이 있다", () => {
    const record = faculty({ rank: "부교수", hireDate: "2024-03-01", rankStartDate: "2024-03-01" });
    expect(tenureEligibility(record).firstEligible).toBe("2027-03-01");
    expect(statusOf(evaluateTenure(record, "2027-03-01"), "eligible")).toBe("met");
    expect(statusOf(evaluateTenure(record, "2027-02-28"), "eligible")).toBe("unmet");
  });
  it("교수 직급 최초 임용자는 자격 취득 후 5년 안에 신청한다", () => {
    const record = faculty({ rank: "교수", hireDate: "2024-09-01", rankStartDate: "2024-09-01" });
    expect(tenureEligibility(record)).toEqual({ firstEligible: "2027-09-01", applicationDeadline: "2032-09-01" });
  });
  it("임용 제한 중에는 신청할 수 없다", () => {
    const record = faculty({ rank: "부교수", hireDate: "2015-03-01", rankStartDate: "2021-03-01", restricted: true });
    expect(evaluateTenure(record, "2027-01-01").verdict).toBe("ineligible");
  });
  it("비정년트랙은 별도 절차로 안내한다", () => {
    expect(evaluateTenure(faculty({ rank: "부교수", track: "non-tenure" }), "2027-01-01").verdict).toBe("review");
  });
});

describe("연구년", () => {
  const base = { hireDate: "2020-03-01", rankStartDate: "2020-03-01", rank: "부교수" } as const;

  it("기간별 근무 요건을 적용한다", () => {
    expect(statusOf(evaluateSabbatical(faculty(base), { startDate: "2026-03-01", months: 12 }, "2025-01-01"), "service")).toBe("met");
    expect(statusOf(evaluateSabbatical(faculty(base), { startDate: "2026-03-01", months: 18 }, "2025-01-01"), "service")).toBe("unmet");
    expect(statusOf(evaluateSabbatical(faculty(base), { startDate: "2023-03-01", months: 6 }, "2022-01-01"), "service")).toBe("met");
  });
  it("직전 연구년 복귀일부터 다시 센다", () => {
    const record = faculty({ ...base, hireDate: "2010-03-01", lastSabbaticalReturn: "2024-03-01" });
    expect(statusOf(evaluateSabbatical(record, { startDate: "2027-03-01", months: 6 }, "2026-01-01"), "service")).toBe("met");
    expect(statusOf(evaluateSabbatical(record, { startDate: "2027-03-01", months: 12 }, "2026-01-01"), "service")).toBe("unmet");
  });
  it("휴직 기간을 근무기간에서 뺀다", () => {
    const record = faculty({ ...base, leaves: [{ kind: "휴직", start: "2022-03-01", end: "2023-03-01" }] });
    expect(countedService(record, "2026-03-01")).toBe(60);
    expect(sabbaticalEligibleDate(record, 12)).toBe("2027-03-01");
  });
  it("임용제한 기간을 근무기간에서 뺀다", () => {
    const record = faculty({ ...base, discipline: "견책", disciplineEndDate: "2023-03-01" });
    expect(countedService(record, "2026-03-01")).toBe(66);
  });
  it("연구결과물 지체 기간만큼 더 근무해야 한다", () => {
    const record = faculty({ ...base, reportDelayMonths: 6 });
    expect(statusOf(evaluateSabbatical(record, { startDate: "2026-03-01", months: 12 }, "2025-01-01"), "service")).toBe("unmet");
    expect(sabbaticalEligibleDate(record, 12)).toBe("2026-09-01");
  });
  it("비정년트랙과 산학협력중점교원·HK교원은 제외한다", () => {
    expect(evaluateSabbatical(faculty({ ...base, track: "non-tenure" }), { startDate: "2030-03-01", months: 6 }, "2029-01-01").verdict).toBe("ineligible");
    expect(evaluateSabbatical(faculty({ ...base, isIndustryOrHk: true }), { startDate: "2030-03-01", months: 6 }, "2029-01-01").verdict).toBe("ineligible");
  });
  it("개시 1년 전 기한이 지나면 확인을 요구한다", () => {
    const result = evaluateSabbatical(faculty({ ...base, rank: "교수" }), { startDate: "2027-03-01", months: 12 }, "2026-11-02");
    expect(statusOf(result, "deadline")).toBe("review");
    expect(result.dates.find((date) => date.label === "신청서 제출 기한")?.date).toBe("2026-03-01");
    expect(result.dates.find((date) => date.label === "연구년 종료일")?.date).toBe("2028-02-29");
  });
  it("2025.09.01 전 개시 건은 현행 기준으로 단정하지 않는다", () => {
    const result = evaluateSabbatical(faculty(base), { startDate: "2025-03-01", months: 6 }, "2024-01-01");
    expect(statusOf(result, "version")).toBe("review");
  });
  it("승진 지연, 재임용 유예, 주요보직, 임상의학은 확인을 요구한다", () => {
    const input = { startDate: "2029-03-01", months: 12 } as const;
    expect(statusOf(evaluateSabbatical(faculty(base), input, "2028-01-01"), "promotion-overdue")).toBe("review");
    expect(statusOf(evaluateSabbatical(faculty({ ...base, reappointmentDeferred: true }), input, "2028-01-01"), "deferred")).toBe("review");
    expect(statusOf(evaluateSabbatical(faculty({ ...base, hasMajorPost: true }), input, "2028-01-01"), "post")).toBe("review");
    expect(statusOf(evaluateSabbatical(faculty({ ...base, isClinical: true }), input, "2028-01-01"), "clinical")).toBe("review");
  });
  it("학과 인원 상한을 적용한다", () => {
    expect(departmentCheck({ faculty: 3, onSabbatical: 1, otherAbsent: 0 }).status).toBe("unmet");
    expect(departmentCheck({ faculty: 3, onSabbatical: 0, otherAbsent: 0 }).status).toBe("review");
    expect(departmentCheck({ faculty: 5, onSabbatical: 1, otherAbsent: 1 }).status).toBe("unmet");
    expect(departmentCheck({ faculty: 12, onSabbatical: 1, otherAbsent: 2 }).status).toBe("review");
    expect(departmentCheck({ faculty: 14, onSabbatical: 0, otherAbsent: 1 }).status).toBe("met");
    expect(departmentCheck({ faculty: 12, onSabbatical: 1, otherAbsent: 3 }).status).toBe("unmet");
  });
});

describe("휴직", () => {
  const input = (overrides: Partial<LeaveInput>): LeaveInput => ({
    reasonNo: 7,
    startDate: "2027-03-01",
    requestedMonths: 12,
    usedMonths: 0,
    contractEndDate: null,
    ...overrides,
  });

  it("정관의 호 15개를 모두 다룬다", () => {
    expect(LEAVE_REASONS.map((reason) => reason.no)).toEqual(Array.from({ length: 15 }, (_, index) => index + 1));
  });
  it("임용기간 제한 대상은 제1·3·12·13·15호다", () => {
    expect(LEAVE_REASONS.filter((reason) => reason.withinTerm).map((reason) => reason.no)).toEqual([1, 3, 12, 13, 15]);
  });
  it("본인 의사와 무관한 휴직은 제1~4호와 제12호다", () => {
    expect(LEAVE_REASONS.filter((reason) => reason.order === "mandatory").map((reason) => reason.no)).toEqual([1, 2, 3, 4, 12]);
  });
  it("육아휴직은 자녀 1명당 3년이다", () => {
    expect(statusOf(evaluateLeave(input({ requestedMonths: 12, usedMonths: 24 })), "period")).toBe("met");
    expect(statusOf(evaluateLeave(input({ requestedMonths: 13, usedMonths: 24 })), "period")).toBe("unmet");
  });
  it("육아휴직은 심의가 없고 최초 1년만 근속에 산입한다", () => {
    const facts = evaluateLeave(input({})).facts;
    expect(facts.find((fact) => fact.label === "교원인사위원회")?.value).toBe("심의하지 않음");
    expect(facts.find((fact) => fact.label === "근속기간 산입")?.value).toContain("최초 1년");
    expect(facts.find((fact) => fact.label === "휴직 명령")?.value).toContain("본인이 원하면");
  });
  it("일반 질병은 1년, 연장 1년이고 진단서가 필요하다", () => {
    const base = { reasonNo: 1, variant: "general" } as const;
    expect(statusOf(evaluateLeave(input({ ...base, requestedMonths: 12 })), "period")).toBe("met");
    expect(statusOf(evaluateLeave(input({ ...base, requestedMonths: 18 })), "period")).toBe("review");
    expect(statusOf(evaluateLeave(input({ ...base, requestedMonths: 25 })), "period")).toBe("unmet");
    expect(statusOf(evaluateLeave(input(base)), "certificate")).toBe("review");
  });
  it("공무상 질병은 3년, 연장 2년이고 보수 전액이다", () => {
    const base = { reasonNo: 1, variant: "official" } as const;
    expect(statusOf(evaluateLeave(input({ ...base, requestedMonths: 36 })), "period")).toBe("met");
    expect(statusOf(evaluateLeave(input({ ...base, requestedMonths: 60 })), "period")).toBe("review");
    expect(statusOf(evaluateLeave(input({ ...base, requestedMonths: 61 })), "period")).toBe("unmet");
    const facts = evaluateLeave(input(base)).facts;
    expect(facts.find((fact) => fact.label === "휴직 중 봉급")?.value).toBe("보수 전액");
    expect(facts.find((fact) => fact.label === "근속기간 산입")?.value).toBe("산입");
  });
  it("결핵성 질환은 봉급의 8할이다", () => {
    const facts = evaluateLeave(input({ reasonNo: 1, variant: "tuberculosis" })).facts;
    expect(facts.find((fact) => fact.label === "휴직 중 봉급")?.value).toBe("봉급의 8할");
  });
  it("벤처·창업 휴직은 최대 4년이고 근속에 산입하지 않는다", () => {
    const base = { reasonNo: 14 };
    expect(statusOf(evaluateLeave(input({ ...base, requestedMonths: 12 })), "period")).toBe("met");
    expect(statusOf(evaluateLeave(input({ ...base, requestedMonths: 12, usedMonths: 36 })), "period")).toBe("review");
    expect(statusOf(evaluateLeave(input({ ...base, requestedMonths: 12, usedMonths: 37 })), "period")).toBe("unmet");
    expect(evaluateLeave(input(base)).facts.find((fact) => fact.label === "근속기간 산입")?.value).toBe("산입하지 않음");
  });
  it("가족 간호는 1회 1년, 재직 중 총 3년이다", () => {
    const base = { reasonNo: 10 };
    expect(statusOf(evaluateLeave(input({ ...base, requestedMonths: 13 })), "period")).toBe("unmet");
    expect(statusOf(evaluateLeave(input({ ...base, requestedMonths: 12, usedMonths: 24 })), "period")).not.toBe("unmet");
    expect(statusOf(evaluateLeave(input({ ...base, requestedMonths: 12, usedMonths: 25 })), "period")).toBe("unmet");
  });
  it("자기개발 휴직은 재직 10년 이상, 1회 1년이다", () => {
    const base = { reasonNo: 13 };
    expect(statusOf(evaluateLeave(input({ ...base, serviceYears: 9 })), "service")).toBe("unmet");
    expect(statusOf(evaluateLeave(input({ ...base, serviceYears: 10 })), "service")).toBe("met");
    expect(statusOf(evaluateLeave(input({ ...base, serviceYears: 12, usedMonths: 12 })), "period")).toBe("unmet");
  });
  it("임용기간 잔여기간을 넘으면 제1호는 안 되고 제7호는 된다", () => {
    const end = { contractEndDate: "2027-08-31", requestedMonths: 12 };
    expect(statusOf(evaluateLeave(input({ ...end, reasonNo: 1, variant: "general" })), "term")).toBe("unmet");
    expect(statusOf(evaluateLeave(input({ ...end, reasonNo: 7 })), "term")).toBeUndefined();
  });
  it("복무기간으로 정해지는 휴직은 기간 상한이 없다", () => {
    expect(statusOf(evaluateLeave(input({ reasonNo: 2, requestedMonths: 21 })), "period")).toBe("met");
  });
  it("제15호 봉급은 정관에 없어 확인 필요다", () => {
    expect(statusOf(evaluateLeave(input({ reasonNo: 15, variant: "indicted", requestedMonths: 3 })), "pay")).toBe("review");
    expect(statusOf(evaluateLeave(input({ reasonNo: 15, variant: "other", requestedMonths: 24 })), "period")).toBe("met");
    expect(statusOf(evaluateLeave(input({ reasonNo: 15, variant: "other", requestedMonths: 25 })), "period")).toBe("unmet");
  });
  it("시작일이 3월 1일이나 9월 1일이 아니면 확인을 요구한다", () => {
    expect(statusOf(evaluateLeave(input({ startDate: "2027-04-01" })), "start")).toBe("review");
    expect(statusOf(evaluateLeave(input({ startDate: "2027-09-01" })), "start")).toBe("met");
  });
  it("복귀 신고 기한을 계산한다", () => {
    const result = evaluateLeave(input({ startDate: "2027-03-01", requestedMonths: 12 }));
    expect(result.dates[0].date).toBe("2028-02-29");
    expect(result.dates[1].date).toBe("2028-03-30");
  });
});

describe("근거 조문", () => {
  const results: RuleResult[] = ROSTER.flatMap((record) => [
    evaluatePromotion(record, "2026-11-02"),
    evaluateReappointment(record, "2026-11-02"),
    evaluateTenure(record, "2026-11-02"),
    evaluateSabbatical(record, { startDate: "2025-03-01", months: 12, staffing: { faculty: 10, onSabbatical: 1, otherAbsent: 0 } }, "2026-11-02"),
    evaluateSabbatical({ ...record, isClinical: true, hasMajorPost: true, reappointmentDeferred: true }, { startDate: "2028-03-01", months: 6 }, "2026-11-02"),
  ]);
  for (const reason of LEAVE_REASONS) {
    results.push(evaluateLeave({ reasonNo: reason.no, startDate: "2027-04-01", requestedMonths: 6, usedMonths: 0, contractEndDate: "2027-08-31", serviceYears: 12 }));
  }

  it("모든 판정 항목에 근거 조문이 있다", () => {
    for (const result of results) {
      for (const item of [...result.checks, ...result.dates, ...result.facts]) {
        expect(item.citations.length, `${result.task}: ${item.label}`).toBeGreaterThan(0);
      }
    }
  });
  it("인용한 조문이 실제 규정에 있다", () => {
    for (const result of results) {
      for (const item of [...result.checks, ...result.dates, ...result.facts]) {
        for (const citation of item.citations) {
          expect(findArticle(citation.docId, citation.article), `${citation.docId} ${citation.article}`).toBeDefined();
        }
      }
    }
  });
  it("인용한 부칙이 적용 시기 내용을 담고 있다", () => {
    expect(findArticle("faculty-personnel", "부칙 32")?.text).toContain("2018년 7월 1일");
    expect(findArticle("faculty-personnel", "부칙 40")?.text).toContain("2021년 9월 1일");
    expect(findArticle("faculty-personnel", "부칙 47")?.text).toContain("2019년 9월 1일");
    expect(findArticle("faculty-personnel", "부칙 50")?.text).toContain("2026년 3월 1일");
    expect(findArticle("sabbatical", "부칙 33")?.text).toContain("2025년 9월 1일");
  });
});
