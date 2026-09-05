import assert from "node:assert/strict";
import test from "node:test";
import fallback from "../src/data/rfef-group-2-2026-27.json";
import { ComputedStandingsProvider } from "../src/providers/computed-standings-provider";
import type { NormalizedGroupMatch } from "../src/providers/free-sports-types";
import { applyVerifiedHistoricalMatches } from "../src/services/verified-historical-results";

const fallbackMatches = fallback.matches as NormalizedGroupMatch[];

test("restaura los 10 resultados verificados de la Jornada 1 del Grupo II", () => {
  const restored = applyVerifiedHistoricalMatches(fallbackMatches);
  const roundOne = restored.filter((match) => match.round === 1);
  const finished = roundOne.filter(
    (match) => match.status === "finished" && Boolean(match.score),
  );

  assert.equal(roundOne.length, 10);
  assert.equal(finished.length, 10);

  const standings = new ComputedStandingsProvider().compute(finished);
  assert.equal(standings.length, 20);
  assert.ok(standings.every((entry) => entry.played === 1));

  const zaragoza = standings.find((entry) => entry.team.id === "real-zaragoza");
  const huesca = standings.find((entry) => entry.team.id === "sd-huesca");
  const cartagena = standings.find((entry) => entry.team.id === "fc-cartagena");

  assert.deepEqual(
    { played: zaragoza?.played, points: zaragoza?.points },
    { played: 1, points: 0 },
  );
  assert.deepEqual(
    { played: huesca?.played, points: huesca?.points },
    { played: 1, points: 3 },
  );
  assert.deepEqual(
    { played: cartagena?.played, points: cartagena?.points },
    { played: 1, points: 3 },
  );
});
