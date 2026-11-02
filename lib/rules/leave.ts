import { addDays, addMonths, formatDate, formatMonths } from "./dates";
import { CHARTER, PERSONNEL, cite, verdictOf, type Check, type Fact, type KeyDate, type RuleResult } from "./types";

type Order = "mandatory" | "on-request" | "discretionary";
type Seniority = "included" | "excluded" | "first-year" | "principal" | "unspecified";

export type LeaveVariant = "general" | "tuberculosis" | "official" | "degree" | "indicted" | "other";

export type LeaveReason = {
  no: number;
  label: string;
  order: Order;
  /** 1회 기본 한도(개월). 복무기간처럼 기간으로 정해지면 null이다. */
  baseMonths: number | null;
  extensionMonths: number;
  /** 재직기간 등을 통틀어 쓸 수 있는 총한도(개월) */
  totalMonths?: number;
  /** 제45조 제2항: 임용기간 잔여기간을 넘을 수 없다. */
  withinTerm: boolean;
  pay: string | null;
  seniority: Seniority;
  periodNote?: string;
  variants?: { value: LeaveVariant; label: string }[];
};

const UNPAID = "봉급 미지급";

/** 정관 제44조, 제45조, 제47조 (2026.02.19 개정) */
export const LEAVE_REASONS: LeaveReason[] = [
  {
    no: 1,
    label: "신체·정신상 장애로 장기요양",
    order: "mandatory",
    baseMonths: 12,
    extensionMonths: 12,
    withinTerm: true,
    pay: "봉급의 반액",
    seniority: "unspecified",
    variants: [
      { value: "general", label: "일반 질병" },
      { value: "tuberculosis", label: "결핵성 질환" },
      { value: "official", label: "공무상 질병·부상" },
    ],
  },
  { no: 2, label: "병역 복무", order: "mandatory", baseMonths: null, extensionMonths: 0, withinTerm: false, pay: UNPAID, seniority: "included", periodNote: "복무기간 만료 때까지" },
  { no: 3, label: "천재지변 등으로 생사·소재 불명", order: "mandatory", baseMonths: 3, extensionMonths: 0, withinTerm: true, pay: UNPAID, seniority: "unspecified" },
  { no: 4, label: "법률상 의무 수행", order: "mandatory", baseMonths: null, extensionMonths: 0, withinTerm: false, pay: UNPAID, seniority: "included", periodNote: "복무기간 만료 때까지" },
  {
    no: 5,
    label: "해외유학 또는 외국 연구·연수",
    order: "discretionary",
    baseMonths: 36,
    extensionMonths: 0,
    withinTerm: false,
    pay: "봉급의 반액",
    seniority: "unspecified",
    variants: [
      { value: "general", label: "연구·연수" },
      { value: "degree", label: "학위취득" },
    ],
  },
  { no: 6, label: "국제기구·외국기관 등에 고용", order: "discretionary", baseMonths: null, extensionMonths: 0, withinTerm: false, pay: UNPAID, seniority: "principal", periodNote: "고용기간" },
  { no: 7, label: "육아 또는 임신·출산", order: "on-request", baseMonths: 36, extensionMonths: 0, withinTerm: false, pay: UNPAID, seniority: "first-year", periodNote: "자녀 1명당, 분할 가능" },
  { no: 8, label: "입양", order: "on-request", baseMonths: 6, extensionMonths: 0, withinTerm: false, pay: UNPAID, seniority: "included", periodNote: "입양자녀 1명당" },
  { no: 9, label: "국내 연구·교육기관 연수", order: "discretionary", baseMonths: 36, extensionMonths: 0, withinTerm: false, pay: UNPAID, seniority: "unspecified" },
  { no: 10, label: "가족 간호", order: "discretionary", baseMonths: 12, extensionMonths: 0, totalMonths: 36, withinTerm: false, pay: UNPAID, seniority: "unspecified", periodNote: "재직기간 중 총 3년" },
  { no: 11, label: "배우자 국외근무·유학 동반", order: "discretionary", baseMonths: 36, extensionMonths: 36, withinTerm: false, pay: UNPAID, seniority: "unspecified", periodNote: "총 기간은 배우자 국외 기간 이내" },
  { no: 12, label: "노동조합 전임", order: "mandatory", baseMonths: null, extensionMonths: 0, withinTerm: true, pay: UNPAID, seniority: "included", periodNote: "전임기간" },
  { no: 13, label: "자기개발 (재직 10년 이상)", order: "discretionary", baseMonths: 12, extensionMonths: 0, totalMonths: 12, withinTerm: true, pay: UNPAID, seniority: "unspecified", periodNote: "재직기간 중 1회" },
  { no: 14, label: "벤처기업·창업기업 근무", order: "discretionary", baseMonths: 12, extensionMonths: 36, withinTerm: false, pay: UNPAID, seniority: "excluded", periodNote: "1년씩 연장" },
  {
    no: 15,
    label: "구속기소 또는 임용권자 인정 사유",
    order: "discretionary",
    baseMonths: 3,
    extensionMonths: 0,
    withinTerm: true,
    pay: null,
    seniority: "unspecified",
    variants: [
      { value: "indicted", label: "구속기소" },
      { value: "other", label: "임용권자 인정 사유" },
    ],
  },
];

const ORDER_LABEL: Record<Order, string> = {
  mandatory: "본인 의사와 관계없이 휴직을 명해야 함",
  "on-request": "본인이 원하면 휴직을 명해야 함",
  discretionary: "임용권자가 휴직을 명할 수 있음",
};

const SENIORITY_LABEL: Record<Seniority, string> = {
  included: "산입",
  excluded: "산입하지 않음",
  "first-year": "최초 1년 이내 산입",
  principal: "각 학교의 장이 결정",
  unspecified: "정관에 명시 없음 (확인 필요)",
};

export type LeaveInput = {
  reasonNo: number;
  variant?: LeaveVariant;
  startDate: string;
  requestedMonths: number | null;
  /** 같은 사유(자녀별 사유는 같은 자녀)로 이미 사용한 기간 */
  usedMonths: number;
  contractEndDate: string | null;
  /** 사학연금 재직기간(년). 제13호 판정에 쓴다. */
  serviceYears?: number | null;
};

function limits(reason: LeaveReason, variant?: LeaveVariant) {
  if (reason.no === 1 && variant === "official") return { base: 36, extension: 24, total: undefined };
  if (reason.no === 5 && variant === "degree") return { base: 36, extension: 36, total: undefined };
  if (reason.no === 15 && variant === "other") return { base: 24, extension: 0, total: 24 };
  return { base: reason.baseMonths, extension: reason.extensionMonths, total: reason.totalMonths };
}

function payFor(reason: LeaveReason, variant?: LeaveVariant): string | null {
  if (reason.no === 1 && variant === "tuberculosis") return "봉급의 8할";
  if (reason.no === 1 && variant === "official") return "보수 전액";
  return reason.pay;
}

function seniorityFor(reason: LeaveReason, variant?: LeaveVariant): Seniority {
  return reason.no === 1 && variant === "official" ? "included" : reason.seniority;
}

function periodCheck(reason: LeaveReason, input: LeaveInput): Check {
  const citations = cite(CHARTER, "제45조");
  const { base, extension, total } = limits(reason, input.variant);
  if (base === null) {
    return { id: "period", label: "휴직 기간", status: "met", detail: `기간 상한 없이 ${reason.periodNote}입니다.`, citations };
  }
  if (input.requestedMonths === null) {
    return { id: "period", label: "휴직 기간", status: "review", detail: "신청 기간을 입력해야 합니다.", citations };
  }
  const sum = input.requestedMonths + input.usedMonths;
  const limit = total ?? base + extension;
  const usage = `신청 ${formatMonths(input.requestedMonths)}, 기사용 ${formatMonths(input.usedMonths)}, 한도 ${formatMonths(limit)}입니다.`;
  if (sum > limit) return { id: "period", label: "휴직 기간", status: "unmet", detail: `한도를 넘습니다. ${usage}`, citations };
  if (reason.no === 10 && input.requestedMonths > base) {
    return { id: "period", label: "휴직 기간", status: "unmet", detail: `1회 휴직은 ${formatMonths(base)} 이내입니다. ${usage}`, citations };
  }
  if (sum > base) {
    return { id: "period", label: "휴직 기간", status: "review", detail: `기본 기간을 넘어 연장 사유를 확인해야 합니다. ${usage}`, citations };
  }
  if (reason.no === 15 && input.variant === "indicted") {
    return { id: "period", label: "휴직 기간", status: "met", detail: `${usage} 1심판결 종료 때까지 연장할 수 있습니다.`, citations };
  }
  return { id: "period", label: "휴직 기간", status: "met", detail: usage, citations };
}

export function evaluateLeave(input: LeaveInput): RuleResult {
  const reason = LEAVE_REASONS.find((item) => item.no === input.reasonNo);
  if (!reason) throw new Error(`알 수 없는 휴직 사유입니다: ${input.reasonNo}`);

  const task = `휴직 (제${reason.no}호 ${reason.label})`;
  const checks: Check[] = [periodCheck(reason, input)];
  const dates: KeyDate[] = [];
  const notes: string[] = [];

  if (reason.no === 13) {
    if (input.serviceYears === null || input.serviceYears === undefined) {
      checks.push({ id: "service", label: "재직기간 10년", status: "review", detail: "사립학교 교직원 연금법상 재직기간을 입력해야 합니다.", citations: cite(CHARTER, "제44조") });
    } else {
      checks.push({
        id: "service",
        label: "재직기간 10년",
        status: input.serviceYears >= 10 ? "met" : "unmet",
        detail: `재직기간 ${input.serviceYears}년입니다.`,
        citations: cite(CHARTER, "제44조"),
      });
    }
  }

  const end = input.requestedMonths !== null ? addDays(addMonths(input.startDate, input.requestedMonths), -1) : null;
  if (reason.withinTerm && input.contractEndDate && end) {
    checks.push({
      id: "term",
      label: "임용기간 잔여기간",
      status: end > input.contractEndDate ? "unmet" : "met",
      detail:
        end > input.contractEndDate
          ? `휴직 종료일 ${formatDate(end)}이 임용기간 만료일 ${formatDate(input.contractEndDate)}을 넘습니다.`
          : "임용기간 잔여기간 안에 있습니다.",
      citations: cite(CHARTER, "제45조"),
    });
  }

  const monthDay = input.startDate.slice(5);
  checks.push({
    id: "start",
    label: "휴직 시작일",
    status: monthDay === "03-01" || monthDay === "09-01" ? "met" : "review",
    detail:
      monthDay === "03-01" || monthDay === "09-01"
        ? "3월 1일 또는 9월 1일 원칙에 맞습니다."
        : "휴직 시작일은 3월 1일과 9월 1일이 원칙입니다. 총장이 필요한 경우 달리 정할 수 있습니다.",
    citations: cite(PERSONNEL, "제15조"),
  });

  if (reason.no === 1 || reason.no === 10) {
    checks.push({
      id: "certificate",
      label: "진단서 제출",
      status: "review",
      detail: "한양대학교 병원 또는 상급종합병원 발부 진단서가 필요합니다. 제출 여부를 확인해 주세요.",
      citations: cite(PERSONNEL, "제44조의2"),
    });
  }

  const pay = payFor(reason, input.variant);
  if (pay === null) {
    checks.push({
      id: "pay",
      label: "휴직 중 봉급",
      status: "review",
      detail: "정관 제47조 제1항·제2항에 제15호의 봉급 지급 기준이 없습니다.",
      citations: cite(CHARTER, "제47조"),
    });
  }

  const deliberation =
    reason.no === 7 || reason.no === 8
      ? "심의하지 않음"
      : reason.no === 1
        ? "심의 대상 (중증질환은 생략 가능)"
        : "심의 대상";
  const seniority = seniorityFor(reason, input.variant);
  const facts: Fact[] = [
    { label: "휴직 명령", value: ORDER_LABEL[reason.order], citations: cite(CHARTER, "제44조") },
    { label: "교원인사위원회", value: deliberation, citations: cite(PERSONNEL, "제44조의2") },
    { label: "휴직 중 봉급", value: pay ?? "정관에 명시 없음 (확인 필요)", citations: cite(CHARTER, "제47조") },
    { label: "근속기간 산입", value: SENIORITY_LABEL[seniority], citations: cite(CHARTER, "제47조") },
  ];

  if (end) {
    dates.push({ label: "휴직 종료일", date: end, citations: cite(CHARTER, "제45조") });
    dates.push({ label: "복귀 신고 기한", date: addDays(end, 30), citations: cite(CHARTER, "제46조") });
  }
  notes.push("휴직 사유가 소멸하면 30일 이내에 임용권자에게 신고해야 합니다(정관 제46조).");
  notes.push("임용기간 산입은 교원인사 규정 제17조 제4항이 정관 제47조 제3항·제4항을 따르도록 했지만, 정관은 '근속 기간'으로 쓰고 있어 같은 뜻인지 확인이 필요합니다.");

  const verdict = verdictOf(checks);
  return {
    task,
    verdict,
    summary:
      verdict === "ineligible"
        ? "입력한 조건으로는 휴직 요건을 충족하지 못합니다."
        : verdict === "review"
          ? "표시된 항목을 확인하면 진행할 수 있습니다."
          : "정관상 요건을 충족합니다.",
    checks,
    dates,
    facts,
    notes,
  };
}
