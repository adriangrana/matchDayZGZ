import assert from "node:assert/strict";
import test from "node:test";
import type { NewsArticle } from "../src/domain/models";
import {
  deduplicateNews,
  groupRelatedNews,
} from "../src/services/news-deduplication";

const source = {
  id: "test",
  name: "Fuente test",
  url: "https://example.com",
  fetchedAt: "2026-07-27T10:00:00.000Z",
  isOfficial: false,
};

function article(
  id: string,
  title: string,
  overrides: Partial<NewsArticle> = {},
): NewsArticle {
  return {
    id,
    title,
    summary: "Resumen breve de prueba.",
    originalUrl: `https://example.com/${id}`,
    canonicalUrl: `https://example.com/${id}`,
    publishedAt: "2026-07-27T09:00:00.000Z",
    updatedAt: "2026-07-27T09:00:00.000Z",
    category: "plantilla",
    confirmation: "rumor",
    source,
    relatedEntityIds: ["jugador-1"],
    syncedAt: "2026-07-27T10:00:00.000Z",
    ...overrides,
  };
}

test("elimina URLs canónicas repetidas", () => {
  const result = deduplicateNews([
    article("a", "Primer titular", {
      canonicalUrl: "https://example.com/noticia",
    }),
    article("b", "Otro titular", {
      canonicalUrl: "https://example.com/noticia",
    }),
  ]);

  assert.equal(result.length, 1);
});

test("agrupa titulares similares del mismo día y prioriza el oficial", () => {
  const rumor = article(
    "rumor",
    "El Zaragoza completa una nueva sesión de entrenamiento",
  );
  const official = article(
    "official",
    "Nueva sesión de entrenamiento completada por el Zaragoza",
    {
      confirmation: "official",
      source: { ...source, isOfficial: true },
      summary: "Resumen oficial y más completo de la sesión de entrenamiento.",
    },
  );

  const result = deduplicateNews([rumor, official]);

  assert.equal(result.length, 1);
  assert.equal(result[0]?.id, "official");
});

test("conserva las fuentes alternativas dentro de la cobertura relacionada", () => {
  const groups = groupRelatedNews([
    article("a", "El Zaragoza completa una sesión de entrenamiento"),
    article("b", "El Zaragoza completa una sesión de entrenamiento", {
      source: { ...source, id: "second", name: "Segunda fuente" },
    }),
  ]);

  assert.equal(groups.length, 1);
  assert.equal(groups[0]?.sourceCount, 2);
  assert.equal(groups[0]?.related.length, 1);
});

test("conserva acontecimientos distintos", () => {
  const result = deduplicateNews([
    article("a", "El equipo prepara el próximo partido"),
    article("b", "La campaña de abonados supera un nuevo hito", {
      relatedEntityIds: ["club"],
    }),
  ]);

  assert.equal(result.length, 2);
});

test("ordena primero las noticias con publicación más reciente", () => {
  const groups = groupRelatedNews([
    article("older-official", "El club publica un comunicado institucional", {
      publishedAt: "2026-07-27T08:00:00.000Z",
      confirmation: "official",
      source: { ...source, isOfficial: true },
      relatedEntityIds: ["club"],
    }),
    article("newer", "El equipo prepara el encuentro del fin de semana", {
      publishedAt: "2026-07-27T11:30:00.000Z",
      confirmation: "confirmed",
      relatedEntityIds: ["partido-1"],
    }),
  ]);

  assert.deepEqual(
    groups.map((group) => group.primary.id),
    ["newer", "older-official"],
  );
});

test("una cobertura relacionada más reciente ocupa la tarjeta principal", () => {
  const groups = groupRelatedNews([
    article("older", "El Zaragoza completa una sesión de entrenamiento", {
      publishedAt: "2026-07-27T08:00:00.000Z",
      confirmation: "official",
      source: { ...source, isOfficial: true },
    }),
    article("newer", "El Zaragoza completa una sesión de entrenamiento", {
      publishedAt: "2026-07-27T10:00:00.000Z",
      confirmation: "confirmed",
    }),
  ]);

  assert.equal(groups[0]?.primary.id, "newer");
  assert.equal(groups[0]?.related[0]?.id, "older");
});
