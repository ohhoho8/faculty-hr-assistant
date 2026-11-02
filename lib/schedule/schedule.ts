import { disciplineRestrictionEnd, promotionEligibleDate } from "@/lib/rules/common";
import { addDays, addMonths, daysBetween, nextAppointmentDate, semesterEnd } from "@/lib/rules/dates";
import { reappointmentDates } from "@/lib/rules/reappointment";
import { sabbaticalEligibleDate } from "@/lib/rules/sabbatical";
import { tenureEligibility } from "@/lib/rules/tenure";
import { PERSONNEL, SABBATICAL, cite, type Citation, type FacultyRecord } from "@/lib/rules/types";

export type EventCategory = "재임용" | "승진" | "정년보장" | "연구년" | "휴직" | "정년퇴직" | "임용 제한" | "학교 공통";

/** 규정 계산: 규정과 교원 정보로 구한 실제 날짜, 가상: 공고 전이라 알 수 없어 시연용으로 정한 날짜 */
export type EventBasis = "규정 계산" | "가상";

export type ScheduleEvent = {
  id: string;
  date: string;
  category: EventCategory;
  title: string;
  faculty: { id: string; name: string; department: string } | null;
  basis: EventBasis;
  citations: Citation[];
};

const RETIREMENT_AGE_MONTHS = 65 * 12;

export function retirementDate(birthDate: string): string {
  return semesterEnd(addMonths(birthDate, RETIREMENT_AGE_MONTHS));
}

function facultyEvents(faculty: FacultyRecord): ScheduleEvent[] {
  const events: ScheduleEvent[] = [];
  const who = { id: faculty.id, name: faculty.name, department: faculty.department };
  const add = (key: string, date: string, category: EventCategory, title: string, citations: Citation[]) =>
    events.push({ id: `${faculty.id}-${key}`, date, category, title, faculty: who, basis: "규정 계산", citations });

  if (!faculty.tenured && faculty.contractEndDate) {
    reappointmentDates(faculty.contractEndDate).forEach((item, index) =>
      add(`reappoint-${index}`, item.date, "재임용", item.label, item.citations),
    );
  }

  if (faculty.track === "tenure" && faculty.rank !== "교수") {
    const eligible = promotionEligibleDate(faculty)!;
    add("promotion", eligible, "승진", `${faculty.rank} 승진자격년수 도달`, cite(PERSONNEL, "제19조"));
    add("promotion-date", nextAppointmentDate(eligible), "승진", "승진 가능한 가장 빠른 임용일", cite(PERSONNEL, "제15조"));
  }

  const tenure = tenureEligibility(faculty);
  if (tenure.firstEligible) add("tenure", tenure.firstEligible, "정년보장", "정년보장 신청 자격 취득", cite(PERSONNEL, "제34조"));
  if (tenure.applicationDeadline) add("tenure-end", tenure.applicationDeadline, "정년보장", "정년보장 신청 가능 기한", cite(PERSONNEL, "제34조"));

  if (faculty.track === "tenure" && !faculty.isIndustryOrHk && !faculty.isClinical) {
    add("sabbatical", sabbaticalEligibleDate(faculty, 12), "연구년", "연구년 1년 근무기간 충족", cite(SABBATICAL, "제4조", "제5조"));
    if (faculty.plannedSabbaticalStart) {
      add("sabbatical-apply", addMonths(faculty.plannedSabbaticalStart, -12), "연구년", "연구년 신청서 제출 기한", cite(SABBATICAL, "제7조"));
      add("sabbatical-notice", addMonths(faculty.plannedSabbaticalStart, -6), "연구년", "연구년 승인 통보 기한", cite(SABBATICAL, "제7조"));
    }
  }

  const restrictionEnd = disciplineRestrictionEnd(faculty);
  if (restrictionEnd) add("restriction", restrictionEnd, "임용 제한", `${faculty.discipline} 임용 제한 종료`, cite(PERSONNEL, "제12조"));
  if (faculty.birthDate) add("retirement", retirementDate(faculty.birthDate), "정년퇴직", "정년 도달 학기 말일 당연 퇴직", cite(PERSONNEL, "제48조"));

  return events;
}

function commonEvents(year: number): ScheduleEvent[] {
  const fixed = (id: string, date: string, title: string, citations: Citation[]): ScheduleEvent => ({
    id: `common-${id}-${year}`,
    date,
    category: "학교 공통",
    title,
    faculty: null,
    basis: "규정 계산",
    citations,
  });
  const virtual = (id: string, date: string, title: string, category: EventCategory): ScheduleEvent => ({
    id: `virtual-${id}-${year}`,
    date,
    category,
    title,
    faculty: null,
    basis: "가상",
    citations: [],
  });
  return [
    fixed("report", `${year}-01-31`, "겸직 교원 금전 지원 내역 서면 보고 기한", cite(PERSONNEL, "제7조")),
    fixed("spring", `${year}-03-01`, "1학기 임용일", cite(PERSONNEL, "제15조")),
    fixed("fall", `${year}-09-01`, "2학기 임용일", cite(PERSONNEL, "제15조")),
    virtual("spring-apply", `${year}-03-15`, "9월 임용 승진·정년보장 신청 접수 시작", "승진"),
    virtual("spring-committee", `${year}-06-20`, "9월 임용 교원인사위원회 심의", "승진"),
    virtual("fall-apply", `${year}-09-15`, "3월 임용 승진·정년보장 신청 접수 시작", "승진"),
    virtual("fall-committee", `${year}-12-20`, "3월 임용 교원인사위원회 심의", "승진"),
  ];
}

const LOOK_BACK_DAYS = 30;

/** 앞으로의 일정에 처리 여부를 확인해야 하는 지난 절차 기한을 더한다. */
export function buildBoard(roster: FacultyRecord[], asOf: string, windowDays: number): ScheduleEvent[] {
  return buildSchedule(roster, addDays(asOf, -LOOK_BACK_DAYS), LOOK_BACK_DAYS + windowDays).filter(
    (event) => event.date >= asOf || (event.faculty !== null && event.title.includes("기한")),
  );
}

export function buildSchedule(roster: FacultyRecord[], asOf: string, windowDays: number): ScheduleEvent[] {
  const until = addMonths(asOf, Math.ceil(windowDays / 28));
  const firstYear = Number(asOf.slice(0, 4));
  const lastYear = Number(until.slice(0, 4));
  const common = Array.from({ length: lastYear - firstYear + 1 }, (_, index) => commonEvents(firstYear + index)).flat();

  return [...roster.flatMap(facultyEvents), ...common]
    .filter((event) => {
      const days = daysBetween(asOf, event.date);
      return days >= 0 && days <= windowDays;
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}
