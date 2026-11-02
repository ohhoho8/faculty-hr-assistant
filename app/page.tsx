import Link from "next/link";
import { VerdictBadge } from "@/components/status-badge";
import { CitationLinks } from "@/components/citation-links";
import { PageHeader } from "@/components/page-header";
import { ROSTER } from "@/lib/faculty/roster";
import { daysBetween, formatDate, todayInKorea } from "@/lib/rules/dates";
import { evaluatePromotion } from "@/lib/rules/promotion";
import { evaluateTenure } from "@/lib/rules/tenure";
import type { FacultyRecord } from "@/lib/rules/types";
import { buildSchedule } from "@/lib/schedule/schedule";

export const revalidate = 3600;

function trackLabel(faculty: FacultyRecord) {
  if (faculty.tenured) return "정년보장";
  return faculty.track === "tenure" ? "정년트랙" : "비정년트랙";
}

export default function DashboardPage() {
  const today = todayInKorea();
  const soon = buildSchedule(ROSTER, today, 30).filter((event) => event.faculty);
  const upcoming = buildSchedule(ROSTER, today, 90);
  const promotion = ROSTER.filter((faculty) => evaluatePromotion(faculty, today).checks.find((check) => check.id === "years")?.status === "met");
  const tenure = ROSTER.filter((faculty) => evaluateTenure(faculty, today).checks.find((check) => check.id === "eligible")?.status === "met");
  const reappointment = ROSTER.filter((faculty) => {
    if (faculty.tenured || !faculty.contractEndDate) return false;
    const days = daysBetween(today, faculty.contractEndDate);
    return days >= 0 && days <= 180;
  });

  const stats = [
    { label: "30일 내 교원별 마감", value: soon.length, href: "/schedule" },
    { label: "6개월 내 임용기간 만료", value: reappointment.length, href: "/schedule" },
    { label: "승진자격년수 충족", value: promotion.length, href: "/eligibility?task=promotion" },
    { label: "정년보장 신청 자격", value: tenure.length, href: "/eligibility?task=tenure" },
  ];

  return (
    <>
      <PageHeader title="대시보드" description={`${formatDate(today)} 기준, 가상 교원 ${ROSTER.length}명`} />

      <section aria-label="요약" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="panel p-4 hover:border-accent">
            <p className="text-xs text-muted">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold">
              {stat.value}
              <span className="ml-0.5 text-sm font-normal text-muted">{stat.label.includes("마감") ? "건" : "명"}</span>
            </p>
          </Link>
        ))}
      </section>

      <section className="mt-8">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="font-bold">90일 내 일정</h2>
          <Link href="/schedule" className="text-sm text-accent underline underline-offset-2">전체 일정</Link>
        </div>
        <ul className="panel divide-y divide-line">
          {upcoming.slice(0, 8).map((event) => (
            <li key={event.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 text-sm">
              <span className="w-24 shrink-0 font-semibold tabular-nums">{formatDate(event.date)}</span>
              <span className="min-w-0 flex-1">
                {event.title}
                {event.faculty && <span className="text-muted"> · {event.faculty.name}</span>}
                {event.basis === "가상" && <span className="ml-1.5 rounded bg-canvas px-1.5 py-0.5 text-xs text-muted">가상</span>}
              </span>
              <CitationLinks citations={event.citations} />
            </li>
          ))}
          {upcoming.length === 0 && <li className="px-4 py-6 text-sm text-muted">90일 안에 예정된 일정이 없습니다.</li>}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="mb-2 font-bold">교원 현황</h2>
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-line text-xs text-muted">
              <tr>
                {["교원", "학과", "직급", "구분", "임용기간 만료", "승진"].map((label) => (
                  <th key={label} scope="col" className="px-4 py-2 font-medium">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {ROSTER.map((faculty) => (
                <tr key={faculty.id}>
                  <td className="px-4 py-2.5">
                    <Link href={`/eligibility?faculty=${faculty.id}`} className="font-medium text-accent underline underline-offset-2">{faculty.name}</Link>
                  </td>
                  <td className="px-4 py-2.5">{faculty.department}</td>
                  <td className="px-4 py-2.5">{faculty.rank}</td>
                  <td className="px-4 py-2.5">{trackLabel(faculty)}</td>
                  <td className="px-4 py-2.5 tabular-nums">{faculty.contractEndDate ? formatDate(faculty.contractEndDate) : "-"}</td>
                  <td className="px-4 py-2.5">
                    {faculty.track === "tenure" && faculty.rank !== "교수" ? <VerdictBadge verdict={evaluatePromotion(faculty, today).verdict} /> : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
