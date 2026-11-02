import { PageHeader } from "@/components/page-header";
import { DEMO_DATE } from "@/lib/faculty/roster";
import { ScheduleView } from "./schedule-view";

export default function SchedulePage() {
  return (
    <>
      <PageHeader title="업무 일정" description="규정과 교원 정보로 계산한 마감입니다. 공고로 정해지는 일정은 가상으로 표시합니다." />
      <ScheduleView today={DEMO_DATE} />
    </>
  );
}
