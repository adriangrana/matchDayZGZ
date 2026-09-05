import assert from "node:assert/strict";
import test from "node:test";
import fallback from "../src/data/rfef-group-2-2026-27.json";
import { ComputedStandingsProvider } from "../src/providers/computed-standings-provider";
import type { NormalizedGroupMatch } from "../src/providers/free-sports-types";
import {
  mergePreviousFinishedResults,
  mergeRfefFacts,
} from "../src/services/free-sports-aggregator";
import {
  currentStartedRound,
  rfefResultsArticleUrl,
} from "../src/services/rfef-current-round-results";

const fallbackMatches = fallback.matches as NormalizedGroupMatch[];

test("la jornada 1 del Grupo II queda fijada con sus diez resultados oficiales", () => {
  const merged = mergeRfefFacts(
    fallbackMatches,
    "2026-09-05T13:30:00.000Z",
  );
  const roundOne = merged.filter((match) => match.round === 1);
  const finished = roundOne.filter(
    (match) => match.status === "finished" && match.score,
  );

  assert.equal(roundOne.length, 10);
  assert.equal(finished.length, 10);

  const standings = new ComputedStandingsProvider().compute(finished);
  const cartagena = standings.find((entry) => entry.team.id === "fc-cartagena");
  const zaragoza = standings.find((entry) => entry.team.id === "real-zaragoza");
  const alcorcon = standings.find((entry) => entry.team.id === "ad-alcorcon");

  assert.equal(cartagena?.played, 1);
  assert.equal(cartagena?.points, 3);
  assert.equal(zaragoza?.played, 1);
  assert.equal(zaragoza?.points, 0);
  assert.equal(alcorcon?.played, 1);
  assert.equal(alcorcon?.points, 1);
});

test("un resultado final confirmado no desaparece al reconstruir el calendario", () => {
  const fresh = structuredClone(fallbackMatches[0]!);
  const previous = structuredClone(fresh);
  previous.status = "finished";
  previous.kickoffStatus = "confirmed";
  previous.startsAt = "2026-09-04T19:00:00+02:00";
  previous.score = { home: 2, away: 1 };
  previous.sources = [
    {
      id: "rfef-results-article-r2",
      name: "RFEF · resultados Jornada 2",
      url: "https://rfef.es/es/noticias/resumenes-vive-la-jornada-2-de-primera-federacion",
      fetchedAt: "2026-09-04T21:00:00.000Z",
      isOfficial: true,
    },
  ];
  previous.updatedAt = "2026-09-04T21:00:00.000Z";

  const [restored] = mergePreviousFinishedResults(
    [fresh],
    [previous],
    new Date("2026-09-05T15:00:00+02:00"),
  );

  assert.equal(restored?.status, "finished");
  assert.deepEqual(restored?.score, { home: 2, away: 1 });
});

test("la fuente de resultados cambia automáticamente a la jornada en curso", () => {
  const roundTwo = structuredClone(fallbackMatches.find((match) => match.round === 2)!);
  roundTwo.startsAt = "2026-09-04T19:00:00+02:00";
  roundTwo.kickoffStatus = "confirmed";

  assert.equal(
    currentStartedRound([roundTwo], new Date("2026-09-05T15:00:00+02:00")),
    2,
  );
  assert.equal(
    rfefResultsArticleUrl(2),
    "https://rfef.es/es/noticias/resumenes-vive-la-jornada-2-de-primera-federacion",
  );
});
