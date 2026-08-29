import assert from "node:assert/strict";
import test from "node:test";
import {
  requireGroupTwoTeam,
} from "../src/data/primera-federacion-teams";
import type { SourceReference } from "../src/domain/models";
import type {
  FreeSportsInspection,
  NormalizedGroupMatch,
} from "../src/providers/free-sports-types";
import { sanitizeSportsSnapshot } from "../src/services/sports-snapshot-sanitizer";

const calendarSource: SourceReference = {
  id: "rfef-calendar-pdf",
  name: "Calendario oficial RFEF",
  url: "https://rfef.es/calendar.pdf",
  fetchedAt: "2026-08-29T20:00:00.000Z",
  isOfficial: true,
};

const articleSource: SourceReference = {
  id: "rfef-results-article",
  name: "RFEF · resultados de la jornada",
  url: "https://rfef.es/jornada-1",
  fetchedAt: "2026-08-29T21:30:00.000Z",
  isOfficial: true,
};

function fixture(
  id: string,
  round: number,
  startsAt: string,
  homeName: string,
  awayName: string,
): NormalizedGroupMatch {
  return {
    id,
    round,
    roundLabel: `Jornada ${round}`,
    dateBase: startsAt.slice(0, 10),
    startsAt,
    kickoffStatus: "confirmed",
    homeTeam: requireGroupTwoTeam(homeName),
    awayTeam: requireGroupTwoTeam(awayName),
    score: { home: 1, away: 3 },
    status: "finished",
    sources: [articleSource, calendarSource],
    updatedAt: articleSource.fetchedAt,
  };
}

test("un resultado de la ida no cuenta también como partido de vuelta futuro", () => {
  const firstLeg = fixture(
    "j1-algeciras-cartagena",
    1,
    "2026-08-29T19:15:00+02:00",
    "Algeciras CF",
    "FC Cartagena",
  );
  const falseReturnLeg = fixture(
    "j20-cartagena-algeciras",
    20,
    "2027-01-17T12:00:00+01:00",
    "FC Cartagena",
    "Algeciras CF",
  );

  const snapshot: FreeSportsInspection = {
    provider: "free-web",
    syncedAt: "2026-08-29T21:35:00.000Z",
    requestCount: 1,
    diagnostics: [],
    matches: [firstLeg, falseReturnLeg],
    groupOneMatches: [],
    zaragozaMatches: [],
    standings: [],
    groupOneStandings: [],
    publishedStandings: undefined,
    differences: [],
    reviewRequired: false,
  };

  const sanitized = sanitizeSportsSnapshot(snapshot, {
    now: new Date("2026-08-29T23:35:00+02:00"),
  });

  const returnLeg = sanitized.matches.find((match) => match.round === 20)!;
  assert.equal(returnLeg.status, "scheduled");
  assert.equal(returnLeg.score, undefined);

  const algeciras = sanitized.standings.find(
    (entry) => entry.team.id === "algeciras-cf",
  )!;
  const cartagena = sanitized.standings.find(
    (entry) => entry.team.id === "fc-cartagena",
  )!;

  assert.equal(algeciras.played, 1);
  assert.equal(algeciras.points, 0);
  assert.equal(cartagena.played, 1);
  assert.equal(cartagena.points, 3);
});
