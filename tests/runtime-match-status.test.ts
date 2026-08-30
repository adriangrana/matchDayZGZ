import assert from "node:assert/strict";
import test from "node:test";
import type { Match } from "../src/domain/models";
import { withRuntimeMatchStatus } from "../src/services/runtime-match-status";

const baseMatch: Match = {
  id: "barakaldo-cultural-j1",
  competition: {
    id: "primera-federacion-group-1-2026-27",
    name: "Primera Federación · Grupo I",
    shortName: "Primera Federación",
    season: "2026/27",
  },
  round: "Jornada 1",
  dateBase: "2026-08-30",
  startsAt: "2026-08-30T17:00:00+02:00",
  scheduleStatus: "confirmed",
  status: "scheduled",
  homeTeam: {
    id: "barakaldo-cf",
    name: "Barakaldo CF",
    shortName: "Barakaldo CF",
    abbreviation: "BAR",
  },
  awayTeam: {
    id: "cyd-leonesa",
    name: "Cultural Leonesa",
    shortName: "Cultural Leonesa",
    abbreviation: "CUL",
  },
  source: {
    id: "rfef-calendar-pdf",
    name: "RFEF",
    url: "https://rfef.es/",
    fetchedAt: "2026-08-30T14:00:00.000Z",
    isOfficial: true,
  },
  updatedAt: "2026-08-30T14:00:00.000Z",
};

test("un partido confirmado se muestra en vivo aunque el snapshot siga scheduled", () => {
  const match = withRuntimeMatchStatus(
    baseMatch,
    new Date("2026-08-30T18:39:00+02:00"),
  );
  assert.equal(match.status, "live");
  assert.equal(match.score, undefined);
});

test("no se inventa un directo antes del saque inicial", () => {
  const match = withRuntimeMatchStatus(
    baseMatch,
    new Date("2026-08-30T16:59:00+02:00"),
  );
  assert.equal(match.status, "scheduled");
});

test("un resultado final nunca se degrada a live", () => {
  const match = withRuntimeMatchStatus(
    { ...baseMatch, status: "finished", score: { home: 0, away: 0 } },
    new Date("2026-08-30T18:39:00+02:00"),
  );
  assert.equal(match.status, "finished");
  assert.deepEqual(match.score, { home: 0, away: 0 });
});
