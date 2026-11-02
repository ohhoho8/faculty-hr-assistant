import type { Metadata } from "next";
import { BookOpen, CalendarClock, ClipboardCheck, GraduationCap, LayoutDashboard, MessageSquareText, type LucideIcon } from "lucide-react";
import { HeaderSearch } from "@/components/header-search";
import { NavLink } from "@/components/nav-link";
import { DEMO_DATE, ROSTER } from "@/lib/faculty/roster";
import { buildSchedule } from "@/lib/schedule/schedule";
import "./globals.css";

export const metadata: Metadata = {
  title: "교원인사 업무 지원",
  description: "공개된 대학 규정을 근거로 교원인사 요건 판정, 업무 일정, 규정 질의를 지원하는 비공식 데모",
};

const NOTICE = "한양대학교 공식 서비스가 아닙니다. 교원 정보는 모두 가상이며, 판정은 규정 문구 기준으로 실무 검증을 거치지 않았습니다.";

type Item = { href: string; label: string; icon: LucideIcon };

const WORK: Item[] = [
  { href: "/eligibility", label: "요건 판정", icon: ClipboardCheck },
  { href: "/schedule", label: "업무 일정", icon: CalendarClock },
];

const REFERENCE: Item[] = [
  { href: "/ask", label: "규정 질의", icon: MessageSquareText },
  { href: "/regulations", label: "규정 열람", icon: BookOpen },
];

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex h-10 items-center rounded-full bg-surface px-4 text-sm font-medium shadow-[0_1px_2px_rgb(23_25_31/0.04)]">{children}</span>;
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const urgent = buildSchedule(ROSTER, DEMO_DATE, 30).filter((event) => event.faculty).length;
  const link = ({ href, label, icon: Icon }: Item) => (
    <NavLink key={href} href={href} badge={href === "/schedule" ? urgent : undefined}>
      <Icon size={17} aria-hidden />
      {label}
    </NavLink>
  );

  return (
    <html lang="ko">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
      </head>
      <body className="min-h-screen md:flex md:gap-2 md:p-3">
        <aside className="bg-surface md:panel md:sticky md:top-3 md:flex md:h-[calc(100vh-1.5rem)] md:w-60 md:shrink-0 md:flex-col md:p-3">
          <div className="flex items-center gap-2.5 px-4 pt-4 pb-2 md:px-2 md:pt-2 md:pb-4">
            <span aria-hidden className="flex size-8 items-center justify-center rounded-xl bg-accent text-white">
              <GraduationCap size={18} />
            </span>
            <span className="text-base font-semibold tracking-tight">교원인사 지원</span>
          </div>
          <div className="mx-2 mb-4 hidden rounded-xl bg-tint px-3 py-2.5 md:block">
            <p className="text-sm font-semibold">데모 환경</p>
            <p className="text-xs text-muted">공개 규정 기반 · 비공식</p>
          </div>
          <nav aria-label="주요 메뉴" className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:overflow-visible md:p-0">
            <NavLink href="/">
              <LayoutDashboard size={17} aria-hidden />
              대시보드
            </NavLink>
            <p className="eyebrow mt-4 mb-1 hidden px-3 md:block">업무</p>
            {WORK.map(link)}
            <p className="eyebrow mt-4 mb-1 hidden px-3 md:block">규정</p>
            {REFERENCE.map(link)}
          </nav>
          <p className="mt-auto hidden p-2 text-[11px] leading-relaxed text-faint md:block">{NOTICE}</p>
        </aside>
        <main className="min-w-0 flex-1 px-4 py-5 md:px-6 md:py-3">
          <div className="mx-auto max-w-6xl">
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <Pill>가상 교원 {ROSTER.length}명</Pill>
              <div className="w-full sm:ml-auto sm:w-auto"><HeaderSearch /></div>
            </div>
            {children}
          </div>
          <p className="mx-auto mt-8 max-w-6xl text-xs text-muted md:hidden">{NOTICE}</p>
        </main>
      </body>
    </html>
  );
}
