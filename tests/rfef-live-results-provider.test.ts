import assert from "node:assert/strict";
import test from "node:test";
import {
  requireGroupOneTeam,
  requireGroupTwoTeam,
} from "../src/data/primera-federacion-teams";
import type { SourceReference } from "../src/domain/models";
import type { NormalizedGroupMatch } from "../src/providers/free-sports-types";
import {
  parseRfefRoundArticleHtml,
  parseRfefResultsHtml,
  parseSofascoreLivePayload,
  rfefRoundArticleUrl,
  selectRfefArticleRound,
} from "../src/providers/rfef-live-results-provider";

const source: SourceReference = {
  id: "rfef-live-scoreboard",
  name: "Marcadores RFEF · ATR",
  url: "https://marcadores.rfef.es/pnfg/?accion=1",
  fetchedAt: "2026-08-29T19:00:00.000Z",
  isOfficial: true,
};

function match(
  home: ReturnType<typeof requireGroupTwoTeam>,
  away: ReturnType<typeof requireGroupTwoTeam>,
  startsAt: string,
): NormalizedGroupMatch {
  return {
    id: `test-${home.id}-${away.id}`,
    round: 1,
    roundLabel: "Jornada 1",
    dateBase: startsAt.slice(0, 10),
    startsAt,
    kickoffStatus: "confirmed",
    homeTeam: home,
    awayTeam: away,
    status: "scheduled",
    sources: [source],
    updatedAt: source.fetchedAt,
  };
}

test("extrae un marcador ATR en vivo", () => {
  const fixture = match(
    requireGroupTwoTeam("SD Huesca"),
    requireGroupTwoTeam("UE Sant Andreu"),
    "2026-08-29T19:15:00+02:00",
  );
  const html = `
    <table>
      <tr>
        <td>SD Huesca</td><td>1 - 0</td><td>UE Sant Andreu</td><td>72 min</td>
      </tr>
    </table>
  `;

  const [patch] = parseRfefResultsHtml(html, [fixture], source, {
    now: new Date("2026-08-29T20:45:00+02:00"),
  });

  assert.deepEqual(patch?.score, { home: 1, away: 0 });
  assert.equal(patch?.status, "live");
});

test("usa el feed live de respaldo para Hércules - Real Murcia", () => {
  const fixture = match(
    requireGroupTwoTeam("Hércules de Alicante CF"),
    requireGroupTwoTeam("Real Murcia CF"),
    "2026-08-29T21:30:00+02:00",
  );
  const fallbackSource: SourceReference = {
    id: "sofascore-live-fallback",
    name: "Sofascore · respaldo en vivo",
    url: "https://api.sofascore.com/api/v1/sport/football/events/live",
    fetchedAt: "2026-08-29T20:32:00.000Z",
  };

  const [patch] = parseSofascoreLivePayload(
    {
      events: [
        {
          startTimestamp: Math.floor(
            new Date("2026-08-29T21:30:00+02:00").getTime() / 1_000,
          ),
          status: { type: "inprogress", description: "2nd half" },
          homeTeam: { name: "Hércules CF" },
          awayTeam: { name: "Real Murcia" },
          homeScore: { current: 1 },
          awayScore: { current: 0 },
        },
      ],
    },
    [fixture],
    fallbackSource,
  );

  assert.equal(patch?.status, "live");
  assert.deepEqual(patch?.score, { home: 1, away: 0 });
  assert.equal(patch?.homeTeamName, "Hércules de Alicante CF");
  assert.equal(patch?.awayTeamName, "Real Murcia CF");
});

test("marca como final un resultado publicado por RFEF", () => {
  const home = requireGroupOneTeam("UD Ourense");
  const away = requireGroupOneTeam("SD Ponferradina");
  const fixture: NormalizedGroupMatch = {
    id: "test-ourense-ponferradina",
    round: 1,
    roundLabel: "Jornada 1",
    dateBase: "2026-08-29",
    startsAt: "2026-08-29T17:00:00+02:00",
    kickoffStatus: "confirmed",
    homeTeam: home,
    awayTeam: away,
    status: "scheduled",
    sources: [source],
    updatedAt: source.fetchedAt,
  };
  const html = `<tr><td>UD Ourense 0 - 1 SD Ponferradina</td></tr>`;

  const [patch] = parseRfefResultsHtml(html, [fixture], source, {
    now: new Date("2026-08-29T19:30:00+02:00"),
    finalOnly: true,
  });

  assert.deepEqual(patch?.score, { home: 0, away: 1 });
  assert.equal(patch?.status, "finished");
});

test("extrae los horarios oficiales de ambos grupos desde la jornada vigente", () => {
  const groupOne = match(
    requireGroupOneTeam("CD Mirandés"),
    requireGroupOneTeam("UD Ourense"),
    "2026-09-06T12:00:00+02:00",
  );
  const groupTwo = match(
    requireGroupTwoTeam("Real Zaragoza"),
    requireGroupTwoTeam("Antequera CF"),
    "2026-09-06T12:00:00+02:00",
  );
  for (const fixture of [groupOne, groupTwo]) {
    fixture.round = 2;
    fixture.roundLabel = "Jornada 2";
    fixture.dateBase = "2026-09-06";
    fixture.kickoffStatus = "unknown";
  }
  const html = `
    <table>
      <tr><td>Sábado 05 de septiembre</td><td>16:30</td><td>CD Mirandés - UD Ourense</td><td>RESUMEN</td></tr>
      <tr><td>Sábado 05 de septiembre</td><td>21:00</td><td>Real Zaragoza - Antequera CF</td><td>RESUMEN</td></tr>
    </table>
  `;
  const patches = parseRfefRoundArticleHtml(html, [groupOne, groupTwo], source);

  assert.equal(patches.length, 2);
  assert.equal(patches[0]?.startsAt, "2026-09-05T14:30:00.000Z");
  assert.equal(patches[1]?.startsAt, "2026-09-05T19:00:00.000Z");
  assert.ok(patches.every((patch) => patch.kickoffStatus === "confirmed"));
});

test("selecciona y construye la URL de la jornada más cercana", () => {
  const first = match(
    requireGroupTwoTeam("Gimnàstic de Tarragona"),
    requireGroupTwoTeam("Real Zaragoza"),
    "2026-08-30T12:00:00+02:00",
  );
  const second = match(
    requireGroupTwoTeam("Real Zaragoza"),
    requireGroupTwoTeam("Antequera CF"),
    "2026-09-06T12:00:00+02:00",
  );
  second.round = 2;
  second.roundLabel = "Jornada 2";
  second.dateBase = "2026-09-06";

  assert.equal(
    selectRfefArticleRound([first, second], new Date("2026-09-05T12:00:00Z")),
    2,
  );
  assert.equal(
    rfefRoundArticleUrl(2),
    "https://rfef.es/es/noticias/resumenes-vive-la-jornada-2-de-primera-federacion",
  );
});
