export const TASKS = [
  { id: "promotion", label: "승진" },
  { id: "reappointment", label: "재임용" },
  { id: "tenure", label: "정년보장" },
  { id: "sabbatical", label: "연구년" },
  { id: "leave", label: "휴직" },
] as const;

export type Task = (typeof TASKS)[number]["id"];
