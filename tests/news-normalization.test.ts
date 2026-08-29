import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalizeUrl,
  classifyCategory,
  classifyConfirmation,
  normalizeNewsItem,
  plainText,
} from "../src/services/news-normalization";

const source = {
  id: "medio",
  name: "Medio",
  url: "https://example.com",
  fetchedAt: "2026-07-27T10:00:00.000Z",
  isOfficial: false,
};

test("limpia HTML y parámetros de seguimiento sin copiar el artículo", () => {
  assert.equal(plainText("<p>Texto <strong>breve</strong>&amp; útil</p>"), "Texto breve & útil");
  assert.equal(
    canonicalizeUrl(
      "https://example.com/noticia/?utm_source=rss&fbclid=123#comments",
    ),
    "https://example.com/noticia",
  );
});

test("clasifica categorías y rumores mediante reglas conservadoras", () => {
  assert.equal(
    classifyCategory(
      "El equipo completa la sesión de entrenamiento",
      "",
      false,
    ),
    "entrenamientos",
  );
  assert.equal(
    classifyConfirmation(
      "Un delantero podría interesar al Zaragoza",
      "",
      false,
    ),
    "rumor",
  );
});

test("solo una fuente oficial puede producir estado official", () => {
  assert.notEqual(
    classifyConfirmation("Comunicado oficial", "", false),
    "official",
  );
  assert.equal(
    classifyConfirmation("Comunicado oficial", "", true),
    "official",
  );
});

test("normaliza y valida todos los campos comunes", () => {
  const article = normalizeNewsItem(
    {
      title: "El Real Zaragoza prepara el próximo partido",
      description: "<p>Resumen breve de la jornada.</p>",
      url: "https://example.com/noticia?utm_medium=rss",
      author: "Redacción",
      publishedAt: "Mon, 27 Jul 2026 10:00:00 +0200",
      imageUrl: "https://example.com/image.jpg",
      imageWidth: 1200,
      imageHeight: 675,
    },
    source,
    "2026-07-27T10:30:00.000Z",
  );

  assert.equal(article.canonicalUrl, "https://example.com/noticia");
  assert.equal(article.author, "Redacción");
  assert.equal(article.category, "partidos");
  assert.equal(article.confirmation, "unknown");
  assert.equal(article.syncedAt, "2026-07-27T10:30:00.000Z");
});

test("acepta transformaciones editoriales que incluyen default en la URL", () => {
  const article = normalizeNewsItem(
    {
      title: "El Real Zaragoza disputa su primer amistoso",
      description: "Previa del encuentro de pretemporada.",
      url: "https://example.com/amistoso",
      publishedAt: "Tue, 28 Jul 2026 18:13:18 +0000",
      imageUrl:
        "https://cdn.example.com/clip/foto_16-9-aspect-ratio_default_0_x1000y351.jpg",
      imageWidth: 880,
      imageHeight: 495,
    },
    source,
    "2026-07-28T18:30:00.000Z",
  );

  assert.equal(
    article.imageUrl,
    "https://cdn.example.com/clip/foto_16-9-aspect-ratio_default_0_x1000y351.jpg",
  );
});
