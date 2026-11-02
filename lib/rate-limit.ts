// 공개 데모의 API 비용을 막는 장치. 서버 인스턴스별 메모리에 저장하므로 인스턴스가 늘면 한도도 그만큼 늘어난다.
const PER_CLIENT_LIMIT = 10;
const WINDOW_MS = 60 * 60 * 1000;

const clients = new Map<string, { count: number; resetAt: number }>();
let daily = { day: "", count: 0 };

export type RateLimitResult = "ok" | "client" | "daily";

export function checkRateLimit(client: string, dailyLimit: number, now = Date.now()): RateLimitResult {
  const day = new Date(now).toISOString().slice(0, 10);
  if (daily.day !== day) daily = { day, count: 0 };
  if (daily.count >= dailyLimit) return "daily";

  const entry = clients.get(client);
  if (entry && entry.resetAt > now && entry.count >= PER_CLIENT_LIMIT) return "client";
  if (!entry || entry.resetAt <= now) {
    if (clients.size > 5000) clients.clear();
    clients.set(client, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    entry.count += 1;
  }
  daily.count += 1;
  return "ok";
}

export function resetRateLimit(): void {
  clients.clear();
  daily = { day: "", count: 0 };
}
