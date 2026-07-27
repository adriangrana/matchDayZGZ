import assert from "node:assert/strict";
import test from "node:test";
import type { NewsArticle } from "../src/domain/models";
import { deduplicateNews } from "../src/services/news-deduplication";

const source = {
  id: "test",
  name: "Fuente test",
  url: "https://example.com",
  fetchedAt: "2026-07-27T10:00:00.000Z",
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
    canonicalUrl: `https://example.com/${id}`,
    publishedAt: "2026-07-27T09:00:00.000Z",
    category: "plantilla",
    confirmation: "rumor",
    source,
    relatedEntityIds: ["jugador-1"],
    ...overrides,
  };
}

test("elimina URLs canónicas repetidas aunque cambien los parámetros", () => {
  const result = deduplicateNews([
    article("a", "Primer titular", {
      canonicalUrl: "https://example.com/noticia?utm_source=test",
    }),
    article("b", "Otro titular", {
      canonicalUrl: "https://example.com/noticia#detalle",
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
      confirmation: "oficial",
      summary: "Resumen oficial y más completo de la sesión de entrenamiento.",
    },
  );

  const result = deduplicateNews([rumor, official]);

  assert.equal(result.length, 1);
  assert.equal(result[0]?.id, "official");
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

