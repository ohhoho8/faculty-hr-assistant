import { PageHeader } from "@/components/page-header";
import { todayInKorea } from "@/lib/rules/dates";
import { EligibilityView } from "./eligibility-view";
import { TASKS, type Task } from "./tasks";

export const revalidate = 3600;

type SearchParams = Promise<{ faculty?: string; task?: string }>;

export default async function EligibilityPage({ searchParams }: { searchParams: SearchParams }) {
  const { faculty, task } = await searchParams;
  const initialTask = TASKS.some((item) => item.id === task) ? (task as Task) : "promotion";
  return (
    <>
      <PageHeader title="요건 판정" description="규정으로 계산할 수 있는 항목을 판정합니다. 입력값은 저장되거나 서버로 전송되지 않습니다." />
      <EligibilityView today={todayInKorea()} initialFacultyId={faculty ?? "f01"} initialTask={initialTask} />
    </>
  );
}
