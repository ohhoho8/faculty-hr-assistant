import type { Metadata } from "next";
import { BookOpen, CalendarClock, ClipboardCheck, LayoutDashboard, MessageSquareText } from "lucide-react";
import { NavLink } from "@/components/nav-link";
import "./globals.css";

export const metadata: Metadata = {
  title: "교원인사 업무 지원",
  description: "공개된 대학 규정을 근거로 교원인사 요건 판정, 업무 일정, 규정 질의를 지원하는 비공식 데모",
};

const NAV = [
  { href: "/", label: "대시보드", icon: LayoutDashboard },
  { href: "/eligibility", label: "요건 판정", icon: ClipboardCheck },
  { href: "/schedule", label: "업무 일정", icon: CalendarClock },
  { href: "/ask", label: "규정 질의", icon: MessageSquareText },
  { href: "/regulations", label: "규정 열람", icon: BookOpen },
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="min-h-screen md:flex">
        <aside className="border-b border-line bg-surface md:sticky md:top-0 md:flex md:h-screen md:w-56 md:shrink-0 md:flex-col md:border-r md:border-b-0">
          <div className="px-4 pt-4 pb-2 md:pt-6">
            <p className="text-base font-bold">교원인사 업무 지원</p>
            <p className="text-xs text-muted">공개 규정 기반 비공식 데모</p>
          </div>
          <nav aria-label="주요 메뉴" className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col">
            {NAV.map(({ href, label, icon: Icon }) => (
              <NavLink key={href} href={href}>
                <Icon size={16} aria-hidden />
                {label}
              </NavLink>
            ))}
          </nav>
          <p className="mt-auto hidden p-4 text-xs leading-relaxed text-muted md:block">
            한양대학교 공식 서비스가 아닙니다. 교원 정보는 모두 가상이며, 판정은 규정 문구 기준으로 실무 검증을 거치지 않았습니다.
          </p>
        </aside>
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-5xl">{children}</div>
          <p className="mx-auto mt-8 max-w-5xl text-xs text-muted md:hidden">
            한양대학교 공식 서비스가 아닙니다. 교원 정보는 모두 가상이며, 판정은 규정 문구 기준으로 실무 검증을 거치지 않았습니다.
          </p>
        </main>
      </body>
    </html>
  );
}
