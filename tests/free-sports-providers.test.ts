import assert from "node:assert/strict";
import test from "node:test";
import fallback from "../src/data/rfef-group-2-2026-27.json";
import { groupOneTeamNames } from "../src/data/primera-federacion-teams";
import { classifyRoundKickoffs } from "../src/providers/as-primera-federacion-provider";
import { ComputedStandingsProvider } from "../src/providers/computed-standings-provider";
import type { NormalizedGroupMatch } from "../src/providers/free-sports-types";
import { parseOfficialMatchesHtml } from "../src/providers/real-zaragoza-official-provider";
import {
  parseRfefCalendarLines,
  parseRfefCalendarLinesForGroup,
  validateRfefCalendar,
} from "../src/providers/rfef-pdf-calendar-provider";
import {
  mergeOfficialPatches,
  mergePersistedMatchFacts,
  mergeRfefFacts,
} from "../src/services/free-sports-aggregator";
import { isPathAllowedByRobots } from "../src/services/robots-policy";

const fallbackMatches = fallback.matches as NormalizedGroupMatch[];

function calendarLines(): string[] {
  const lines: string[] = [];
  for (let round = 1; round <= 38; round += 1) {
    const matches = fallbackMatches.filter((match) => match.round === round);
    const [year, month, day] = matches[0]!.dateBase.split("-");
    lines.push(`Jornada ${round} (${day}/${month}/${year})`);
    matches.forEach((match) => {
      lines.push(`${match.homeTeam.name} ${match.awayTeam.name}`);
    });
  }
  return lines;
}

test("extrae y valida las 38 jornadas completas del calendario RFEF", () => {
  const matches = parseRfefCalendarLines(
    calendarLines(),
    "2026-07-28T08:00:00.000Z",
  );

  assert.equal(matches.length, 380);
  assert.equal(
    matches.filter(
      (match) =>
        match.homeTeam.id === "real-zaragoza" ||
        match.awayTeam.id === "real-zaragoza",
    ).length,
    38,
  );
  assert.equal(matches[0]?.kickoffStatus, "unknown");
});

test("extrae y valida las 38 jornadas completas del Grupo I", () => {
  const lines: string[] = [];
  for (let round = 1; round <= 38; round += 1) {
    lines.push(`Jornada ${round} (30/08/2026)`);
    for (let index = 0; index < 10; index += 1) {
      const home = groupOneTeamNames[(index + round) % 10]!;
      const away = groupOneTeamNames[10 + ((index + round) % 10)]!;
      lines.push(`${home} ${away}`);
    }
  }
  const matches = parseRfefCalendarLinesForGroup(
    lines,
    "group-1",
    "2026-08-29T12:00:00.000Z",
  );
  assert.equal(matches.length, 380);
  assert.equal(
    new Set(matches.flatMap((match) => [match.homeTeam.id, match.awayTeam.id])).size,
    20,
  );
  assert.equal(matches.some((match) => match.homeTeam.id === "real-zaragoza"), false);
});

test("rechaza una revisión incompleta del PDF y conserva el fallback", () => {
  assert.throws(
    () => validateRfefCalendar(fallbackMatches.slice(0, -1)),
    /379\/380/,
  );
});

test("descarta 02:00 cuando toda la jornada usa el mismo placeholder", () => {
  const kickoffs = classifyRoundKickoffs(Array.from({ length: 10 }, () => "02:00"));

  assert.equal(
    kickoffs.filter((kickoff) => kickoff.discardedAsPlaceholder).length,
    10,
  );
  assert.ok(kickoffs.every((kickoff) => kickoff.value === undefined));
  assert.ok(kickoffs.every((kickoff) => kickoff.status === "provisional"));
});

test("aplica al Grupo II los horarios confirmados de la jornada", () => {
  const merged = mergeRfefFacts(
    fallbackMatches,
    "2026-08-29T14:00:00.000Z",
  );
  const huesca = merged.find(
    (match) =>
      match.round === 1 &&
      match.homeTeam.name === "SD Huesca" &&
      match.awayTeam.name === "UE Sant Andreu",
  );
  const europa = merged.find(
    (match) =>
      match.round === 1 &&
      match.homeTeam.name === "CE Europa" &&
      match.awayTeam.name === "Real Jaén CF",
  );

  assert.ok(huesca);
  assert.equal(huesca.kickoffStatus, "confirmed");
  assert.equal(huesca.startsAt, "2026-08-29T19:15:00+02:00");
  assert.ok(europa);
  assert.equal(europa.kickoffStatus, "confirmed");
  assert.equal(europa.startsAt, "2026-08-30T19:15:00+02:00");
});

test("fusiona la variante oficial de Juventud Torremolinos sin duplicar la jornada", () => {
  const calendarMatch = structuredClone(
    fallbackMatches.find(
      (match) =>
        match.round === 3 &&
        match.homeTeam.id === "juventud-de-torremolinos-cf" &&
        match.awayTeam.id === "real-zaragoza",
    )!,
  );
  const merged = mergeOfficialPatches([calendarMatch], [
    {
      round: 3,
      homeTeamName: "Juventud Torremolinos CF",
      awayTeamName: "Real Zaragoza",
      startsAt: "2026-09-13T14:00:00.000Z",
      kickoffStatus: "confirmed",
      status: "scheduled",
      source: {
        id: "real-zaragoza-official",
        name: "Real Zaragoza",
        url: "https://www.realzaragoza.com/partidos",
        fetchedAt: "2026-09-02T12:00:00.000Z",
        isOfficial: true,
      },
    },
  ]);

  assert.equal(merged.length, 1);
  assert.equal(merged[0]?.id, calendarMatch.id);
  assert.equal(merged[0]?.kickoffStatus, "confirmed");
  assert.equal(merged[0]?.startsAt, "2026-09-13T14:00:00.000Z");
  assert.deepEqual(
    merged[0]?.sources.map((source) => source.id),
    ["real-zaragoza-official", "rfef-calendar-pdf"],
  );
});

test("conserva horarios y resultados válidos del snapshot anterior", () => {
  const calendarMatch = structuredClone(fallbackMatches[0]!);
  const persisted = {
    ...structuredClone(calendarMatch),
    startsAt: "2026-08-29T17:00:00.000Z",
    kickoffStatus: "confirmed" as const,
    status: "finished" as const,
    score: { home: 2, away: 2 },
  };
  const [merged] = mergePersistedMatchFacts([calendarMatch], [persisted]);

  assert.equal(merged?.startsAt, persisted.startsAt);
  assert.equal(merged?.kickoffStatus, "confirmed");
  assert.equal(merged?.status, "finished");
  assert.deepEqual(merged?.score, { home: 2, away: 2 });
});

test("extrae solo hechos mínimos de una tarjeta oficial sintética", () => {
  const html = `
    <article class="MkFootballMatchCard MkFootballMatchCard--status-pending"
      aria-label="Real Zaragoza vs Antequera CF">
      <span class="MkFootballMatchCard__competition">Primera Federación</span>
      <span class="MkFootballMatchCard__matchWeek">J2</span>
      <span class="MkFootballMatchCard__venue">Ibercaja Estadio</span>
      <time dateTime="2026-09-06T18:30:00+02:00">18:30</time>
      <img src="https://example.invalid/escudo.png" alt="No usar">
    </article>
  `;

  const patches = parseOfficialMatchesHtml(
    html,
    "https://www.realzaragoza.com/partidos",
    "2026-07-28T08:00:00.000Z",
  );

  assert.equal(patches.length, 1);
  assert.equal(patches[0]?.round, 2);
  assert.equal(patches[0]?.kickoffStatus, "confirmed");
  assert.equal(patches[0]?.venue, "Ibercaja Estadio");
  assert.equal(JSON.stringify(patches).includes("escudo.png"), false);
});

test("extrae el horario desde el JSON embebido de la página oficial", () => {
  const html = `
    <article class="MkFootballMatchCard MkFootballMatchCard--status-pending"
      aria-label="Gimnàstic de Tarragona vs Real Zaragoza">
      <span class="MkFootballMatchCard__competition">Primera Federación</span>
      <span class="MkFootballMatchCard__matchWeek">J1</span>
      <span class="MkFootballMatchCard__venue">Nou Estadi Costa Daurada</span>
      {"homeTeam":{"shortName":"Gimnàstic de Tarragona"},
       "awayTeam":{"shortName":"Real Zaragoza"},
       "date":"2026-08-30","time":"2026-08-30T19:30:00Z"}
    </article>
  `;

  const patches = parseOfficialMatchesHtml(
    html,
    "https://www.realzaragoza.com/partidos",
    "2026-08-05T09:18:31.000Z",
  );

  assert.equal(patches.length, 1);
  assert.equal(patches[0]?.kickoffStatus, "confirmed");
  assert.equal(patches[0]?.startsAt, "2026-08-30T19:30:00.000Z");
});

test("mantiene pendiente el horario JSON de medianoche usado como placeholder", () => {
  const html = `
    <article class="MkFootballMatchCard MkFootballMatchCard--status-pending"
      aria-label="Real Zaragoza vs Antequera CF">
      <span class="MkFootballMatchCard__competition">Primera Federación</span>
      <span class="MkFootballMatchCard__matchWeek">J2</span>
      {"homeTeam":{"shortName":"Real Zaragoza"},
       "awayTeam":{"shortName":"Antequera CF"},
       "date":"2026-09-06","time":"2026-09-06T00:00:00Z"}
    </article>
  `;

  const patches = parseOfficialMatchesHtml(
    html,
    "https://www.realzaragoza.com/partidos",
    "2026-08-05T09:18:31.000Z",
  );

  assert.equal(patches[0]?.kickoffStatus, "unknown");
  assert.equal(patches[0]?.startsAt, undefined);
});

test("calcula PJ, victorias, empates, goles y puntos localmente", () => {
  const first = structuredClone(fallbackMatches[0]!);
  const second = structuredClone(fallbackMatches[1]!);
  first.status = "finished";
  first.score = { home: 2, away: 1 };
  second.status = "finished";
  second.score = { home: 0, away: 0 };

  const standings = new ComputedStandingsProvider().compute([first, second]);
  const winner = standings.find(
    (entry) => entry.team.id === first.homeTeam.id,
  )!;
  const drawingTeam = standings.find(
    (entry) => entry.team.id === second.homeTeam.id,
  )!;

  assert.deepEqual(
    {
      played: winner.played,
      won: winner.won,
      goalsFor: winner.goalsFor,
      goalsAgainst: winner.goalsAgainst,
      points: winner.points,
    },
    { played: 1, won: 1, goalsFor: 2, goalsAgainst: 1, points: 3 },
  );
  assert.equal(drawingTeam.drawn, 1);
  assert.equal(drawingTeam.points, 1);
});

test("respeta allow y disallow del grupo wildcard de robots.txt", () => {
  const robots = `
    User-agent: *
    Disallow: /api/
    Allow: /api/public/
  `;

  assert.equal(isPathAllowedByRobots(robots, "/partidos"), true);
  assert.equal(isPathAllowedByRobots(robots, "/api/private"), false);
  assert.equal(isPathAllowedByRobots(robots, "/api/public/table"), true);
});
