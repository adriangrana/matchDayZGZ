import assert from "node:assert/strict";
import test from "node:test";
import fallback from "../src/data/rfef-group-2-2026-27.json";
import { classifyRoundKickoffs } from "../src/providers/as-primera-federacion-provider";
import { ComputedStandingsProvider } from "../src/providers/computed-standings-provider";
import type { NormalizedGroupMatch } from "../src/providers/free-sports-types";
import { parseOfficialMatchesHtml } from "../src/providers/real-zaragoza-official-provider";
import {
  parseRfefCalendarLines,
  validateRfefCalendar,
} from "../src/providers/rfef-pdf-calendar-provider";
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

