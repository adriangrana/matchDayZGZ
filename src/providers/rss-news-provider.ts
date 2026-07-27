import { XMLParser } from "fast-xml-parser";
import type { NewsArticle, SourceReference } from "@/src/domain/models";
import type {
  NewsProvider,
  ProviderContext,
} from "@/src/providers/match-day-provider";
import { fetchWithRetry } from "@/src/services/fetch-with-retry";
import {
  normalizeNewsItem,
  normalizeTitle,
  plainText,
  type RawNewsItem,
} from "@/src/services/news-normalization";

export interface RssNewsSource {
  id: string;
  name: string;
  siteUrl: string;
  feedUrl: string;
  official: boolean;
  specificToClub: boolean;
  maxItems?: number;
}

type XmlValue =
  | string
  | number
  | undefined
  | Record<string, unknown>
  | Array<unknown>;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  trimValues: true,
  processEntities: true,
});

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function text(value: XmlValue): string {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (value && !Array.isArray(value) && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return text((record["#text"] ?? record.__cdata) as XmlValue);
  }
  return "";
}

function attribute(value: unknown, key: string): string | undefined {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return undefined;
  }
  const result = (value as Record<string, unknown>)[`@${key}`];
  return typeof result === "string" || typeof result === "number"
    ? String(result)
    : undefined;
}

function numberAttribute(value: unknown, key: string): number | undefined {
  const result = Number(attribute(value, key));
  return Number.isFinite(result) ? result : undefined;
}

function link(item: Record<string, unknown>): string {
  const raw = item.link;
  if (Array.isArray(raw)) {
    const canonical = raw.find(
      (entry) => attribute(entry, "rel") === "alternate",
    );
    return attribute(canonical ?? raw[0], "href") ?? text(raw[0] as XmlValue);
  }
  return attribute(raw, "href") ?? text(raw as XmlValue);
}

function image(item: Record<string, unknown>) {
  const media = item["media:content"] ?? item.enclosure;
  const selected = Array.isArray(media) ? media[0] : media;
  return {
    url: attribute(selected, "url"),
    width: numberAttribute(selected, "width"),
    height: numberAttribute(selected, "height"),
  };
}

function rawItem(item: Record<string, unknown>): RawNewsItem {
  const media = image(item);
  return {
    title: text(item.title as XmlValue),
    url: link(item),
    description: text(
      (item.description ?? item.summary ?? item["content:encoded"]) as XmlValue,
    ),
    author: text((item["dc:creator"] ?? item.author) as XmlValue) || undefined,
    publishedAt: text(
      (item.pubDate ?? item.published ?? item.updated) as XmlValue,
    ),
    updatedAt:
      text((item.updated ?? item["dc:date"]) as XmlValue) || undefined,
    imageUrl: media.url,
    imageWidth: media.width,
    imageHeight: media.height,
  };
}

function concernsRealZaragoza(item: RawNewsItem): boolean {
  const haystack = normalizeTitle(
    `${item.title} ${plainText(item.description)} ${item.url}`,
  );
  return (
    haystack.includes("real zaragoza") ||
    haystack.includes("zaragocista") ||
    item.url.includes("/real-zaragoza/") ||
    item.url.includes("/futbol/zaragoza/")
  );
}

export class RssNewsProvider implements NewsProvider {
  readonly id: string;

  constructor(readonly config: RssNewsSource) {
    this.id = config.id;
  }

  async getNews(context: ProviderContext = {}): Promise<NewsArticle[]> {
    const response = await fetchWithRetry(
      this.config.feedUrl,
      {
        signal: context.signal,
        cache: "no-store",
      },
      { timeoutMs: 8_000, retries: 2 },
    );
    const xml = await response.text();
    const document = parser.parse(xml) as Record<string, unknown>;
    const rss = document.rss as Record<string, unknown> | undefined;
    const feed = document.feed as Record<string, unknown> | undefined;
    const channel = rss?.channel as Record<string, unknown> | undefined;
    const items = asArray<Record<string, unknown>>(
      (channel?.item ?? feed?.entry) as
        | Record<string, unknown>
        | Record<string, unknown>[]
        | undefined,
    );
    const syncedAt = (context.now ?? new Date()).toISOString();
    const source: SourceReference = {
      id: this.config.id,
      name: this.config.name,
      url: this.config.siteUrl,
      fetchedAt: syncedAt,
      isOfficial: this.config.official,
    };

    return items
      .map(rawItem)
      .filter(
        (item) =>
          this.config.specificToClub || concernsRealZaragoza(item),
      )
      .slice(0, this.config.maxItems ?? 20)
      .map((item) => normalizeNewsItem(item, source, syncedAt));
  }
}

