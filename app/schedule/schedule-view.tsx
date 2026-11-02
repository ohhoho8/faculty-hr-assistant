"use client";

import { useMemo, useState } from "react";
import { CitationLinks } from "@/components/citation-links";
import { ROSTER } from "@/lib/faculty/roster";
import { formatDate, isDate } from "@/lib/rules/dates";
import { buildSchedule, type EventCategory } from "@/lib/schedule/schedule";

const WINDOWS = [
  { days: 30, label: "30일" },
  { days: 90, label: "90일" },
  { days: 180, label: "6개월" },
  { days: 365, label: "1년" },
  { days: 1095, label: "3년" },
];

const CATEGORIES: EventCategory[] = ["재임용", "승진", "정년보장", "연구년", "임용 제한", "정년퇴직", "학교 공통"];

export function ScheduleView({ today }: { today: string }) {
  const [asOf, setAsOf] = useState(today);
  const [windowDays, setWindowDays] = useState(180);
  const [category, setCategory] = useState<EventCategory | "전체">("전체");

  const valid = isDate(asOf);
  const events = useMemo(
    () => (valid ? buildSchedule(ROSTER, asOf, windowDays).filter((event) => category === "전체" || event.category === category) : []),
    [asOf, category, valid, windowDays],
  );

  const groups = useMemo(() => {
    const map = new Map<string, typeof events>();
    for (const event of events) {
      const month = `${event.date.slice(0, 4)}년 ${Number(event.date.slice(5, 7))}월`;
      map.set(month, [...(map.get(month) ?? []), event]);
    }
    return [...map.entries()];
  }, [events]);

  return (
    <>
      <div className="panel mb-5 grid gap-3 p-4 sm:grid-cols-3">
        <label className="text-sm font-medium">
          기준일
          <input type="date" className="field mt-1" value={asOf} onChange={(event) => setAsOf(event.target.value)} />
        </label>
        <label className="text-sm font-medium">
          기간
          <select className="field mt-1" value={windowDays} onChange={(event) => setWindowDays(Number(event.target.value))}>
            {WINDOWS.map((item) => <option key={item.days} value={item.days}>{item.label}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium">
          업무
          <select className="field mt-1" value={category} onChange={(event) => setCategory(event.target.value as EventCategory | "전체")}>
            <option>전체</option>
            {CATEGORIES.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
      </div>

      {!valid && <p role="alert" className="text-sm text-unmet">기준일을 입력해 주세요.</p>}
      {valid && events.length === 0 && <p className="panel p-6 text-sm text-muted">이 조건에 해당하는 일정이 없습니다.</p>}

      <div className="space-y-6">
        {groups.map(([month, items]) => (
          <section key={month}>
            <h2 className="mb-2 font-bold">{month} <span className="text-sm font-normal text-muted">{items.length}건</span></h2>
            <ul className="panel divide-y divide-line">
              {items.map((event) => (
                <li key={event.id} className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[6rem_1fr_auto] sm:items-center sm:gap-4">
                  <span className="font-semibold tabular-nums">{formatDate(event.date)}</span>
                  <span>
                    <span className="mr-1.5 text-xs text-accent">{event.category}</span>
                    {event.title}
                    {event.faculty && <span className="text-muted"> · {event.faculty.name} ({event.faculty.department})</span>}
                  </span>
                  {event.basis === "가상" ? (
                    <span className="w-fit rounded bg-canvas px-1.5 py-0.5 text-xs text-muted">가상 일정</span>
                  ) : (
                    <CitationLinks citations={event.citations} />
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
