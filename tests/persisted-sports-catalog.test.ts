import assert from "node:assert/strict";
import test from "node:test";
import fallback from "../src/data/rfef-group-2-2026-27.json";
import { ComputedStandingsProvider } from "../src/providers/computed-standings-provider";
import type {
  FreeSportsInspection,
  NormalizedGroupMatch,
  SourceDiagnostic,
} from "../src/providers/free-sports-types";
import { catalogFromInspection } from "../src/services/persisted-sports-catalog";

const syncedAt = "2026-08-01T08:00:00.000Z";

function diagnostic(
  overrides: Partial<SourceDiagnostic> = {},
): SourceDiagnostic {
  return {
    id: "rfef-calendar-pdf",
    name: "Calendario oficial RFEF",
    url: "https://rfef.example/calendar.pdf",
    policyStatus: "allowed",
    httpStatus: 200,
    cache: "revalidated",
    extracted: { matches: 380, standings: 0 },
    placeholderKickoffsDiscarded: 0,
    checkedAt: syncedAt,
    ...overrides,
  };
}

function inspection(
  diagnostics: SourceDiagnostic[],
): FreeSportsInspection {
  const matches = structuredClone(
    fallback.matches,
  ) as NormalizedGroupMatch[];
  const zaragozaMatch = matches.find(
    (match) =>
      match.homeTeam.id === "real-zaragoza" ||
      match.awayTeam.id === "real-zaragoza",
  )!;
  zaragozaMatch.startsAt = "2026-08-30T19:30:00.000Z";
  zaragozaMatch.kickoffStatus = "confirmed";
  zaragozaMatch.updatedAt = syncedAt;

  return {
    provider: "free-web",
    syncedAt,
    requestCount: 2,
    diagnostics,
    matches,
    zaragozaMatches: matches.filter(
      (match) =>
        match.homeTeam.id === "real-zaragoza" ||
        match.awayTeam.id === "real-zaragoza",
    ),
    standings: new ComputedStandingsProvider().compute([]),
    differences: [],
    reviewRequired: false,
  };
}

test("la interfaz consume el snapshot deportivo persistido más reciente", () => {
  const snapshot = catalogFromInspection(
    inspection([
      diagnostic(),
      diagnostic({
        id: "real-zaragoza-official-partidos",
        name: "Real Zaragoza /partidos",
        url: "https://www.realzaragoza.com/partidos",
        extracted: { matches: 1, standings: 0 },
      }),
    ]),
  );

  assert.equal(snapshot.generatedAt, syncedAt);
  assert.equal(snapshot.stale, false);
  assert.equal(snapshot.matches.length, 38);
  assert.equal(
    snapshot.matches.some(
      (match) =>
        match.scheduleStatus === "confirmed" &&
        match.updatedAt === syncedAt,
    ),
    true,
  );
});

test("marca como desactualizado el último snapshot si falla una fuente esencial", () => {
  const snapshot = catalogFromInspection(
    inspection([
      diagnostic({
        policyStatus: "unavailable",
        cache: "stale",
        error: "Tiempo de espera agotado",
      }),
    ]),
  );

  assert.equal(snapshot.stale, true);
  assert.match(snapshot.sourceErrors[0]!, /Tiempo de espera agotado/);
  assert.equal(snapshot.matches.length, 38);
});
