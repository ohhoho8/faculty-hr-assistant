import { disciplineRestrictionEnd, promotionEligibleDate } from "./common";
import { addDays, addMonths, formatDate, formatMonths, monthsBetween } from "./dates";
import { PERSONNEL, SABBATICAL, cite, verdictOf, type Check, type FacultyRecord, type KeyDate, type RuleResult } from "./types";

export type SabbaticalMonths = 6 | 12 | 18;

/** 연구년제 제4조 제1항 */
export const REQUIRED_SERVICE: Record<SabbaticalMonths, number> = {
  6: 3 * 12,
  12: 6 * 12,
  18: 9 * 12,
};

export type DepartmentStaffing = {
  faculty: number;
  onSabbatical: number;
  otherAbsent: number;
};

export type SabbaticalInput = {
  startDate: string;
  months: SabbaticalMonths;
  staffing?: DepartmentStaffing | null;
};

function serviceStart(faculty: FacultyRecord): string {
  return faculty.lastSabbaticalReturn ?? faculty.hireDate;
}

function overlapMonths(start: string, end: string, from: string, to: string): number {
  const a = start > from ? start : from;
  const b = end < to ? end : to;
  return a < b ? monthsBetween(a, b) : 0;
}

/** 휴직·파견·연수와 임용제한 기간은 근무기간에서 뺀다. 연구년제 제5조 제1항. */
export function excludedMonths(faculty: FacultyRecord, until: string): number {
  const from = serviceStart(faculty);
  const leave = faculty.leaves.reduce((sum, item) => sum + overlapMonths(item.start, item.end, from, until), 0);
  const restrictionEnd = disciplineRestrictionEnd(faculty);
  const restriction =
    restrictionEnd && faculty.disciplineEndDate ? overlapMonths(faculty.disciplineEndDate, restrictionEnd, from, until) : 0;
  return leave + restriction;
}

export function countedService(faculty: FacultyRecord, until: string): number {
  return monthsBetween(serviceStart(faculty), until) - excludedMonths(faculty, until);
}

/** 지정한 연구년 기간을 신청할 수 있는 가장 이른 개시 기준일. 앞으로의 제외 기간은 알 수 없어 현재 입력 기준이다. */
export function sabbaticalEligibleDate(faculty: FacultyRecord, months: SabbaticalMonths): string {
  const delay = faculty.reportDelayMonths;
  const required = REQUIRED_SERVICE[months] + delay;
  let date = addMonths(serviceStart(faculty), required);
  for (let i = 0; i < 4; i += 1) {
    const shortfall = required - countedService(faculty, date);
    if (shortfall <= 0) break;
    date = addMonths(date, shortfall);
  }
  return date;
}

export function departmentCheck(staffing: DepartmentStaffing): Check {
  const { faculty, onSabbatical, otherAbsent } = staffing;
  const absentAfter = onSabbatical + otherAbsent + 1;
  const cap = faculty <= 3 ? 1 : faculty <= 5 ? 2 : Math.floor(faculty / 3);
  const citations = cite(SABBATICAL, "제8조");
  if (absentAfter > cap) {
    return {
      id: "staffing",
      label: "학과 복무 인원",
      status: "unmet",
      detail: `연구년·휴직·연수로 복무하지 않는 교원이 ${absentAfter}명이 되어 상한 ${cap}명을 넘습니다.`,
      citations,
    };
  }
  if ((onSabbatical + 1) * 7 > faculty) {
    return {
      id: "staffing",
      label: "학과 연구년 인원",
      status: "review",
      detail: `연구년 교원이 ${onSabbatical + 1}명이 되어 7분의 1 원칙을 넘습니다. 세부사항은 별도 지침을 확인해야 합니다.`,
      citations,
    };
  }
  return { id: "staffing", label: "학과 인원 제한", status: "met", detail: "학과 인원 제한 안에 있습니다.", citations };
}

export function evaluateSabbatical(faculty: FacultyRecord, input: SabbaticalInput, asOf: string): RuleResult {
  const checks: Check[] = [];
  const dates: KeyDate[] = [];
  const notes: string[] = [];
  const article4 = cite(SABBATICAL, "제4조");
  const task = `연구년 ${formatMonths(input.months)}`;

  if (faculty.track !== "tenure" || faculty.isIndustryOrHk) {
    checks.push({
      id: "track",
      label: "신청 대상",
      status: "unmet",
      detail: "정년트랙 전임교원만 신청할 수 있으며 산학협력중점교원과 HK교원은 제외됩니다.",
      citations: [...article4, ...cite(PERSONNEL, "제4조")],
    });
    return { task, verdict: "ineligible", summary: "연구년 신청 대상이 아닙니다.", checks, dates, facts: [], notes };
  }
  checks.push({ id: "track", label: "신청 대상", status: "met", detail: "정년트랙 전임교원입니다.", citations: article4 });

  if (faculty.isClinical) {
    checks.push({
      id: "clinical",
      label: "임상의학 전임교원",
      status: "review",
      detail: "임상의학 전임교원의 연구년제는 따로 정하며 보유 규정에 없습니다.",
      citations: cite(SABBATICAL, "제14조"),
    });
  }
  if (input.startDate < "2025-09-01") {
    checks.push({
      id: "version",
      label: "적용 규정",
      status: "review",
      detail: "현행 제4조는 2025.09.01 연구년 개시자부터 적용됩니다. 그 전 개시 건은 개정 전 규정을 확인해야 합니다.",
      citations: cite(SABBATICAL, "제4조", "부칙 33"),
    });
  }

  const served = countedService(faculty, input.startDate);
  const excluded = excludedMonths(faculty, input.startDate);
  const required = REQUIRED_SERVICE[input.months] + faculty.reportDelayMonths;
  const eligibleDate = sabbaticalEligibleDate(faculty, input.months);
  const extra = [
    excluded > 0 ? `제외 기간 ${formatMonths(excluded)}` : null,
    faculty.reportDelayMonths > 0 ? `연구결과물 지체 ${formatMonths(faculty.reportDelayMonths)} 추가` : null,
  ].filter(Boolean);
  checks.push({
    id: "service",
    label: "근무기간",
    status: served >= required ? "met" : "unmet",
    detail: `개시일 기준 필요 ${formatMonths(required)}, 인정 ${formatMonths(served)}입니다.${extra.length ? ` (${extra.join(", ")})` : ""}`,
    citations: cite(SABBATICAL, "제4조", "제5조"),
  });

  const deadline = addMonths(input.startDate, -12);
  if (asOf > deadline) {
    checks.push({
      id: "deadline",
      label: "신청 기한",
      status: "review",
      detail: `개시 1년 전 기한(${formatDate(deadline)})이 지났습니다. 특별한 사유가 있으면 총장이 승인할 수 있습니다.`,
      citations: cite(SABBATICAL, "제7조"),
    });
  }

  const promotionDue = promotionEligibleDate(faculty);
  if (promotionDue && !faculty.tenured && asOf > promotionDue) {
    checks.push({
      id: "promotion-overdue",
      label: "승진 지연",
      status: "review",
      detail: "승진자격을 갖추고 기간이 지났는데 승진하지 못한 교원은 신청이 제한되거나 승인이 취소될 수 있습니다.",
      citations: cite(SABBATICAL, "제4조"),
    });
  }
  if (faculty.reappointmentDeferred) {
    checks.push({
      id: "deferred",
      label: "재임용 유예",
      status: "review",
      detail: "재임용 거부가 유예된 교원은 신청이 제한되거나 승인이 취소될 수 있습니다.",
      citations: cite(SABBATICAL, "제4조"),
    });
  }
  if (faculty.hasMajorPost) {
    checks.push({
      id: "post",
      label: "주요보직",
      status: "review",
      detail: "보직기간 중 신청할 수 있으나 연구년 기간은 보직기간 종료 이후여야 합니다.",
      citations: cite(SABBATICAL, "제4조"),
    });
  }
  if (input.staffing) checks.push(departmentCheck(input.staffing));

  dates.push(
    { label: "근무기간 충족일", date: eligibleDate, citations: cite(SABBATICAL, "제4조", "제5조") },
    { label: "신청서 제출 기한", date: deadline, citations: cite(SABBATICAL, "제7조") },
    { label: "승인 통보·취소 기한", date: addMonths(input.startDate, -6), citations: cite(SABBATICAL, "제4조", "제7조") },
    { label: "연구년 종료일", date: addDays(addMonths(input.startDate, input.months), -1), citations: cite(SABBATICAL, "제6조") },
  );
  notes.push("규정에 근무기간을 언제 기준으로 세는지 명시되어 있지 않아 연구년 개시일 기준으로 계산했습니다.");
  notes.push(`복귀 후 ${formatMonths(input.months * 2)}을 전임으로 근무해야 합니다. 어기면 급여와 연구비를 일할 계산해 반납합니다(제10조).`);
  if (!input.staffing) notes.push("학과 인원을 입력하면 제8조의 인원 제한도 판정합니다.");

  const verdict = verdictOf(checks);
  return {
    task,
    verdict,
    summary:
      verdict === "ineligible"
        ? "입력한 개시일 기준으로 신청 요건을 충족하지 못합니다."
        : verdict === "review"
          ? "근무기간은 충족합니다. 표시된 항목은 확인이 필요합니다."
          : "규정상 신청 요건을 충족합니다.",
    checks,
    dates,
    facts: [],
    notes,
  };
}
