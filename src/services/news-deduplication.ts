import type { NewsArticle, NewsGroup } from "@/src/domain/models";
import { normalizeTitle } from "@/src/services/news-normalization";

export function tokenSimilarity(first: string, second: string): number {
  const firstTokens = new Set(normalizeTitle(first).split(" ").filter(Boolean));
  const secondTokens = new Set(normalizeTitle(second).split(" ").filter(Boolean));
  if (firstTokens.size === 0 || secondTokens.size === 0) return 0;

  const intersection = [...firstTokens].filter((token) =>
    secondTokens.has(token),
  ).length;
  const union = new Set([...firstTokens, ...secondTokens]).size;
  return intersection / union;
}

function sameCanonicalUrl(first: string, second: string): boolean {
  return first === second;
}

function withinDateWindow(first: string, second: string): boolean {
  const distance = Math.abs(
    new Date(first).getTime() - new Date(second).getTime(),
  );
  return distance <= 36 * 60 * 60 * 1_000;
}

function sharedEntity(first: NewsArticle, second: NewsArticle): boolean {
  return first.relatedEntityIds.some(
    (id) => id !== "real-zaragoza" && second.relatedEntityIds.includes(id),
  );
}

export function isRelatedNews(
  first: NewsArticle,
  second: NewsArticle,
): boolean {
  if (sameCanonicalUrl(first.canonicalUrl, second.canonicalUrl)) return true;
  if (!withinDateWindow(first.publishedAt, second.publishedAt)) return false;

  const similarity = tokenSimilarity(first.title, second.title);
  return similarity >= 0.68 || (similarity >= 0.5 && sharedEntity(first, second));
}

function articleScore(article: NewsArticle, now: Date): number {
  const ageInHours = Math.max(
    0,
    (now.getTime() - new Date(article.publishedAt).getTime()) / 3_600_000,
  );
  const recency = Math.max(0, 48 - ageInHours) / 6;
  const official = article.confirmation === "official" ? 30 : 0;
  const confirmation =
    article.confirmation === "confirmed"
      ? 4
      : article.confirmation === "rumor"
        ? -2
        : 0;
  const completeness =
    (article.summary ? 1 : 0) + (article.imageUrl ? 1 : 0) + (article.author ? 0.5 : 0);
  return official + confirmation + recency + completeness;
}

export function groupRelatedNews(
  articles: NewsArticle[],
  now = new Date(),
): NewsGroup[] {
  const groups: NewsArticle[][] = [];

  for (const article of articles) {
    const group = groups.find((candidate) =>
      candidate.some((item) => isRelatedNews(item, article)),
    );
    if (group) group.push(article);
    else groups.push([article]);
  }

  return groups
    .map((group) => {
      const sorted = [...group].sort(
        (first, second) =>
          new Date(second.publishedAt).getTime() -
            new Date(first.publishedAt).getTime() ||
          articleScore(second, now) - articleScore(first, now),
      );
      const primary = sorted[0]!;
      const sourceCount = new Set(sorted.map((item) => item.source.id)).size;
      return {
        primary,
        related: sorted.slice(1),
        sourceCount,
        relevanceScore: articleScore(primary, now) + (sourceCount - 1) * 3,
      };
    })
    .sort(
      (first, second) =>
        new Date(second.primary.publishedAt).getTime() -
          new Date(first.primary.publishedAt).getTime() ||
        second.relevanceScore - first.relevanceScore,
    );
}

export function deduplicateNews(
  articles: NewsArticle[],
  now = new Date(),
): NewsArticle[] {
  return groupRelatedNews(articles, now).map((group) => group.primary);
}
