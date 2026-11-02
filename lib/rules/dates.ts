// 날짜는 시간대 영향을 받지 않도록 YYYY-MM-DD 문자열로 다룬다.
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function toUtc(date: string): Date {
  const match = date.match(DATE);
  if (!match) throw new Error(`날짜 형식이 올바르지 않습니다: ${date}`);
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function fromUtc(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function isDate(value: string | null | undefined): value is string {
  if (!value || !DATE.test(value)) return false;
  return fromUtc(toUtc(value)) === value;
}

export function addDays(date: string, days: number): string {
  const value = toUtc(date);
  value.setUTCDate(value.getUTCDate() + days);
  return fromUtc(value);
}

/** 대상 월에 같은 날이 없으면 그 달의 말일로 맞춘다. */
export function addMonths(date: string, months: number): string {
  const value = toUtc(date);
  const day = value.getUTCDate();
  const target = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return fromUtc(target);
}

/** start부터 end까지 채운 개월 수. end가 앞서면 0이다. */
export function monthsBetween(start: string, end: string): number {
  if (end <= start) return 0;
  const a = toUtc(start);
  const b = toUtc(end);
  let months = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
  if (addMonths(start, months) > end) months -= 1;
  return Math.max(months, 0);
}

export function daysBetween(start: string, end: string): number {
  return Math.round((toUtc(end).getTime() - toUtc(start).getTime()) / 86_400_000);
}

/** date 이후(당일 포함) 가장 빠른 3월 1일 또는 9월 1일. 교원인사 규정 제15조. */
export function nextAppointmentDate(date: string): string {
  const year = Number(date.slice(0, 4));
  for (const candidate of [`${year}-03-01`, `${year}-09-01`, `${year + 1}-03-01`]) {
    if (candidate >= date) return candidate;
  }
  throw new Error("도달할 수 없는 경로입니다.");
}

/** 1학기는 3월 1일~8월 31일, 2학기는 9월 1일~2월 말일로 본다. */
export function semesterEnd(date: string): string {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  if (month >= 3 && month <= 8) return `${year}-08-31`;
  const endYear = month >= 9 ? year + 1 : year;
  return addDays(`${endYear}-03-01`, -1);
}

export function formatDate(date: string): string {
  return `${date.slice(0, 4)}.${date.slice(5, 7)}.${date.slice(8, 10)}`;
}

export function formatMonths(months: number): string {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0) return `${rest}개월`;
  return rest === 0 ? `${years}년` : `${years}년 ${rest}개월`;
}
