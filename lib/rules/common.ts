import { addMonths, formatDate, formatMonths, monthsBetween } from "./dates";
import { PERSONNEL, cite, type Check, type DisciplineType, type FacultyRecord, type Rank } from "./types";

/** 교원인사 규정 제12조 제1항 제2호 */
export const DISCIPLINE_MONTHS: Record<DisciplineType, number> = {
  none: 0,
  정직: 18,
  감봉: 12,
  견책: 6,
};

const BASE_PROMOTION_MONTHS: Partial<Record<Rank, number>> = {
  조교수: 7 * 12,
  부교수: 5 * 12,
};

export function disciplineRestrictionEnd(faculty: FacultyRecord): string | null {
  const months = DISCIPLINE_MONTHS[faculty.discipline];
  if (!months || !faculty.disciplineEndDate) return null;
  return addMonths(faculty.disciplineEndDate, months);
}

/** 승진자격년수(개월). 교수는 대상이 아니므로 null이다. 제19조 제3항~제5항. */
export function promotionRequiredMonths(faculty: FacultyRecord): number | null {
  const base = BASE_PROMOTION_MONTHS[faculty.rank];
  if (base === undefined) return null;
  const degreeAddition = faculty.hasDoctorate ? 0 : faculty.isArtsPractice ? 12 : 24;
  return base + degreeAddition + DISCIPLINE_MONTHS[faculty.discipline];
}

/** 현 직급 근무기간에 인정 경력을 더한 개월 수 */
export function servedMonths(faculty: FacultyRecord, asOf: string): number {
  return monthsBetween(faculty.rankStartDate, asOf) + Math.round(faculty.recognizedYears * 12);
}

export function promotionEligibleDate(faculty: FacultyRecord): string | null {
  const required = promotionRequiredMonths(faculty);
  if (required === null) return null;
  return addMonths(faculty.rankStartDate, required - Math.round(faculty.recognizedYears * 12));
}

export function trackCheck(faculty: FacultyRecord, article: string): Check {
  return faculty.track === "tenure"
    ? { id: "track", label: "정년트랙 교원", status: "met", detail: "정년트랙 전임교원입니다.", citations: cite(PERSONNEL, article) }
    : {
        id: "track",
        label: "정년트랙 교원",
        status: "unmet",
        detail: "비정년트랙 교원은 이 규정의 적용 대상이 아닙니다.",
        citations: cite(PERSONNEL, "제4조", article),
      };
}

/** 승진임용·정년보장에 공통으로 적용되는 임용 제한. 제12조 제1항. */
export function restrictionCheck(faculty: FacultyRecord, asOf: string): Check {
  const citations = cite(PERSONNEL, "제12조");
  if (faculty.restricted) {
    return {
      id: "restriction",
      label: "임용 제한",
      status: "unmet",
      detail: "징계의결요구·징계처분·직위해제 또는 휴직 중에는 임용할 수 없습니다.",
      citations,
    };
  }
  const end = disciplineRestrictionEnd(faculty);
  if (end && asOf < end) {
    return {
      id: "restriction",
      label: "임용 제한",
      status: "unmet",
      detail: `${faculty.discipline} 집행 종료 후 ${DISCIPLINE_MONTHS[faculty.discipline]}개월이 지나지 않았습니다. 제한 종료일은 ${formatDate(end)}입니다.`,
      citations,
    };
  }
  if (faculty.discipline !== "none" && !faculty.disciplineEndDate) {
    return { id: "restriction", label: "임용 제한", status: "review", detail: "징계처분 집행 종료일을 입력해야 제한 기간을 계산할 수 있습니다.", citations };
  }
  return { id: "restriction", label: "임용 제한", status: "met", detail: "제12조 제1항의 임용 제한 사유가 없습니다.", citations };
}

export function pastLeaveCheck(faculty: FacultyRecord, asOf: string): Check | null {
  const leaves = faculty.leaves.filter(
    (leave) => leave.kind === "휴직" && leave.end >= faculty.rankStartDate && leave.start <= asOf,
  );
  if (leaves.length === 0) return null;
  const months = leaves.reduce((sum, leave) => sum + monthsBetween(leave.start, leave.end), 0);
  return {
    id: "past-leave",
    label: "휴직기간 가산",
    status: "review",
    detail: `현 직급 중 휴직 약 ${formatMonths(months)}이 있습니다. 제19조 제5항의 임용제한 기간 가산 여부는 휴직 종류에 따라 달라져 위 계산에 넣지 않았습니다.`,
    citations: cite(PERSONNEL, "제19조", "제17조"),
  };
}
