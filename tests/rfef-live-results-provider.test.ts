import assert from "node:assert/strict";
import test from "node:test";
import {
  requireGroupOneTeam,
  requireGroupTwoTeam,
} from "../src/data/primera-federacion-teams";
import type { SourceReference } from "../src/domain/models";
import type { NormalizedGroupMatch } from "../src/providers/free-sports-types";
import { parseRfefResultsHtml } from "../src/providers/rfef-live-results-provider";

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
