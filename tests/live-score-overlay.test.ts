import assert from "node:assert/strict";
import test from "node:test";
import {
  requireGroupTwoTeam,
} from "../src/data/primera-federacion-teams";
import type { SourceReference } from "../src/domain/models";
import type { NormalizedGroupMatch } from "../src/providers/free-sports-types";
import {
  inferMatchesInLiveWindow,
  sanitizeRoundOneArticleResults,
} from "../src/services/live-score-overlay";

const calendarSource: SourceReference = {
  id: "rfef-calendar-pdf",
  name: "Calendario oficial RFEF",
  url: "https://rfef.es/",
  fetchedAt: "2026-08-01T10:00:00.000Z",
  isOfficial: true,
};

const articleSource: SourceReference = {
  id: "rfef-results-article",
  name: "RFEF · resultados de la jornada",
  url: "https://rfef.es/es/noticias/resumenes-vive-la-jornada-1-de-primera-federacion",
  fetchedAt: "2026-08-29T20:30:00.000Z",
  isOfficial: true,
};

function fixture(options: {
  id: string;
  round: number;
  startsAt: string;
  status?: NormalizedGroupMatch["status"];
  score?: { home: number; away: number };
  article?: boolean;
}): NormalizedGroupMatch {
  return {
    id: options.id,
    round: options.round,
    roundLabel: `Jornada ${options.round}`,
    dateBase: options.startsAt.slice(0, 10),
    startsAt: options.startsAt,
    kickoffStatus: "confirmed",
    homeTeam: requireGroupTwoTeam("Hércules de Alicante CF"),
    awayTeam: requireGroupTwoTeam("Real Murcia CF"),
    status: options.status ?? "scheduled",
    score: options.score,
    sources: options.article
      ? [articleSource, calendarSource]
      : [calendarSource],
    updatedAt: options.article ? articleSource.fetchedAt : calendarSource.fetchedAt,
  };
}

test("marca como en vivo un partido confirmado dentro de la ventana de juego", () => {
  const match = fixture({
    id: "hercules-murcia-j1",
    round: 1,
    startsAt: "2026-08-29T21:30:00+02:00",
  });

  const [result] = inferMatchesInLiveWindow(
    [match],
    new Date("2026-08-29T22:32:00+02:00"),
  );

  assert.equal(result?.status, "live");
  assert.equal(result?.score, undefined);
});

test("elimina falsos resultados de vueltas futuras creados por el articulo de jornada 1", () => {
  const wrongReturnLeg = fixture({
    id: "murcia-hercules-return",
    round: 20,
    startsAt: "2027-01-17T12:00:00+01:00",
    status: "finished",
    score: { home: 0, away: 0 },
    article: true,
  });

  const [result] = sanitizeRoundOneArticleResults([wrongReturnLeg]);

  assert.equal(result?.status, "scheduled");
  assert.equal(result?.score, undefined);
  assert.equal(result?.kickoffStatus, "unknown");
  assert.equal(
    result?.sources.some((source) => source.id === "rfef-results-article"),
    false,
  );
});

test("conserva los resultados reales de la jornada 1", () => {
  const realRoundOneResult = fixture({
    id: "hercules-murcia-j1-finished",
    round: 1,
    startsAt: "2026-08-29T21:30:00+02:00",
    status: "finished",
    score: { home: 1, away: 0 },
    article: true,
  });

  const [result] = sanitizeRoundOneArticleResults([realRoundOneResult]);

  assert.equal(result?.status, "finished");
  assert.deepEqual(result?.score, { home: 1, away: 0 });
});

test("conserva los resultados del articulo de la jornada correspondiente", () => {
  const roundTwoArticle: SourceReference = {
    ...articleSource,
    url: "https://rfef.es/es/noticias/resumenes-vive-la-jornada-2-de-primera-federacion",
    fetchedAt: "2026-09-04T21:30:00.000Z",
  };
  const roundTwoResult = fixture({
    id: "villarreal-algeciras-j2-finished",
    round: 2,
    startsAt: "2026-09-04T19:00:00+02:00",
    status: "finished",
    score: { home: 2, away: 1 },
  });
  roundTwoResult.sources = [roundTwoArticle, calendarSource];
  roundTwoResult.updatedAt = roundTwoArticle.fetchedAt;

  const [result] = sanitizeRoundOneArticleResults([roundTwoResult]);

  assert.equal(result?.status, "finished");
  assert.deepEqual(result?.score, { home: 2, away: 1 });
  assert.equal(result?.kickoffStatus, "confirmed");
  assert.equal(
    result?.sources.some((source) => source.url.includes("jornada-2")),
    true,
  );
});
