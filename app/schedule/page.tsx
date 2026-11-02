import { PageHeader } from "@/components/page-header";
import { todayInKorea } from "@/lib/rules/dates";
import { ScheduleView } from "./schedule-view";

export const revalidate = 3600;

export default function SchedulePage() {
  return (
    <>
      <PageHeader title="업무 일정" description="규정과 교원 정보로 계산한 마감일입니다. 공고로 정해지는 날짜는 가상으로 표시합니다." />
      <ScheduleView today={todayInKorea()} />
    </>
  );
}
