import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { DEMO_DATE, ROSTER } from "@/lib/faculty/roster";
import { daysBetween } from "@/lib/rules/dates";
import { evaluatePromotion } from "@/lib/rules/promotion";
import { evaluateTenure } from "@/lib/rules/tenure";
import { buildBoard } from "@/lib/schedule/schedule";
import { DashboardBoard, type FacultyRow } from "./dashboard-board";

const LOOK_AHEAD_DAYS = 180;

export default function DashboardPage() {
  const today = DEMO_DATE;
  const events = buildBoard(ROSTER, today, LOOK_AHEAD_DAYS);

  const overdue = events.filter((event) => event.date < today);
  const soon = events.filter((event) => event.faculty && event.date >= today && daysBetween(today, event.date) <= 30);
  const expiring = ROSTER.filter((faculty) => {
    if (faculty.tenured || !faculty.contractEndDate) return false;
    const days = daysBetween(today, faculty.contractEndDate);
    return days >= 0 && days <= 180;
  });
  const promotion = ROSTER.filter((faculty) => evaluatePromotion(faculty, today).checks.find((check) => check.id === "years")?.status === "met");
  const tenure = ROSTER.filter((faculty) => evaluateTenure(faculty, today).checks.find((check) => check.id === "eligible")?.status === "met");

  const names = (list: { name: string }[]) => {
    const short = list.map((item) => item.name.replace("가상교원 ", ""));
    return short.length > 0 ? `가상교원 ${short.slice(0, 4).join(" · ")}${short.length > 4 ? " 외" : ""}` : "해당 없음";
  };
  const stats = [
    { label: "기한 지남", value: overdue.length, note: "처리 여부 확인 필요", href: "/schedule", alert: overdue.length > 0 },
    { label: "30일 내 마감", value: soon.length, note: `${new Set(soon.map((event) => event.faculty?.id)).size}명 대상`, href: "/schedule" },
    { label: "6개월 내 임용 만료", value: expiring.length, note: names(expiring), href: "/eligibility?task=reappointment" },
    { label: "승진자격년수 충족", value: promotion.length, note: names(promotion), href: "/eligibility?task=promotion" },
    { label: "정년보장 신청 자격", value: tenure.length, note: names(tenure), href: "/eligibility?task=tenure" },
  ];

  const faculty: FacultyRow[] = ROSTER.map((item) => ({
    id: item.id,
    name: item.name,
    department: item.department,
    rank: item.rank,
    status: item.tenured ? "정년보장" : item.track === "tenure" ? "정년트랙" : "비정년트랙",
    contractEndDate: item.contractEndDate,
    promotion: item.track === "tenure" && item.rank !== "교수" ? evaluatePromotion(item, today).verdict : null,
  }));

  return (
    <>
      <PageHeader title="대시보드" description="교원별 마감과 임용 현황을 규정 기준으로 모았습니다." />

      <section aria-label="요약" className="panel mb-4 grid grid-cols-2 p-2 lg:grid-cols-5">
        {stats.map((stat, index) => (
          <Link
            key={stat.label}
            href={stat.href}
            className={`rounded-xl p-3.5 transition-colors hover:bg-tint ${index > 0 ? "lg:border-l lg:border-line lg:rounded-l-none" : ""}`}
          >
            <p className="eyebrow">{stat.label}</p>
            <p className={`mt-2 text-3xl font-normal tracking-tight ${stat.alert ? "text-unmet" : ""}`}>{stat.value}</p>
            <p className="mt-1 text-xs text-muted">{stat.note}</p>
          </Link>
        ))}
      </section>

      <DashboardBoard today={today} events={events} faculty={faculty} />
    </>
  );
}
