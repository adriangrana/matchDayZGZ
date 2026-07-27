import type { RssNewsSource } from "@/src/providers/rss-news-provider";

export const DEFAULT_NEWS_SOURCES: RssNewsSource[] = [
  {
    id: "aragon-digital",
    name: "Aragón Digital",
    siteUrl: "https://www.aragondigital.es/real-zaragoza/",
    feedUrl: "https://www.aragondigital.es/rss/real-zaragoza/",
    official: false,
    specificToClub: true,
    maxItems: 18,
  },
  {
    id: "marca-zaragoza",
    name: "MARCA",
    siteUrl: "https://www.marca.com/futbol/zaragoza.html",
    feedUrl: "https://e00-marca.uecdn.es/rss/futbol/zaragoza.xml",
    official: false,
    specificToClub: true,
    maxItems: 18,
  },
  {
    id: "heraldo",
    name: "Heraldo de Aragón",
    siteUrl:
      "https://www.heraldo.es/noticias/deportes/futbol/real-zaragoza/",
    feedUrl: "https://www.heraldo.es/rss/",
    official: false,
    specificToClub: false,
    maxItems: 18,
  },
  {
    id: "periodico-aragon",
    name: "El Periódico de Aragón",
    siteUrl: "https://www.elperiodicodearagon.com/real-zaragoza/",
    feedUrl: "https://www.elperiodicodearagon.com/rss/",
    official: false,
    specificToClub: false,
    maxItems: 18,
  },
];

export function configuredNewsSources(): RssNewsSource[] {
  const customFeeds = process.env.NEWS_FEEDS?.split(",")
    .map((feed) => feed.trim())
    .filter(Boolean);

  if (!customFeeds?.length) return DEFAULT_NEWS_SOURCES;

  return customFeeds.map((feedUrl, index) => ({
    id: `custom-${index + 1}`,
    name: `Fuente RSS ${index + 1}`,
    siteUrl: new URL(feedUrl).origin,
    feedUrl,
    official: false,
    specificToClub: false,
    maxItems: 18,
  }));
}

