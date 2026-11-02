import { Plus, Trash2 } from "lucide-react";
import type { DisciplineType, FacultyRecord, LeavePeriod, Rank, Track } from "@/lib/rules/types";

type Props = {
  value: FacultyRecord;
  onChange: (next: FacultyRecord) => void;
};

function DateField({ label, value, onChange }: { label: string; value: string | null; onChange: (next: string | null) => void }) {
  return (
    <label className="text-sm font-medium">
      {label}
      <input type="date" className="field mt-1" value={value ?? ""} onChange={(event) => onChange(event.target.value || null)} />
    </label>
  );
}

function NumberField({ label, value, step = 1, onChange }: { label: string; value: number | null; step?: number; onChange: (next: number | null) => void }) {
  return (
    <label className="text-sm font-medium">
      {label}
      <input
        type="number"
        min={0}
        step={step}
        className="field mt-1"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value === "" ? null : Math.max(Number(event.target.value), 0))}
      />
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="size-4 accent-[var(--color-accent)]" />
      {label}
    </label>
  );
}

export function FacultyForm({ value, onChange }: Props) {
  const set = <K extends keyof FacultyRecord>(key: K, next: FacultyRecord[K]) => onChange({ ...value, [key]: next });
  const setLeave = (index: number, patch: Partial<LeavePeriod>) =>
    set("leaves", value.leaves.map((leave, i) => (i === index ? { ...leave, ...patch } : leave)));

  return (
    <div className="space-y-5">
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-bold">기본 정보</legend>
        <label className="text-sm font-medium">
          구분
          <select className="field mt-1" value={value.track} onChange={(event) => set("track", event.target.value as Track)}>
            <option value="tenure">정년트랙</option>
            <option value="non-tenure">비정년트랙</option>
          </select>
        </label>
        <label className="text-sm font-medium">
          직급
          <select className="field mt-1" value={value.rank} onChange={(event) => set("rank", event.target.value as Rank)}>
            <option>조교수</option>
            <option>부교수</option>
            <option>교수</option>
          </select>
        </label>
        <DateField label="본교 신규임용일" value={value.hireDate} onChange={(next) => set("hireDate", next ?? "")} />
        <DateField label="현 직급 임용일" value={value.rankStartDate} onChange={(next) => set("rankStartDate", next ?? "")} />
        <DateField label="임용기간 만료일" value={value.contractEndDate} onChange={(next) => set("contractEndDate", next)} />
        <DateField label="생년월일" value={value.birthDate} onChange={(next) => set("birthDate", next)} />
        <NumberField label="직급 근무에 포함할 인정 경력(년)" value={value.recognizedYears} step={0.5} onChange={(next) => set("recognizedYears", next ?? 0)} />
        <NumberField label="전체 교육·연구경력(년, 호봉 조회)" value={value.careerYears} step={0.5} onChange={(next) => set("careerYears", next)} />
        <div className="grid gap-2 sm:col-span-2 sm:grid-cols-2">
          <Toggle label="박사학위 소지" checked={value.hasDoctorate} onChange={(next) => set("hasDoctorate", next)} />
          <Toggle label="공연전시설계실기분야" checked={value.isArtsPractice} onChange={(next) => set("isArtsPractice", next)} />
          <Toggle label="정년보장 교원" checked={value.tenured} onChange={(next) => set("tenured", next)} />
          <Toggle label="주요보직 임명 중" checked={value.hasMajorPost} onChange={(next) => set("hasMajorPost", next)} />
          <Toggle label="산학협력중점교원 또는 HK교원" checked={value.isIndustryOrHk} onChange={(next) => set("isIndustryOrHk", next)} />
          <Toggle label="임상의학 전임교원" checked={value.isClinical} onChange={(next) => set("isClinical", next)} />
        </div>
      </fieldset>

      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-bold">임용 제한</legend>
        <label className="text-sm font-medium">
          징계처분
          <select className="field mt-1" value={value.discipline} onChange={(event) => set("discipline", event.target.value as DisciplineType)}>
            <option value="none">없음</option>
            <option>정직</option>
            <option>감봉</option>
            <option>견책</option>
          </select>
        </label>
        <DateField label="징계처분 집행 종료일" value={value.disciplineEndDate} onChange={(next) => set("disciplineEndDate", next)} />
        <div className="grid gap-2 sm:col-span-2">
          <Toggle label="현재 징계의결요구·직위해제 또는 휴직 중" checked={value.restricted} onChange={(next) => set("restricted", next)} />
          <Toggle label="재임용 거부 유예 중" checked={value.reappointmentDeferred} onChange={(next) => set("reappointmentDeferred", next)} />
        </div>
      </fieldset>

      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-bold">연구년 이력</legend>
        <DateField label="직전 연구년 복귀일" value={value.lastSabbaticalReturn} onChange={(next) => set("lastSabbaticalReturn", next)} />
        <NumberField label="연구결과물 지체 기간(개월)" value={value.reportDelayMonths} onChange={(next) => set("reportDelayMonths", next ?? 0)} />
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-bold">휴직·파견·연수 이력</legend>
        <ul className="space-y-2">
          {value.leaves.map((leave, index) => (
            <li key={index} className="grid grid-cols-[1fr_1fr] gap-2 sm:grid-cols-[6rem_1fr_1fr_auto]">
              <select aria-label="종류" className="field" value={leave.kind} onChange={(event) => setLeave(index, { kind: event.target.value as LeavePeriod["kind"] })}>
                <option>휴직</option>
                <option>파견</option>
                <option>연수</option>
              </select>
              <input aria-label="시작일" type="date" className="field" value={leave.start} onChange={(event) => setLeave(index, { start: event.target.value })} />
              <input aria-label="종료일" type="date" className="field" value={leave.end} onChange={(event) => setLeave(index, { end: event.target.value })} />
              <button type="button" aria-label="이력 삭제" onClick={() => set("leaves", value.leaves.filter((_, i) => i !== index))} className="justify-self-start rounded-md border border-line p-2 text-muted hover:text-unmet">
                <Trash2 size={16} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => set("leaves", [...value.leaves, { kind: "휴직", start: value.rankStartDate, end: value.rankStartDate }])}
          className="mt-2 inline-flex items-center gap-1 text-sm text-accent"
        >
          <Plus size={14} aria-hidden />
          이력 추가
        </button>
      </fieldset>
    </div>
  );
}
