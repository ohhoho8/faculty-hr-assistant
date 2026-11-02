import { promotionRequiredMonths, servedMonths } from "./common";
import { addDays, addMonths, formatDate, formatMonths } from "./dates";
import { PERSONNEL, cite, verdictOf, type Check, type FacultyRecord, type Fact, type KeyDate, type RuleResult } from "./types";

const TERM_CITATIONS = cite(PERSONNEL, "제16조", "부칙 32", "부칙 40", "부칙 47", "부칙 50");

export function reappointmentDates(contractEndDate: string, noticeDate?: string | null): KeyDate[] {
  const article = cite(PERSONNEL, "제33조");
  const notice = addMonths(contractEndDate, -4);
  return [
    { label: "재임용 신청 안내 통지 기한", date: notice, citations: article },
    { label: "교원의 재임용 신청 기한", date: addDays(noticeDate ?? notice, 15), citations: article },
    { label: "재임용 여부 통지 기한", date: addMonths(contractEndDate, -2), citations: article },
    { label: "임용기간 만료일", date: contractEndDate, citations: article },
  ];
}

/** 재임용 시 임용기간. 교원인사 규정 제16조 제1항·제4항과 부칙의 적용 시기를 반영한다. */
export function nextTerm(faculty: FacultyRecord, termStart: string): { value: string; review: string | null } {
  if (faculty.rank === "교수") {
    return { value: "2년 이내 (제16조 제4항, 별도 재임용요건 충족 시)", review: null };
  }
  const required = promotionRequiredMonths(faculty)!;
  const remaining = required - servedMonths(faculty, termStart);
  if (remaining <= 0) {
    return { value: "2년 이내 (승진자격년수 경과, 제16조 제4항)", review: null };
  }
  const review = reviewReason(faculty, termStart);
  if (faculty.rank === "조교수" && remaining > 48) return { value: "3년", review };
  return { value: `${formatMonths(Math.max(remaining, 12))} (승진자격년수 잔여기간)`, review };
}

function reviewReason(faculty: FacultyRecord, termStart: string): string | null {
  if (termStart < "2026-03-01") {
    return "2025.12.08 개정 제16조는 2026.03.01부터 시행되어 그 전에 시작하는 임용기간은 개정 전 조항을 확인해야 합니다.";
  }
  if (faculty.rank === "조교수" && faculty.hireDate < "2018-07-01") {
    return "제16조 다목은 2018.07.01 이후 신규 임용자부터 적용되며, 2015.09.01~2018.06.30 임용자는 본인이 원하면 심의를 거쳐 적용할 수 있습니다.";
  }
  if (faculty.rank === "부교수" && faculty.rankStartDate < "2021-09-01") {
    return "부교수 임용기간은 2021.09.01 이후 임용자부터 적용되며, 2018.03.01~2021.08.31 임용자는 본인이 원하면 심의를 거쳐 적용할 수 있습니다.";
  }
  return null;
}

export function evaluateReappointment(faculty: FacultyRecord, asOf: string): RuleResult {
  const checks: Check[] = [];
  const facts: Fact[] = [];
  const notes: string[] = [];
  let dates: KeyDate[] = [];

  if (faculty.tenured) {
    checks.push({
      id: "target",
      label: "재임용 대상",
      status: "unmet",
      detail: "정년보장 교원은 임용기간이 정년까지여서 재임용 대상이 아닙니다.",
      citations: cite(PERSONNEL, "제16조"),
    });
    return { task: "재임용", verdict: "ineligible", summary: "재임용 대상이 아닙니다.", checks, dates, facts, notes };
  }
  if (!faculty.contractEndDate) {
    checks.push({
      id: "target",
      label: "임용기간 만료일",
      status: "review",
      detail: "임용기간 만료일을 입력해야 기한을 계산할 수 있습니다.",
      citations: cite(PERSONNEL, "제33조"),
    });
    return { task: "재임용", verdict: "review", summary: "임용기간 만료일이 필요합니다.", checks, dates, facts, notes };
  }

  dates = reappointmentDates(faculty.contractEndDate);
  const [notice] = dates;
  const expired = asOf > faculty.contractEndDate;
  checks.push({
    id: "target",
    label: "재임용 대상",
    status: expired ? "review" : "met",
    detail: expired
      ? `임용기간이 ${formatDate(faculty.contractEndDate)}에 만료되었습니다. 임용 상태를 확인해야 합니다.`
      : `임용기간이 ${formatDate(faculty.contractEndDate)}에 만료됩니다.`,
    citations: cite(PERSONNEL, "제33조"),
  });
  if (!expired && asOf > notice.date) {
    checks.push({
      id: "notice",
      label: "통지 기한",
      status: "review",
      detail: `통지 기한(${formatDate(notice.date)})이 지났습니다. 문서 통지가 이루어졌는지 확인해야 합니다.`,
      citations: cite(PERSONNEL, "제33조"),
    });
  }
  checks.push({
    id: "criteria",
    label: "재임용 심사 기준",
    status: "review",
    detail:
      faculty.track === "tenure"
        ? "학과내규와 인사지침의 기준으로, 보유 규정에 수치가 없어 판정할 수 없습니다."
        : "비정년트랙 교원의 재임용기준은 별도 지침으로 정하며 보유 규정에 없습니다.",
    citations: cite(PERSONNEL, "제33조"),
  });

  if (faculty.track === "non-tenure") {
    facts.push({ label: "다음 임용기간", value: "2년 (외국인교원 등은 2년 이내)", citations: cite(PERSONNEL, "제16조") });
  } else {
    const term = nextTerm(faculty, addDays(faculty.contractEndDate, 1));
    facts.push({ label: "다음 임용기간", value: term.value, citations: cite(PERSONNEL, "제16조") });
    if (term.review) {
      checks.push({ id: "term", label: "임용기간 적용 조항", status: "review", detail: term.review, citations: TERM_CITATIONS });
    }
  }
  if (faculty.reappointmentDeferred) {
    notes.push("재임용 거부 유예 중입니다. 유예기간 내에 추가 요건을 충족하지 못하면 만료일에 당연 면직됩니다.");
  }
  notes.push("요건을 충족하지 못해도 불가피한 사유가 있으면 교원인사위원회 심의로 재임용 거부를 1년 유예할 수 있습니다(제33조 제6항).");

  return {
    task: "재임용",
    verdict: verdictOf(checks),
    summary: "재임용 절차 기한을 계산했습니다. 심사 기준은 학과내규와 인사지침에서 확인해야 합니다.",
    checks,
    dates,
    facts,
    notes,
  };
}
