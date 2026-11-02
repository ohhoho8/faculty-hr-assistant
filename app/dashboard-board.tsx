"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useState } from "react";
import { CitationLinks } from "@/components/citation-links";
import { DueCell, UrgencyTag } from "@/components/deadline";
import { FacultyCell } from "@/components/faculty-avatar";
import { VerdictBadge } from "@/components/status-badge";
import { daysBetween } from "@/lib/rules/dates";
import type { Verdict } from "@/lib/rules/types";
import type { EventCategory, ScheduleEvent } from "@/lib/schedule/schedule";

export type FacultyRow = {
  id: string;
  name: string;
  department: string;
  rank: string;
  status: string;
  contractEndDate: string | null;
  promotion: Verdict | null;
};

const CATEGORIES: EventCategory[] = ["재임용", "승진", "정년보장", "연구년", "임용 제한", "학교 공통"];

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? "border-ink bg-ink text-white" : "border-dashed border-line text-muted hover:border-faint hover:text-ink"
      }`}
    >
      {active ? "" : "+ "}
      {children}
    </button>
  );
}

function Th({ hideNarrow, children }: { hideNarrow?: boolean; children: React.ReactNode }) {
  return <th scope="col" className={`eyebrow px-4 py-3 text-left font-semibold ${hideNarrow ? "hidden xl:table-cell" : ""}`}>{children}</th>;
}

export function DashboardBoard({ today, events, faculty }: { today: string; events: ScheduleEvent[]; faculty: FacultyRow[] }) {
  const [tab, setTab] = useState<"tasks" | "faculty">("tasks");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<EventCategory | null>(null);
  const [overdueOnly, setOverdueOnly] = useState(false);

  const term = query.trim();
  const visibleEvents = events.filter((event) => {
    if (category && event.category !== category) return false;
    if (overdueOnly && event.date >= today) return false;
    if (!term) return true;
    return [event.title, event.category, event.faculty?.name, event.faculty?.department].some((value) => value?.includes(term));
  });
  const visibleFaculty = faculty.filter((item) => !term || [item.name, item.department, item.rank, item.status].some((value) => value.includes(term)));

  const tabs = [
    { id: "tasks", label: "마감 업무", count: events.length },
    { id: "faculty", label: "교원 현황", count: faculty.length },
  ] as const;

  return (
    <>
      <div role="tablist" aria-label="보기" className="mb-4 flex gap-6 border-b border-line/80">
        {tabs.map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={`-mb-px border-b-2 pb-2.5 text-sm font-semibold ${tab === item.id ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"}`}
          >
            {item.label}
            <span className="ml-1.5 text-xs font-medium text-muted">{item.count}</span>
          </button>
        ))}
      </div>

      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 p-3.5">
          <label className="relative w-full sm:w-64">
            <span className="sr-only">검색</span>
            <Search size={15} aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={tab === "tasks" ? "업무나 교원으로 검색" : "교원이나 학과로 검색"}
              className="field rounded-full pl-9"
            />
          </label>
          {tab === "tasks" && (
            <div className="flex max-w-full gap-1.5 overflow-x-auto">
              {CATEGORIES.map((item) => (
                <Chip key={item} active={category === item} onClick={() => setCategory(category === item ? null : item)}>{item}</Chip>
              ))}
              <Chip active={overdueOnly} onClick={() => setOverdueOnly(!overdueOnly)}>기한 지남만</Chip>
            </div>
          )}
          {tab === "tasks" && <span className="ml-auto hidden text-xs text-muted xl:block">기한순</span>}
        </div>

        <div className="overflow-x-auto">
          {tab === "tasks" ? (
            <table className="w-full min-w-[520px] text-sm">
              <thead className="border-y border-line">
                <tr><Th>긴급도</Th><Th>업무</Th><Th>대상</Th><Th hideNarrow>근거</Th><Th>기한</Th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visibleEvents.slice(0, 40).map((event) => {
                  const days = daysBetween(today, event.date);
                  return (
                    <tr key={event.id} className="transition-colors hover:bg-tint">
                      <td className="px-4 py-3"><UrgencyTag days={days} /></td>
                      <td className="px-4 py-3">
                        <span className="block font-medium">{event.title}</span>
                        <span className="block text-xs text-muted">{event.category}{event.basis === "가상" && " · 가상 일정"}</span>
                      </td>
                      <td className="px-4 py-3">
                        {event.faculty ? (
                          <Link href={`/eligibility?faculty=${event.faculty.id}`} className="hover:underline">
                            <FacultyCell name={event.faculty.name} department={event.faculty.department} />
                          </Link>
                        ) : (
                          <span className="text-muted">학교 공통</span>
                        )}
                      </td>
                      <td className="hidden px-4 py-3 xl:table-cell">{event.citations.length > 0 ? <CitationLinks citations={event.citations} /> : <span className="text-faint">-</span>}</td>
                      <td className="px-4 py-3"><DueCell days={days} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <table className="w-full min-w-[680px] text-sm">
              <thead className="border-y border-line">
                <tr><Th>교원</Th><Th>직급</Th><Th>구분</Th><Th>임용기간 만료까지</Th><Th>승진 판정</Th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visibleFaculty.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-tint">
                    <td className="px-4 py-3">
                      <Link href={`/eligibility?faculty=${item.id}`} className="hover:underline"><FacultyCell name={item.name} department={item.department} /></Link>
                    </td>
                    <td className="px-4 py-3">{item.rank}</td>
                    <td className="px-4 py-3 text-muted">{item.status}</td>
                    <td className="px-4 py-3">{item.contractEndDate ? <DueCell days={daysBetween(today, item.contractEndDate)} /> : <span className="text-faint">-</span>}</td>
                    <td className="px-4 py-3">{item.promotion ? <VerdictBadge verdict={item.promotion} /> : <span className="text-faint">-</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {((tab === "tasks" && visibleEvents.length === 0) || (tab === "faculty" && visibleFaculty.length === 0)) && (
          <p className="p-8 text-center text-sm text-muted">조건에 맞는 항목이 없습니다.</p>
        )}
        {tab === "tasks" && visibleEvents.length > 40 && (
          <p className="border-t border-line p-3 text-center text-sm">
            <Link href="/schedule" className="text-accent hover:underline">전체 일정 보기</Link>
          </p>
        )}
      </section>
    </>
  );
}
