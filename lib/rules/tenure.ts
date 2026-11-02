import { pastLeaveCheck, promotionEligibleDate, restrictionCheck } from "./common";
import { addMonths, formatDate } from "./dates";
import { PERSONNEL, cite, verdictOf, type Check, type FacultyRecord, type KeyDate, type RuleResult } from "./types";

const YEARS_AFTER_HIRE = 3 * 12;
const APPLICATION_WINDOW_MONTHS = 5 * 12;

export function tenureEligibility(faculty: FacultyRecord): {
  firstEligible: string | null;
  applicationDeadline: string | null;
} {
  if (faculty.track !== "tenure" || faculty.tenured || faculty.rank === "조교수") {
    return { firstEligible: null, applicationDeadline: null };
  }
  const afterHire = addMonths(faculty.hireDate, YEARS_AFTER_HIRE);
  const firstAsProfessor = faculty.rank === "교수" && faculty.rankStartDate === faculty.hireDate;
  const yearsReached = faculty.rank === "부교수" ? promotionEligibleDate(faculty) : null;

  const candidates = [afterHire, yearsReached].filter((date): date is string => date !== null);
  const firstEligible = candidates.sort()[0];

  // 제34조 제2항: 교수직급 승진자격년수 도달자와 교수 직급 최초 임용자만 신청 기한이 있다.
  const windowApplies = faculty.rank === "부교수" || firstAsProfessor;
  const windowStart = firstAsProfessor ? afterHire : (yearsReached ?? firstEligible);
  return {
    firstEligible,
    applicationDeadline: windowApplies ? addMonths(windowStart, APPLICATION_WINDOW_MONTHS) : null,
  };
}

export function evaluateTenure(faculty: FacultyRecord, asOf: string): RuleResult {
  const checks: Check[] = [];
  const dates: KeyDate[] = [];
  const notes: string[] = [];
  const article = cite(PERSONNEL, "제34조");

  if (faculty.tenured) {
    checks.push({ id: "target", label: "정년보장 대상", status: "unmet", detail: "이미 정년보장을 받은 교원입니다.", citations: article });
    return { task: "정년보장", verdict: "ineligible", summary: "이미 정년보장을 받았습니다.", checks, dates, facts: [], notes };
  }
  if (faculty.track !== "tenure") {
    checks.push({
      id: "target",
      label: "정년보장 대상",
      status: "review",
      detail: "비정년트랙 교원은 업적이 탁월한 경우 별도 트랙전환 절차를 거쳐야 하며, 그 기준은 보유 규정에 없습니다.",
      citations: article,
    });
    return { task: "정년보장", verdict: "review", summary: "비정년트랙은 별도 절차 대상입니다.", checks, dates, facts: [], notes };
  }
  if (faculty.rank === "조교수") {
    checks.push({ id: "target", label: "정년보장 대상 직급", status: "unmet", detail: "조교수는 정년보장 심사 대상 직급이 아닙니다.", citations: article });
    return { task: "정년보장", verdict: "ineligible", summary: "부교수 승진 후 대상이 될 수 있습니다.", checks, dates, facts: [], notes };
  }

  const { firstEligible, applicationDeadline } = tenureEligibility(faculty);
  const eligible = firstEligible !== null && asOf >= firstEligible;
  checks.push({
    id: "eligible",
    label: "정년보장 신청 자격",
    status: eligible ? "met" : "unmet",
    detail: eligible
      ? `${formatDate(firstEligible)}에 자격을 취득했습니다.`
      : `${formatDate(firstEligible!)}에 자격을 취득합니다.`,
    citations: article,
  });
  dates.push({ label: "신청 자격 취득일", date: firstEligible!, citations: article });

  if (applicationDeadline) {
    dates.push({ label: "신청 가능 기한", date: applicationDeadline, citations: article });
    if (asOf > applicationDeadline) {
      checks.push({
        id: "window",
        label: "신청 기한",
        status: "unmet",
        detail: `최초 자격 취득 후 5년이 지났습니다. 기한은 ${formatDate(applicationDeadline)}이었습니다.`,
        citations: article,
      });
    }
  }
  checks.push(restrictionCheck(faculty, asOf));
  const leave = pastLeaveCheck(faculty, asOf);
  if (leave) checks.push(leave);
  checks.push({
    id: "criteria",
    label: "정년보장 심사 기준",
    status: "review",
    detail: "세부사항은 별도 지침으로 정하며 보유 규정에 수치가 없습니다.",
    citations: cite(PERSONNEL, "제34조", "제35조"),
  });

  const verdict = verdictOf(checks);
  return {
    task: "정년보장",
    verdict,
    summary:
      verdict === "ineligible"
        ? "현재 정년보장 심사를 신청할 수 없습니다."
        : "신청 자격은 충족합니다. 심사 기준은 지침에서 확인해야 합니다.",
    checks,
    dates,
    facts: [],
    notes,
  };
}
