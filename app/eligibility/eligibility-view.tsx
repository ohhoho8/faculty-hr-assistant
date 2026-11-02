"use client";

import { useState } from "react";
import { NEW_FACULTY, ROSTER } from "@/lib/faculty/roster";
import { isDate } from "@/lib/rules/dates";
import { LEAVE_REASONS, evaluateLeave, type LeaveVariant } from "@/lib/rules/leave";
import { evaluatePromotion } from "@/lib/rules/promotion";
import { evaluateReappointment } from "@/lib/rules/reappointment";
import { evaluateSabbatical, type SabbaticalMonths } from "@/lib/rules/sabbatical";
import { evaluateTenure } from "@/lib/rules/tenure";
import type { FacultyRecord, RuleResult } from "@/lib/rules/types";
import { FacultyForm } from "./faculty-form";
import { ResultCard } from "./result-card";
import { TASKS, type Task } from "./tasks";

const clone = (faculty: FacultyRecord): FacultyRecord => ({ ...faculty, leaves: faculty.leaves.map((leave) => ({ ...leave })) });

function pick(id: string): FacultyRecord {
  return clone(ROSTER.find((faculty) => faculty.id === id) ?? (id === "custom" ? NEW_FACULTY : ROSTER[0]));
}

function dateProblem(faculty: FacultyRecord, task: Task, sabbaticalStart: string, leaveStart: string): string | null {
  if (!isDate(faculty.hireDate) || !isDate(faculty.rankStartDate)) return "신규임용일과 현 직급 임용일을 입력해 주세요.";
  if (faculty.rankStartDate < faculty.hireDate) return "현 직급 임용일은 신규임용일보다 앞설 수 없습니다.";
  if (faculty.leaves.some((leave) => !isDate(leave.start) || !isDate(leave.end) || leave.end < leave.start)) return "휴직·파견·연수 이력의 기간을 확인해 주세요.";
  if (task === "sabbatical" && !isDate(sabbaticalStart)) return "연구년 개시 예정일을 입력해 주세요.";
  if (task === "leave" && !isDate(leaveStart)) return "휴직 시작일을 입력해 주세요.";
  return null;
}

export function EligibilityView({ today, initialFacultyId, initialTask }: { today: string; initialFacultyId: string; initialTask: Task }) {
  const [facultyId, setFacultyId] = useState(initialFacultyId);
  const [faculty, setFaculty] = useState(() => pick(initialFacultyId));
  const [task, setTask] = useState<Task>(initialTask);
  const asOf = today;

  const [sabbaticalStart, setSabbaticalStart] = useState(`${Number(today.slice(0, 4)) + 2}-03-01`);
  const [sabbaticalMonths, setSabbaticalMonths] = useState<SabbaticalMonths>(12);
  const [staffing, setStaffing] = useState({ faculty: "", onSabbatical: "0", otherAbsent: "0" });

  const [reasonNo, setReasonNo] = useState(7);
  const [variant, setVariant] = useState<LeaveVariant | "">("");
  const [leaveStart, setLeaveStart] = useState(`${Number(today.slice(0, 4)) + 1}-03-01`);
  const [requestedMonths, setRequestedMonths] = useState("12");
  const [usedMonths, setUsedMonths] = useState("0");
  const [serviceYears, setServiceYears] = useState("");

  const reason = LEAVE_REASONS.find((item) => item.no === reasonNo)!;
  const activeVariant = reason.variants?.some((item) => item.value === variant) ? (variant as LeaveVariant) : reason.variants?.[0].value;

  const problem = dateProblem(faculty, task, sabbaticalStart, leaveStart);
  const evaluate = (): RuleResult | null => {
    if (problem) return null;
    if (task === "promotion") return evaluatePromotion(faculty, asOf);
    if (task === "reappointment") return evaluateReappointment(faculty, asOf);
    if (task === "tenure") return evaluateTenure(faculty, asOf);
    if (task === "sabbatical") {
      const total = Number(staffing.faculty);
      return evaluateSabbatical(
        faculty,
        {
          startDate: sabbaticalStart,
          months: sabbaticalMonths,
          staffing: total > 0 ? { faculty: total, onSabbatical: Number(staffing.onSabbatical) || 0, otherAbsent: Number(staffing.otherAbsent) || 0 } : null,
        },
        asOf,
      );
    }
    return evaluateLeave({
      reasonNo,
      variant: activeVariant,
      startDate: leaveStart,
      requestedMonths: requestedMonths === "" ? null : Number(requestedMonths),
      usedMonths: Number(usedMonths) || 0,
      contractEndDate: faculty.contractEndDate,
      serviceYears: serviceYears === "" ? null : Number(serviceYears),
    });
  };
  const result = evaluate();

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="space-y-4">
        <div className="panel p-4">
          <label className="block text-sm font-medium">
            교원
            <select
              className="field mt-1"
              value={facultyId}
              onChange={(event) => {
                setFacultyId(event.target.value);
                setFaculty(pick(event.target.value));
              }}
            >
              {ROSTER.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.rank})</option>)}
              <option value="custom">직접 입력</option>
            </select>
          </label>
        </div>

        <div role="tablist" aria-label="업무" className="flex gap-5 overflow-x-auto border-b border-line/80 px-1">
          {TASKS.map((item) => (
            <button
              key={item.id}
              role="tab"
              aria-selected={task === item.id}
              onClick={() => setTask(item.id)}
              className={`-mb-px shrink-0 border-b-2 pb-2.5 text-sm font-semibold whitespace-nowrap ${task === item.id ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"}`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {task === "sabbatical" && (
          <div className="panel grid gap-3 p-4 sm:grid-cols-2">
            <label className="text-sm font-medium">
              연구년 개시 예정일
              <input type="date" className="field mt-1" value={sabbaticalStart} onChange={(event) => setSabbaticalStart(event.target.value)} />
            </label>
            <label className="text-sm font-medium">
              연구년 기간
              <select className="field mt-1" value={sabbaticalMonths} onChange={(event) => setSabbaticalMonths(Number(event.target.value) as SabbaticalMonths)}>
                <option value={6}>6개월</option>
                <option value={12}>1년</option>
                <option value={18}>1년 6개월</option>
              </select>
            </label>
            <fieldset className="grid grid-cols-3 gap-2 sm:col-span-2">
              <legend className="mb-1 text-sm font-medium">학과 인원 (선택)</legend>
              {([["faculty", "전임교원"], ["onSabbatical", "연구년 중"], ["otherAbsent", "휴직·연수"]] as const).map(([key, label]) => (
                <label key={key} className="text-xs text-muted">
                  {label}
                  <input type="number" min={0} className="field mt-1" value={staffing[key]} onChange={(event) => setStaffing({ ...staffing, [key]: event.target.value })} />
                </label>
              ))}
            </fieldset>
          </div>
        )}

        {task === "leave" && (
          <div className="panel grid gap-3 p-4 sm:grid-cols-2">
            <label className="text-sm font-medium sm:col-span-2">
              휴직 사유 (정관 제44조)
              <select className="field mt-1" value={reasonNo} onChange={(event) => setReasonNo(Number(event.target.value))}>
                {LEAVE_REASONS.map((item) => <option key={item.no} value={item.no}>제{item.no}호 {item.label}</option>)}
              </select>
            </label>
            {reason.variants && (
              <label className="text-sm font-medium sm:col-span-2">
                세부 구분
                <select className="field mt-1" value={activeVariant} onChange={(event) => setVariant(event.target.value as LeaveVariant)}>
                  {reason.variants.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
            )}
            <label className="text-sm font-medium">
              휴직 시작일
              <input type="date" className="field mt-1" value={leaveStart} onChange={(event) => setLeaveStart(event.target.value)} />
            </label>
            <label className="text-sm font-medium">
              신청 기간(개월)
              <input type="number" min={1} className="field mt-1" value={requestedMonths} onChange={(event) => setRequestedMonths(event.target.value)} />
            </label>
            <label className="text-sm font-medium">
              같은 사유로 사용한 기간(개월)
              <input type="number" min={0} className="field mt-1" value={usedMonths} onChange={(event) => setUsedMonths(event.target.value)} />
            </label>
            {reasonNo === 13 && (
              <label className="text-sm font-medium">
                사학연금 재직기간(년)
                <input type="number" min={0} className="field mt-1" value={serviceYears} onChange={(event) => setServiceYears(event.target.value)} />
              </label>
            )}
          </div>
        )}

        <details className="panel p-4" open={facultyId === "custom"}>
          <summary className="cursor-pointer text-sm font-semibold">교원 정보 {facultyId === "custom" ? "입력" : "확인·수정"}</summary>
          <div className="mt-4">
            <FacultyForm value={faculty} onChange={setFaculty} />
          </div>
        </details>
      </div>

      <div className="lg:sticky lg:top-6">
        {problem ? <p role="alert" className="panel p-4 text-sm text-unmet">{problem}</p> : result && <ResultCard result={result} />}
      </div>
    </div>
  );
}
