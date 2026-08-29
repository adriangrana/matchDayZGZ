import assert from "node:assert/strict";
import test from "node:test";
import type { NewsArticle, NewsGroup } from "../src/domain/models";
import {
  type NewsImageValidationEntry,
  validatePrimaryImages,
} from "../src/services/news-service";

function group(id: string, imageUrl: string): NewsGroup {
  const primary: NewsArticle = {
    id,
    title: `Noticia ${id}`,
    summary: "Resumen de prueba",
    originalUrl: `https://example.com/${id}`,
    canonicalUrl: `https://example.com/${id}`,
    publishedAt: "2026-07-28T12:00:00.000Z",
    updatedAt: "2026-07-28T12:00:00.000Z",
    category: "otros",
    confirmation: "confirmed",
    source: {
      id: "test",
      name: "Fuente test",
      url: "https://example.com",
      fetchedAt: "2026-07-28T12:00:00.000Z",
      isOfficial: false,
    },
    imageUrl,
    relatedEntityIds: ["real-zaragoza"],
    syncedAt: "2026-07-28T12:00:00.000Z",
  };
  return {
    primary,
    related: [],
    sourceCount: 1,
    relevanceScore: 1,
  };
}

test("prioriza imágenes recientes y conserva las restantes del RSS", async () => {
  const calls: string[] = [];
  const groups = [
    group("newest", "https://example.com/newest.jpg"),
    group("older", "https://example.com/older.jpg"),
  ];

  const result = await validatePrimaryImages(groups, {
    limit: 1,
    cache: new Map(),
    validate: async (url) => {
      calls.push(url);
      return url;
    },
  });

  assert.deepEqual(calls, ["https://example.com/newest.jpg"]);
  assert.equal(result[0]?.primary.imageUrl, groups[0]?.primary.imageUrl);
  assert.equal(result[1]?.primary.imageUrl, groups[1]?.primary.imageUrl);
});

test("una imagen validada en caché no consume el cupo de la siguiente sincronización", async () => {
  const cachedUrl = "https://example.com/cached.jpg";
  const nextUrl = "https://example.com/next.jpg";
  const cache = new Map<string, NewsImageValidationEntry>([
    [
      cachedUrl,
      {
        imageUrl: cachedUrl,
        expiresAt: new Date("2026-07-30T00:00:00.000Z").getTime(),
      },
    ],
  ]);
  const calls: string[] = [];

  const result = await validatePrimaryImages(
    [group("cached", cachedUrl), group("next", nextUrl)],
    {
      now: new Date("2026-07-28T12:00:00.000Z"),
      limit: 1,
      cache,
      validate: async (url) => {
        calls.push(url);
        return url;
      },
    },
  );

  assert.deepEqual(calls, [nextUrl]);
  assert.equal(result[0]?.primary.imageUrl, cachedUrl);
  assert.equal(result[1]?.primary.imageUrl, nextUrl);
});
