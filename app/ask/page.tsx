import { PageHeader } from "@/components/page-header";
import { AskView } from "./ask-view";

export default function AskPage() {
  return (
    <>
      <PageHeader title="규정 질의" description="규정 조문을 근거로 답합니다. 근거를 찾지 못하면 답하지 않습니다." />
      <AskView />
    </>
  );
}
