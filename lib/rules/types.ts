export type Rank = "조교수" | "부교수" | "교수";
export type Track = "tenure" | "non-tenure";
export type DisciplineType = "none" | "정직" | "감봉" | "견책";

export type LeavePeriod = {
  kind: "휴직" | "파견" | "연수";
  start: string;
  end: string;
};

export type FacultyRecord = {
  id: string;
  name: string;
  college: string;
  department: string;
  track: Track;
  rank: Rank;
  hasDoctorate: boolean;
  /** 공연전시설계실기분야 */
  isArtsPractice: boolean;
  isClinical: boolean;
  /** 본교 신규임용일 */
  hireDate: string;
  /** 현 직급 임용일 */
  rankStartDate: string;
  /** 현 직급 근무년수에 포함되는 인정 경력(년). 산출 기준은 별도 지침이라 입력값으로 받는다. */
  recognizedYears: number;
  /** 별표 1 호봉 조회에 쓰는 전체 교육·연구경력(년) */
  careerYears: number | null;
  contractEndDate: string | null;
  tenured: boolean;
  birthDate: string | null;
  /** 징계의결요구·징계처분·직위해제 또는 휴직 중 */
  restricted: boolean;
  discipline: DisciplineType;
  /** 징계처분 집행 종료일 */
  disciplineEndDate: string | null;
  leaves: LeavePeriod[];
  /** 직전 연구년 복귀일 */
  lastSabbaticalReturn: string | null;
  /** 연구결과물 제출 지체 기간(개월) */
  reportDelayMonths: number;
  /** 재임용 거부 유예 중 */
  reappointmentDeferred: boolean;
  /** 주요보직 임명 중 */
  hasMajorPost: boolean;
  /** 산학협력중점교원, HK교원 */
  isIndustryOrHk: boolean;
  plannedSabbaticalStart: string | null;
};

export type CheckStatus = "met" | "unmet" | "review";
export type Verdict = "eligible" | "ineligible" | "review";

export type Citation = {
  docId: string;
  article: string;
};

export type Check = {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
  citations: Citation[];
};

export type KeyDate = {
  label: string;
  date: string;
  citations: Citation[];
};

export type Fact = {
  label: string;
  value: string;
  citations: Citation[];
};

export type RuleResult = {
  task: string;
  verdict: Verdict;
  summary: string;
  checks: Check[];
  dates: KeyDate[];
  facts: Fact[];
  notes: string[];
};

export const PERSONNEL = "faculty-personnel";
export const SABBATICAL = "sabbatical";
export const CHARTER = "charter-leave";
export const APPENDIX_1 = "appendix-1";

export const cite = (docId: string, ...articles: string[]): Citation[] =>
  articles.map((article) => ({ docId, article }));

export function verdictOf(checks: Check[]): Verdict {
  if (checks.some((check) => check.status === "unmet")) return "ineligible";
  if (checks.some((check) => check.status === "review")) return "review";
  return "eligible";
}

export const VERDICT_LABEL: Record<Verdict, string> = {
  eligible: "충족",
  ineligible: "미충족",
  review: "확인 필요",
};

export const STATUS_LABEL: Record<CheckStatus, string> = {
  met: "충족",
  unmet: "미충족",
  review: "확인 필요",
};
