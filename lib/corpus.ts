import corpus from "@/data/corpus.json";

export type Article = {
  id: string;
  docId: string;
  docTitle: string;
  article: string;
  heading: string;
  text: string;
  outdated: boolean;
  core: boolean;
};

export type RegulationDocument = {
  id: string;
  title: string;
  amended: string | null;
  outdated: boolean;
  core: boolean;
  count: number;
};

export const ARTICLES = corpus.articles as Article[];
export const DOCUMENTS = corpus.documents as RegulationDocument[];
export const SOURCE_URL = corpus.sourceUrl;
export const COLLECTED_DATE = corpus.collected;

export function findArticle(docId: string, article: string): Article | undefined {
  return ARTICLES.find((item) => item.docId === docId && item.article === article);
}

export function articlesOf(docId: string): Article[] {
  return ARTICLES.filter((item) => item.docId === docId);
}

export function articleAnchor(article: string): string {
  return encodeURIComponent(article.replace(/\s/g, ""));
}
