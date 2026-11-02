// 한양대학교_규정집/text의 원문을 조문 단위로 나누어 data/corpus.json을 만든다.
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const TEXT_DIR = "한양대학교_규정집/text";
const SOURCE_URL = "https://portal.hanyang.ac.kr/huas/iycy/ruleBook.do";

// 판정과 질의응답에서 우선하는 순서. 뒤에 있을수록 일반 참고 자료다.
const DOCS = [
  { id: "faculty-personnel", file: "교원인사규정", title: "교원인사 규정", amended: "2025-12-08", core: true },
  { id: "sabbatical", file: "연구년제", title: "교원 연구년제에 관한 규정", amended: "2026-08-31", core: true },
  { id: "charter-leave", file: "학교법인한양학원정관_제44-47조", title: "학교법인 한양학원 정관 (휴직)", amended: "2026-02-19", core: true },
  { id: "charter-2017", file: "학교법인한양학원정관_20170629", title: "학교법인 한양학원 정관 (2017년판)", amended: "2017-06-29", outdated: true },
  { id: "appendix-1", file: "별표1", title: "교원인사 규정 별표 1 (자격·직급 및 호봉부여 기준)", amended: "2025-12-08", core: true, whole: true },
  { id: "appendix-2", file: "별표2", title: "교원인사 규정 별표 2 (책임강의시간 부여 기준)", amended: "2025-12-08", core: true, whole: true },
  { id: "adjunct", file: "겸임교원", title: "겸임교원" },
  { id: "lecturer", file: "강사임용", title: "강사임용" },
  { id: "hk", file: "HK교원인사", title: "HK교원인사" },
  { id: "intl-education", file: "국제교육원교수임용", title: "국제교육원교수 임용" },
  { id: "overseas-travel", file: "교원해외여행", title: "교원해외여행" },
  { id: "honorary-retirement", file: "명예퇴직", title: "명예퇴직" },
  { id: "clinical-training", file: "임상의학전임교원연수", title: "임상의학전임교원 연수" },
  { id: "teaching-assistant", file: "조교임용", title: "조교임용" },
  { id: "postdoc", file: "박사후연구원", title: "박사후연구원" },
  { id: "special-researcher", file: "특임연구원임용", title: "특임연구원 임용" },
  { id: "honorary-president", file: "명예총장", title: "명예총장" },
  { id: "labor-council", file: "노사협의회운영", title: "노사협의회 운영" },
];

const ARTICLE = /^제\s*(\d+)\s*조(?:\s*의\s*(\d+))?\s*(?:\(([^)]*)\)|【([^】]*)】|《([^》]*)》|(?=\s*삭제)|(?=\s))/;
const ADDENDA = /^부\s*칙/;

function articleLabel(match) {
  return match[2] ? `제${match[1]}조의${match[2]}` : `제${match[1]}조`;
}

function splitArticles(doc, text) {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const chunks = [];
  let current = null;
  let inAddenda = false;
  let addendaIndex = 0;

  const flush = () => {
    if (current) chunks.push(current);
    current = null;
  };

  for (const line of lines) {
    if (ADDENDA.test(line)) {
      flush();
      inAddenda = true;
      addendaIndex += 1;
      current = { article: `부칙 ${addendaIndex}`, heading: line, lines: [line] };
      continue;
    }
    const match = inAddenda ? null : line.match(ARTICLE);
    if (match) {
      flush();
      current = {
        article: articleLabel(match),
        heading: (match[3] ?? match[4] ?? match[5] ?? "").trim(),
        lines: [line],
      };
      continue;
    }
    if (/^제\s*\d+\s*(장|절|관)(\s|$)/.test(line)) {
      flush();
      continue;
    }
    if (current) current.lines.push(line);
  }
  flush();
  return chunks;
}

function articleId(docId, article, seen) {
  const base = `${docId}:${article.replace(/\s/g, "")}`;
  const count = (seen.get(base) ?? 0) + 1;
  seen.set(base, count);
  return count === 1 ? base : `${base}-${count}`;
}

const available = new Set(readdirSync(TEXT_DIR).map((name) => name.normalize("NFC")));
const articles = [];
const documents = [];

for (const doc of DOCS) {
  const fileName = `${doc.file}.txt`;
  if (!available.has(fileName)) throw new Error(`원문 파일이 없습니다: ${fileName}`);
  const actual = readdirSync(TEXT_DIR).find((name) => name.normalize("NFC") === fileName);
  const text = readFileSync(join(TEXT_DIR, actual), "utf8").normalize("NFC");
  const seen = new Map();

  const chunks = doc.whole
    ? [{ article: doc.file.replace("별표", "별표 "), heading: doc.title, lines: text.trim().split("\n") }]
    : splitArticles(doc, text);

  const kept = chunks.filter((chunk) => {
    // 2017년판의 휴직 조문은 최신 조문으로 대체한다.
    if (doc.id !== "charter-2017") return true;
    return !["제44조", "제45조", "제46조", "제47조"].includes(chunk.article);
  });

  for (const chunk of kept) {
    articles.push({
      id: articleId(doc.id, chunk.article, seen),
      docId: doc.id,
      docTitle: doc.title,
      article: chunk.article,
      heading: chunk.heading,
      text: chunk.lines.join("\n"),
      outdated: Boolean(doc.outdated),
      core: Boolean(doc.core),
    });
  }

  documents.push({
    id: doc.id,
    title: doc.title,
    amended: doc.amended ?? (text.match(/개정일\s*:\s*(\d{4})년\s*(\d{2})월\s*(\d{2})일/)?.slice(1, 4).join("-") ?? null),
    outdated: Boolean(doc.outdated),
    core: Boolean(doc.core),
    count: kept.length,
  });
}

mkdirSync("data", { recursive: true });
writeFileSync(
  "data/corpus.json",
  `${JSON.stringify({ sourceUrl: SOURCE_URL, collected: "2026-11-02", documents, articles }, null, 1)}\n`,
);
console.log(`문서 ${documents.length}개, 조문 ${articles.length}개`);
for (const doc of documents) console.log(`  ${String(doc.count).padStart(4)} ${doc.title} (${doc.amended ?? "개정일 미상"})`);
