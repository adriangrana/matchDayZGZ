import assert from "node:assert/strict";
import test from "node:test";
import {
  ApiFootballProvider,
  type ApiFootballTransport,
} from "../src/providers/api-football-provider";
import type { SportsProviderMetadata } from "../src/services/sports-state-store";

const metadata: SportsProviderMetadata = {
  teamId: 732,
  teamName: "Real Zaragoza",
  leagueId: 999,
  leagueName: "Primera División RFEF - Group 2",
  season: 2026,
};

const fixtures = [
  {
    fixture: {
      id: 1001,
      date: "2026-08-30T17:00:00+00:00",
      timestamp: 1788109200,
      venue: { name: "Ibercaja Estadio" },
      status: { short: "NS" },
    },
    league: {
      id: 999,
      name: "Primera División RFEF - Group 2",
      season: 2026,
      round: "Regular Season - 1",
    },
    teams: {
      home: { id: 732, name: "Real Zaragoza" },
      away: { id: 450, name: "Real Murcia CF" },
    },
    goals: { home: null, away: null },
  },
  {
    fixture: {
      id: 1000,
      date: "2026-05-31T17:00:00+00:00",
      timestamp: 1780256400,
      venue: { name: "Ibercaja Estadio" },
      status: { short: "FT" },
    },
    league: {
      id: 141,
      name: "Segunda División",
      season: 2025,
      round: "Regular Season - 42",
    },
    teams: {
      home: { id: 732, name: "Real Zaragoza" },
      away: { id: 600, name: "Málaga CF" },
    },
    goals: { home: 2, away: 1 },
  },
];

const standings = [
  {
    league: {
      id: 999,
      name: "Primera División RFEF - Group 2",
      season: 2026,
      standings: [
        [
          {
            rank: 1,
            team: { id: 450, name: "Real Murcia CF" },
            points: 3,
            goalsDiff: 2,
            all: { played: 1, win: 1, draw: 0, lose: 0 },
          },
          {
            rank: 7,
            team: { id: 732, name: "Real Zaragoza" },
            points: 1,
            goalsDiff: 0,
            all: { played: 1, win: 0, draw: 1, lose: 0 },
          },
        ],
      ],
    },
  },
];

class FixtureTransport implements ApiFootballTransport {
  async get(endpoint: string): Promise<unknown> {
    if (endpoint === "fixtures") return fixtures;
    if (endpoint === "standings") return standings;
    throw new Error(`Endpoint inesperado: ${endpoint}`);
  }
}

test("normaliza partidos sin incorporar imágenes de API-Football", async () => {
  const provider = new ApiFootballProvider(new FixtureTransport(), {
    season: 2026,
    teamId: metadata.teamId,
    leagueId: metadata.leagueId,
  });
  const matches = await provider.getMatchesFor(metadata, {
    now: new Date("2026-07-28T08:00:00.000Z"),
  });

  assert.equal(matches.length, 2);
  assert.equal(matches[0]?.status, "finished");
  assert.deepEqual(matches[0]?.score, { home: 2, away: 1 });
  assert.equal(matches[1]?.homeTeam.id, "real-zaragoza");
  assert.equal(matches[1]?.awayTeam.shortName, "Real Murcia");
  assert.equal(matches[1]?.competition.season, "2026/27");
  assert.equal(matches[1]?.source.id, "api-football");
  assert.equal(matches[1]?.homeTeam.crestUrl, undefined);
  assert.equal(matches[1]?.awayTeam.crestUrl, undefined);
});

test("normaliza y ordena la clasificación de Primera Federación", async () => {
  const provider = new ApiFootballProvider(new FixtureTransport(), {
    season: 2026,
    teamId: metadata.teamId,
    leagueId: metadata.leagueId,
  });
  const entries = await provider.getStandingsFor(metadata, {
    now: new Date("2026-07-28T08:00:00.000Z"),
  });

  assert.equal(entries.length, 2);
  assert.equal(entries[0]?.position, 1);
  assert.equal(entries[0]?.won, 1);
  assert.equal(entries[1]?.team.id, "real-zaragoza");
  assert.equal(entries[1]?.points, 1);
  assert.equal(entries[1]?.goalDifference, 0);
  assert.equal(entries[1]?.team.crestUrl, undefined);
});

