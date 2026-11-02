import { ARTICLES, type Article } from "@/lib/corpus";

// PDF 변환본은 줄바꿈 자리의 띄어쓰기가 빠져 있어 공백을 없앤 글자 2-gram으로 비교한다.
const K1 = 1.4;
const B = 0.6;
const HEADING_WEIGHT = 4;

/** 질문의 일상 표현을 규정 용어로 넓힌다. */
const SYNONYMS: [RegExp, string][] = [
  [/안식년|연구학기|sabbatical/i, "연구년"],
  [/테뉴어|tenure|정년\s*트랙\s*심사/i, "정년보장"],
  [/재계약|계약\s*연장/, "재임용"],
  [/육아휴직|육아\s*휴직|출산\s*휴직/, "자녀 양육 임신 출산 휴직"],
  [/병가/, "질병 상해 병가"],
  [/질병\s*휴직/, "신체 정신상의 장애 장기요양 휴직"],
  [/간호\s*휴직/, "간호 휴직 요양"],
  [/창업\s*휴직/, "벤처기업 창업기업 휴직"],
  [/동반\s*휴직/, "배우자 국외근무 휴직"],
  [/월급|급여/, "봉급 보수 급여"],
  [/정년\s*(이|은)?\s*(몇|언제|나이)/, "교원의 정년 만 65세"],
  [/강의\s*시수|책임\s*시수|의무\s*강의|강의\s*시간/, "책임강의시간"],
  [/호봉/, "호봉 교육 연구경력 기준표"],
  [/사외이사|겸직/, "겸직 사외이사 영리업무"],
  [/징계/, "징계 파면 해임 정직 감봉 견책"],
  [/해외\s*출장|해외\s*여행/, "해외여행"],
];

const STOP = /(?:무엇인가요|무엇입니까|알려\s*주세요|어떻게\s*되나요|어떻게\s*되나|궁금합니다|있나요|있습니까|인가요|뭐야|뭔가요|되나요|하나요|될까요|얼마나|언제까지|언제|몇\s*년|누가|어디|대해|관해)/g;

export function normalize(text: string): string {
  return text.normalize("NFC").toLowerCase().replace(/[^0-9a-z가-힣]/g, "");
}

function bigrams(text: string): string[] {
  const value = normalize(text);
  if (value.length < 2) return value ? [value] : [];
  return Array.from({ length: value.length - 1 }, (_, index) => value.slice(index, index + 2));
}

type Indexed = {
  article: Article;
  counts: Map<string, number>;
  length: number;
};

const index: Indexed[] = ARTICLES.map((article) => {
  const counts = new Map<string, number>();
  for (const gram of bigrams(article.text)) counts.set(gram, (counts.get(gram) ?? 0) + 1);
  for (const gram of bigrams(article.heading)) counts.set(gram, (counts.get(gram) ?? 0) + HEADING_WEIGHT);
  return { article, counts, length: [...counts.values()].reduce((sum, value) => sum + value, 0) };
});

const averageLength = index.reduce((sum, item) => sum + item.length, 0) / index.length;
const documentFrequency = new Map<string, number>();
for (const item of index) {
  for (const gram of item.counts.keys()) documentFrequency.set(gram, (documentFrequency.get(gram) ?? 0) + 1);
}

function inverseFrequency(gram: string): number {
  const df = documentFrequency.get(gram) ?? 0;
  return Math.log(1 + (index.length - df + 0.5) / (df + 0.5));
}

export function expandQuery(query: string): string {
  const added = SYNONYMS.filter(([pattern]) => pattern.test(query)).map(([, terms]) => terms);
  return [query.replace(STOP, " "), ...added].join(" ");
}

function priority(article: Article): number {
  if (article.article.startsWith("부칙")) return 0.45;
  if (article.outdated) return 0.7;
  return article.core ? 1.8 : 1;
}

const JOSA = /(은|는|이|가|을|를|의|에|도|로|으로|에서|까지|부터|와|과|이나|나)$/;

/** 조각이 아니라 단어 전체가 나오는 조문을 찾기 위한 질문 단어 */
function queryWords(query: string): string[] {
  const words = query
    .replace(STOP, " ")
    .split(/[^0-9A-Za-z가-힣]+/)
    .map((word) => normalize(word).replace(JOSA, ""))
    .filter((word) => word.length >= 2);
  return [...new Set(words)];
}

export type SearchHit = {
  article: Article;
  score: number;
};

const WORD_BONUS = 1.2;
const DOCUMENT_BONUS = 1.6;

function mentionsDocument(query: string, article: Article): boolean {
  return !article.core && normalize(query).includes(normalize(article.docTitle));
}

const ARTICLE_REFERENCE = /제\s*(\d+)\s*조(?:\s*의\s*(\d+))?/g;

export function search(query: string, limit = 6): SearchHit[] {
  const grams = [...new Set(bigrams(expandQuery(query)))];
  if (grams.length === 0) return [];

  const references = [...query.matchAll(ARTICLE_REFERENCE)].map((match) =>
    match[2] ? `제${match[1]}조의${match[2]}` : `제${match[1]}조`,
  );

  const words = queryWords(query);
  const hits = index.map(({ article, counts, length }) => {
    let score = 0;
    for (const gram of grams) {
      const count = counts.get(gram);
      if (!count) continue;
      const saturation = (count * (K1 + 1)) / (count + K1 * (1 - B + (B * length) / averageLength));
      score += inverseFrequency(gram) * saturation;
    }
    const body = normalize(article.text);
    const title = normalize(article.heading);
    for (const word of words) {
      if (word.length >= 3 && body.includes(word)) score += WORD_BONUS * word.length;
      if (title.includes(word)) score += WORD_BONUS * word.length;
    }
    if (mentionsDocument(query, article)) score *= DOCUMENT_BONUS;
    score *= priority(article);
    if (references.includes(article.article)) score += article.core ? 60 : 15;
    return { article, score };
  });

  return hits
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

const CONTEXT_LIMIT = 6;
/** 전임교원이 아닌 직종이나 별도 규정을 묻는 표현. 조교수는 조교가 아니다. */
const OTHER_SCOPE = /강사|겸임|조교(?!수)|특임|연구원|hk|국제교육원|임상|명예|노사|해외여행|석좌|초빙/i;

/**
 * 답변 근거로 쓸 조문을 고른다. 다른 직종을 묻지 않으면 전임교원 규정으로 좁힌다.
 * 근거가 없으면 빈 배열이다.
 */
export function retrieve(query: string): SearchHit[] {
  const hits = search(query, CONTEXT_LIMIT * 2);
  if (!hasEvidence(hits)) return [];
  const core = hits.filter((hit) => hit.article.core);
  const scoped = OTHER_SCOPE.test(query) || core.length === 0 ? hits : core;
  return scoped.slice(0, CONTEXT_LIMIT);
}

/** 근거로 삼을 만큼 질문과 맞닿은 조문이 있는지 판단한다. eval의 규정 밖 질문으로 정한 값이다. */
export function hasEvidence(hits: SearchHit[]): boolean {
  return (hits[0]?.score ?? 0) >= MIN_SCORE;
}

export const MIN_SCORE = 23;
