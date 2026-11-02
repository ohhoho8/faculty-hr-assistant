import { NextResponse } from "next/server";
import { z } from "zod";
import { askRegulation } from "@/lib/ai/ask";
import { generateWithGemini } from "@/lib/ai/gemini";
import { checkRateLimit } from "@/lib/rate-limit";

// Gemini 응답이 20초 넘게 걸릴 수 있어 서버 함수 실행 시간을 넉넉히 둔다.
export const maxDuration = 60;

const requestSchema = z.object({ question: z.string().trim().min(2).max(500) });

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "질문은 2자 이상 500자 이하로 입력해 주세요." }, { status: 400 });
  }

  const hasKey = Boolean(process.env.GEMINI_API_KEY);
  if (hasKey) {
    const client = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    const limit = checkRateLimit(client, Number(process.env.ASK_DAILY_LIMIT) || 200);
    if (limit !== "ok") {
      const message = limit === "client" ? "질문이 너무 많습니다. 1시간 뒤에 다시 시도해 주세요." : "오늘의 데모 사용량을 모두 사용했습니다.";
      return NextResponse.json({ error: message }, { status: 429 });
    }
  }

  return NextResponse.json(await askRegulation(parsed.data.question, hasKey ? generateWithGemini : null));
}
