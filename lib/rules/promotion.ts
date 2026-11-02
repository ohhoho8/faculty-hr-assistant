import {
  pastLeaveCheck,
  promotionEligibleDate,
  promotionRequiredMonths,
  restrictionCheck,
  servedMonths,
  trackCheck,
} from "./common";
import { formatDate, formatMonths, nextAppointmentDate } from "./dates";
import { gradeFor, promotedGrade } from "./salary-grade";
import {
  APPENDIX_1,
  PERSONNEL,
  cite,
  verdictOf,
  type Check,
  type FacultyRecord,
  type Fact,
  type KeyDate,
  type RuleResult,
} from "./types";

export function evaluatePromotion(faculty: FacultyRecord, asOf: string): RuleResult {
  const target = faculty.rank === "조교수" ? "부교수" : "교수";
  const checks: Check[] = [trackCheck(faculty, "제27조")];
  const dates: KeyDate[] = [];
  const facts: Fact[] = [];
  const notes: string[] = [];

  const required = promotionRequiredMonths(faculty);
  if (required === null) {
    checks.push({
      id: "rank",
      label: "승진 대상 직급",
      status: "unmet",
      detail: "교수는 상위 직급이 없어 승진 대상이 아닙니다.",
      citations: cite(PERSONNEL, "제5조", "제19조"),
    });
    return finish(faculty, checks, dates, facts, notes);
  }

  const served = servedMonths(faculty, asOf);
  const eligibleDate = promotionEligibleDate(faculty)!;
  checks.push({
    id: "years",
    label: "승진자격년수",
    status: served >= required ? "met" : "unmet",
    detail: `필요 ${formatMonths(required)}, 인정 경력 포함 근무 ${formatMonths(served)}입니다.`,
    citations: cite(PERSONNEL, "제19조"),
  });
  checks.push(restrictionCheck(faculty, asOf));
  const leave = pastLeaveCheck(faculty, asOf);
  if (leave) checks.push(leave);
  checks.push({
    id: "achievement",
    label: "연구실적·업적 기준",
    status: "review",
    detail: "학과내규와 교원업적평가 및 인사지침의 기준으로, 보유 규정에 수치가 없어 판정할 수 없습니다.",
    citations: cite(PERSONNEL, "제27조", "제35조"),
  });

  dates.push({ label: "승진자격년수 도달일", date: eligibleDate, citations: cite(PERSONNEL, "제19조") });
  dates.push({
    label: "도달 후 가장 빠른 임용일",
    date: nextAppointmentDate(eligibleDate),
    citations: cite(PERSONNEL, "제15조"),
  });

  const grade = promotedGrade(faculty.rank, faculty.hasDoctorate, faculty.isArtsPractice);
  if (grade !== null) {
    facts.push({ label: "승진 후 호봉", value: `${target} ${grade}호봉`, citations: cite(PERSONNEL, "제27조") });
  }
  if (faculty.careerYears !== null) {
    const row = gradeFor(faculty.rank, faculty.hasDoctorate, faculty.careerYears);
    facts.push({
      label: "경력 기준 호봉",
      value: row ? `${row.rank} ${row.grade}호봉` : "별표 1의 현 직급 범위 밖 (확인 필요)",
      citations: cite(APPENDIX_1, "별표 1"),
    });
  }
  if (!faculty.hasDoctorate) {
    notes.push("제27조 제4항은 \"제2항의 직급별 승진호봉\"이라고 쓰지만 승진호봉은 제3항에 있습니다. 별표 1과 맞는 제3항 기준으로 계산했습니다.");
  }
  return finish(faculty, checks, dates, facts, notes);
}

function finish(
  faculty: FacultyRecord,
  checks: Check[],
  dates: KeyDate[],
  facts: Fact[],
  notes: string[],
): RuleResult {
  const verdict = verdictOf(checks);
  const eligible = dates[0];
  const summary =
    verdict === "ineligible"
      ? eligible && !checks.some((c) => c.id !== "years" && c.status === "unmet")
        ? `${formatDate(eligible.date)}에 승진자격년수에 도달합니다.`
        : "현재 승진심사를 신청할 수 없습니다."
      : "승진자격년수는 충족합니다. 업적 기준은 심사에서 확인해야 합니다.";
  return { task: faculty.rank === "교수" ? "승진" : `${faculty.rank === "조교수" ? "부교수" : "교수"} 승진`, verdict, summary, checks, dates, facts, notes };
}
