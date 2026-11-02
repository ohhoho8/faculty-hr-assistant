"use client";

import { useState } from "react";
import { CitationLinks } from "@/components/citation-links";
import { DueCell, URGENCY_ORDER, UrgencyTag, urgencyOf } from "@/components/deadline";
import { ROSTER } from "@/lib/faculty/roster";
import { daysBetween } from "@/lib/rules/dates";
import { buildBoard, type EventCategory } from "@/lib/schedule/schedule";

const WINDOWS = [
  { days: 30, label: "30일" },
  { days: 90, label: "90일" },
  { days: 180, label: "6개월" },
  { days: 365, label: "1년" },
  { days: 1095, label: "3년" },
];

const CATEGORIES: EventCategory[] = ["재임용", "승진", "정년보장", "연구년", "임용 제한", "정년퇴직", "학교 공통"];

export function ScheduleView({ today }: { today: string }) {
  const [windowDays, setWindowDays] = useState(180);
  const [category, setCategory] = useState<EventCategory | "전체">("전체");

  const events = buildBoard(ROSTER, today, windowDays).filter((event) => category === "전체" || event.category === category);
  const daysOf = (date: string) => daysBetween(today, date);
  const groups = URGENCY_ORDER.map((label) => ({
    label,
    items: events.filter((event) => urgencyOf(daysOf(event.date)).label === label),
  })).filter((group) => group.items.length > 0);

  return (
    <>
      <div className="panel mb-6 grid gap-3 p-4 sm:grid-cols-2">
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

      {events.length === 0 && <p className="panel p-6 text-sm text-muted">이 조건에 해당하는 일정이 없습니다.</p>}

      <div className="space-y-6">
        {groups.map(({ label, items }) => (
          <section key={label}>
            <h2 className="mb-2 px-1 font-semibold">{label} <span className="text-sm font-normal text-muted">{items.length}건</span></h2>
            <ul className="panel divide-y divide-line overflow-hidden">
              {items.map((event) => (
                <li key={event.id} className="grid gap-2 px-4 py-3 text-sm transition-colors hover:bg-tint sm:grid-cols-[5.5rem_1fr_auto_5rem] sm:items-center sm:gap-4">
                  <span><UrgencyTag days={daysOf(event.date)} /></span>
                  <span>
                    <span className="block font-medium">{event.title}</span>
                    <span className="block text-xs text-muted">
                      {event.category}
                      {event.faculty && ` · ${event.faculty.name} · ${event.faculty.department}`}
                    </span>
                  </span>
                  {event.basis === "가상" ? (
                    <span className="w-fit rounded-full border border-line px-2.5 py-1 text-xs text-muted">가상 일정</span>
                  ) : (
                    <CitationLinks citations={event.citations} />
                  )}
                  <DueCell days={daysOf(event.date)} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
