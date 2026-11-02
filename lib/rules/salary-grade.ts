import type { Rank } from "./types";

export type GradeRow = {
  rank: Rank;
  grade: number;
  /** [이상, 미만) 교육·연구경력(년) */
  doctorate: [number, number] | null;
  nonDoctorate: [number, number];
};

const rows = (
  rank: Rank,
  first: number,
  step: number,
  doctorateFromGrade: number,
  doctorateStart: number,
  nonDoctorateStart: number,
): GradeRow[] =>
  Array.from({ length: first }, (_, index) => {
    const grade = first - index;
    const doctorateIndex = doctorateFromGrade - grade;
    return {
      rank,
      grade,
      doctorate: doctorateIndex >= 0 ? [doctorateStart + doctorateIndex * step, doctorateStart + (doctorateIndex + 1) * step] : null,
      nonDoctorate: [nonDoctorateStart + index * step, nonDoctorateStart + (index + 1) * step],
    };
  });

/** 교원인사 규정 별표 1 */
export const GRADE_TABLE: GradeRow[] = [
  ...rows("조교수", 9, 1, 7, 0, 0),
  ...rows("부교수", 7, 1, 5, 7, 9),
  ...rows("교수", 12, 2, 10, 12, 16),
];

export function gradeFor(rank: Rank, hasDoctorate: boolean, careerYears: number): GradeRow | null {
  return (
    GRADE_TABLE.find((row) => {
      if (row.rank !== rank) return false;
      const range = hasDoctorate ? row.doctorate : row.nonDoctorate;
      return range !== null && careerYears >= range[0] && careerYears < range[1];
    }) ?? null
  );
}

/** 승진 후 호봉. 교원인사 규정 제27조 제3항·제4항. */
export function promotedGrade(rank: Rank, hasDoctorate: boolean, isArtsPractice: boolean): number | null {
  const base = rank === "조교수" ? 5 : rank === "부교수" ? 10 : null;
  if (base === null) return null;
  if (hasDoctorate) return base;
  return base + (isArtsPractice ? 1 : 2);
}
