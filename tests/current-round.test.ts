import assert from "node:assert/strict";
import test from "node:test";
import type { Match } from "../src/domain/models";
import { requireGroupTwoTeam } from "../src/data/primera-federacion-teams";
import { selectCurrentRoundMatches } from "../src/services/current-round";

const competition = {
  id: "primera-federacion-group-2-2026-27",
  name: "Primera Federación · Grupo II",
  shortName: "Primera Federación",
  season: "2026/27",
};
const source = {
  id: "rfef-calendar-pdf",
  name: "RFEF",
  url: "https://rfef.es/",
  fetchedAt: "2026-09-05T08:00:00.000Z",
  isOfficial: true,
};

function match(
  id: string,
  round: number,
  dateBase: string,
  status: Match["status"],
): Match {
  return {
    id,
    competition,
    round: `Jornada ${round}`,
    dateBase,
    startsAt: `${dateBase}T12:00:00+02:00`,
    scheduleStatus: "unknown",
    status,
    homeTeam: requireGroupTwoTeam("Real Zaragoza"),
    awayTeam: requireGroupTwoTeam("Antequera CF"),
    score: status === "finished" ? { home: 1, away: 0 } : undefined,
    source,
    updatedAt: source.fetchedAt,
  };
}

test("muestra la jornada 2 cuando la jornada 1 ya terminó", () => {
  const selection = selectCurrentRoundMatches(
    [
      match("j1", 1, "2026-08-30", "finished"),
      match("j2", 2, "2026-09-06", "scheduled"),
    ],
    "2026-09-05",
  );

  assert.equal(selection.roundLabel, "Jornada 2");
  assert.deepEqual(selection.matches.map((entry) => entry.id), ["j2"]);
});

test("prioriza la jornada que tiene un partido en vivo", () => {
  const selection = selectCurrentRoundMatches(
    [
      match("j2-live", 2, "2026-09-05", "live"),
      match("j3", 3, "2026-09-13", "scheduled"),
    ],
    "2026-09-05",
  );

  assert.equal(selection.roundLabel, "Jornada 2");
  assert.deepEqual(selection.matches.map((entry) => entry.id), ["j2-live"]);
});
