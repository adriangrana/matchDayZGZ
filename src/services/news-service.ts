import { demoSnapshot } from "@/src/data/demo";
import type {
  NewsArticle,
  NewsFeedSnapshot,
  NewsGroup,
} from "@/src/domain/models";
import { configuredNewsSources } from "@/src/providers/news-sources";
import { RssNewsProvider } from "@/src/providers/rss-news-provider";
import { groupRelatedNews } from "@/src/services/news-deduplication";
import { validateRemoteImage } from "@/src/services/image-validation";

interface NewsCacheEntry {
  snapshot: NewsFeedSnapshot;
  expiresAt: number;
}

export interface NewsImageValidationEntry {
  imageUrl?: string;
  expiresAt: number;
}

declare global {
  var __matchDayNewsCache: NewsCacheEntry | undefined;
  var __matchDayNewsImageCache:
    | Map<string, NewsImageValidationEntry>
    | undefined;
}

function cacheMinutes(): number {
  const value = Number(process.env.NEWS_CACHE_MINUTES ?? 30);
  return Number.isFinite(value) && value >= 5 ? value : 30;
}

function demoNewsSnapshot(): NewsFeedSnapshot {
  return {
    groups: groupRelatedNews(
      structuredClone(demoSnapshot.news),
      new Date(demoSnapshot.generatedAt),
    ),
    syncedAt: demoSnapshot.generatedAt,
    stale: false,
    mode: "demo",
    sourceErrors: [],
  };
}

export async function validatePrimaryImages(
  groups: NewsGroup[],
  options: {
    now?: Date;
    limit?: number;
    cache?: Map<string, NewsImageValidationEntry>;
    validate?: typeof validateRemoteImage;
  } = {},
): Promise<NewsGroup[]> {
  const now = options.now ?? new Date();
  const limit =
    options.limit ??
    Math.max(
      0,
      Number(process.env.NEWS_IMAGE_VALIDATION_LIMIT ?? 18),
    );
  const cache =
    options.cache ??
    (globalThis.__matchDayNewsImageCache ??= new Map());
  const validate = options.validate ?? validateRemoteImage;
  let checked = 0;

  return Promise.all(
    groups.map(async (group) => {
      const article = group.primary;
      if (!article.imageUrl) {
        return {
          ...group,
          primary: { ...article, imageUrl: undefined },
        };
      }

      const cached = cache.get(article.imageUrl);
      if (cached && cached.expiresAt > now.getTime()) {
        return {
          ...group,
          primary: { ...article, imageUrl: cached.imageUrl },
        };
      }

      if (checked >= limit) {
        // El RSS ya publicó una URL HTTPS normalizada. Se conserva para que el
        // navegador pueda cargarla de forma diferida y aplicar su fallback si
        // el medio deja de servirla.
        return group;
      }

      checked += 1;
      const imageUrl = await validate(article.imageUrl);
      cache.set(article.imageUrl, {
        imageUrl,
        expiresAt:
          now.getTime() +
          (imageUrl ? 24 * 60 * 60_000 : 60 * 60_000),
      });
      return {
        ...group,
        primary: { ...article, imageUrl },
      };
    }),
  );
}

async function synchronizeRealNews(now = new Date()): Promise<NewsFeedSnapshot> {
  const providers = configuredNewsSources().map(
    (source) => new RssNewsProvider(source),
  );
  const results = await Promise.allSettled(
    providers.map((provider) => provider.getNews({ now, force: true })),
  );
  const articles: NewsArticle[] = [];
  const sourceErrors: string[] = [];

  results.forEach((result, index) => {
    const provider = providers[index]!;
    if (result.status === "fulfilled") {
      articles.push(...result.value);
      console.info(
        `[news-sync] ${provider.id}: ${result.value.length} noticias normalizadas`,
      );
    } else {
      const message =
        result.reason instanceof Error ? result.reason.message : "error desconocido";
      sourceErrors.push(`${provider.id}: ${message}`);
      console.warn(`[news-sync] ${provider.id}: ${message}`);
    }
  });

  if (articles.length === 0) {
    throw new Error(
      sourceErrors.length
        ? `Todas las fuentes fallaron: ${sourceErrors.join("; ")}`
        : "Las fuentes no devolvieron noticias del Real Zaragoza",
    );
  }

  const groups = await validatePrimaryImages(groupRelatedNews(articles, now), {
    now,
  });
  const snapshot: NewsFeedSnapshot = {
    groups,
    syncedAt: now.toISOString(),
    stale: false,
    mode: "real",
    sourceErrors,
  };
  globalThis.__matchDayNewsCache = {
    snapshot,
    expiresAt: now.getTime() + cacheMinutes() * 60_000,
  };
  return snapshot;
}

export async function getNewsSnapshot(options: {
  force?: boolean;
  now?: Date;
} = {}): Promise<NewsFeedSnapshot> {
  if (process.env.NEWS_DATA_MODE === "demo") return demoNewsSnapshot();

  const now = options.now ?? new Date();
  const cached = globalThis.__matchDayNewsCache;
  if (!options.force && cached && cached.expiresAt > now.getTime()) {
    return cached.snapshot;
  }

  try {
    return await synchronizeRealNews(now);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error desconocido de sincronización";
    console.error(`[news-sync] ${message}`);

    if (cached) {
      return {
        ...cached.snapshot,
        stale: true,
        sourceErrors: [...cached.snapshot.sourceErrors, message],
      };
    }

    return {
      groups: [],
      syncedAt: now.toISOString(),
      stale: true,
      mode: "real",
      sourceErrors: [message],
    };
  }
}

export async function forceNewsSync(): Promise<NewsFeedSnapshot> {
  if (process.env.NEWS_DATA_MODE === "demo") return demoNewsSnapshot();
  return synchronizeRealNews(new Date());
}
