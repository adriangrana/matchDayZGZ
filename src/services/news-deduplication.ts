import type { NewsArticle } from "@/src/domain/models";

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSimilarity(first: string, second: string): number {
  const firstTokens = new Set(normalize(first).split(" ").filter(Boolean));
  const secondTokens = new Set(normalize(second).split(" ").filter(Boolean));
  if (firstTokens.size === 0 || secondTokens.size === 0) return 0;

  const intersection = [...firstTokens].filter((token) =>
    secondTokens.has(token),
  ).length;
  const union = new Set([...firstTokens, ...secondTokens]).size;
  return intersection / union;
}

function sameCanonicalUrl(first: string, second: string): boolean {
  const clean = (url: string) => url.split(/[?#]/)[0]?.replace(/\/$/, "");
  return clean(first) === clean(second);
}

function sameDay(first: string, second: string): boolean {
  return first.slice(0, 10) === second.slice(0, 10);
}

function sharedEntity(first: NewsArticle, second: NewsArticle): boolean {
  return first.relatedEntityIds.some((id) => second.relatedEntityIds.includes(id));
}

function isDuplicate(first: NewsArticle, second: NewsArticle): boolean {
  if (sameCanonicalUrl(first.canonicalUrl, second.canonicalUrl)) return true;
  if (!sameDay(first.publishedAt, second.publishedAt)) return false;

  const similarity = tokenSimilarity(first.title, second.title);
  return similarity >= 0.72 || (similarity >= 0.55 && sharedEntity(first, second));
}

function preferenceScore(article: NewsArticle): number {
  const officialBonus = article.confirmation === "oficial" ? 10 : 0;
  return officialBonus + article.summary.length / 1_000;
}

export function deduplicateNews(articles: NewsArticle[]): NewsArticle[] {
  return articles.reduce<NewsArticle[]>((unique, article) => {
    const duplicateIndex = unique.findIndex((candidate) =>
      isDuplicate(candidate, article),
    );

    if (duplicateIndex === -1) return [...unique, article];
    if (preferenceScore(article) <= preferenceScore(unique[duplicateIndex]!)) {
      return unique;
    }

    return unique.map((item, index) =>
      index === duplicateIndex ? article : item,
    );
  }, []);
}

