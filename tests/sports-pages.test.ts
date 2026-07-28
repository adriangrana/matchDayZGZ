import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import fallback from "../src/data/rfef-group-2-2026-27.json";
import type { NormalizedGroupMatch } from "../src/providers/free-sports-types";
import {
  filterMatches,
  filterMatchesByCriteria,
  groupMatches,
} from "../src/services/match-filters";
import { matchOutcome } from "../src/components/matches-explorer";
import {
  createSportsCatalogSnapshot,
  getSportsCatalogSnapshot,
} from "../src/services/sports-catalog";
import { getFreeSportsDashboardSnapshot } from "../src/services/free-sports-dashboard";
import {
  isConfirmedKickoff,
  kickoffLabel,
  matchDateLabel,
  venueLabel,
} from "../src/services/sports-presenter";
import { isAllowedRemoteImageUrl } from "../src/services/image-validation";

const normalized = fallback.matches as NormalizedGroupMatch[];

test("/partidos recibe los 38 partidos del Real Zaragoza", () => {
  const snapshot = getSportsCatalogSnapshot();

  assert.equal(snapshot.matches.length, 38);
  assert.ok(
    snapshot.matches.every(
      (match) =>
        match.homeTeam.id === "real-zaragoza" ||
        match.awayTeam.id === "real-zaragoza",
    ),
  );
});

test("los filtros distinguen estado, localía y competición", () => {
  const matches = getSportsCatalogSnapshot().matches;

  assert.equal(filterMatches(matches, "all", "all").length, 38);
  assert.equal(filterMatches(matches, "league", "all").length, 38);
  assert.equal(filterMatches(matches, "cup", "all").length, 0);
  assert.equal(filterMatches(matches, "friendly", "all").length, 0);
  assert.equal(filterMatches(matches, "all", "home").length, 19);
  assert.equal(filterMatches(matches, "all", "away").length, 19);
  assert.equal(filterMatches(matches, "all", "finished").length, 0);
  assert.equal(filterMatches(matches, "all", "upcoming").length, 38);
  assert.equal(groupMatches(matches, "round").length, 38);
  assert.ok(groupMatches(matches, "month").length > 1);
  assert.equal(
    filterMatchesByCriteria(matches, "league", "upcoming", "home").length,
    19,
  );
  assert.equal(
    filterMatchesByCriteria(matches, "league", "upcoming", "away").length,
    19,
  );
});

test("Inicio limita próximos y resultados a tres", () => {
  const dashboard = getFreeSportsDashboardSnapshot(
    new Date("2026-07-28T10:00:00Z"),
  )!;

  assert.ok(dashboard.upcomingMatches.length <= 3);
  assert.ok(dashboard.recentMatches.length <= 3);
});

test("las horas base del PDF nunca llegan como horario a la interfaz", () => {
  const matches = getSportsCatalogSnapshot().matches;

  for (const match of matches) {
    assert.equal(isConfirmedKickoff(match), false);
    assert.doesNotMatch(match.startsAt, /T\d{2}:\d{2}/);
    assert.equal(kickoffLabel(match), "Horario pendiente");
    assert.doesNotMatch(kickoffLabel(match), /00:00|02:00|12:00/);
    assert.match(matchDateLabel(match), /^Fin de semana del /);
  }
});

test("la pretemporada no asigna posiciones arbitrarias", () => {
  const snapshot = getSportsCatalogSnapshot();

  assert.equal(snapshot.standingsStatus, "preseason");
  assert.equal(snapshot.standings.length, 20);
  assert.ok(snapshot.standings.every((entry) => entry.position === 0));
  assert.ok(snapshot.standings.every((entry) => entry.played === 0));
});

test("un partido visitante no inventa Zaragoza como ciudad o estadio", () => {
  const match = getSportsCatalogSnapshot().matches.find(
    (candidate) =>
      candidate.homeTeam.id === "gimnastic-de-tarragona" &&
      candidate.awayTeam.id === "real-zaragoza",
  );

  assert.ok(match);
  assert.equal(venueLabel(match), "Nou Estadi Costa Daurada");
  assert.doesNotMatch(venueLabel(match), /Zaragoza/i);
});

test("la tabla completa se calcula cuando existen los 380 resultados", () => {
  const completed = normalized.map((match) => ({
    ...structuredClone(match),
    status: "finished" as const,
    score: { home: 1, away: 0 },
  }));
  const snapshot = createSportsCatalogSnapshot(
    completed,
    "2027-05-31T12:00:00Z",
  );

  assert.equal(snapshot.standingsStatus, "complete");
  assert.equal(snapshot.missingGroupResults, 0);
  assert.equal(snapshot.standings.length, 20);
  assert.ok(snapshot.standings.every((entry) => entry.played === 38));
  assert.deepEqual(
    snapshot.standings.map((entry) => entry.position),
    Array.from({ length: 20 }, (_, index) => index + 1),
  );
});

test("los resultados simulados distinguen victoria, empate y derrota sin depender solo del color", () => {
  const base = getSportsCatalogSnapshot().matches[0]!;
  const zaragozaIsHome = base.homeTeam.id === "real-zaragoza";
  const scores = zaragozaIsHome
    ? [
        { home: 2, away: 0 },
        { home: 1, away: 1 },
        { home: 0, away: 2 },
      ]
    : [
        { home: 0, away: 2 },
        { home: 1, away: 1 },
        { home: 2, away: 0 },
      ];
  const simulated = scores.map((score, index) => ({
    ...base,
    id: `${base.id}-test-${index}`,
    score,
    status: "finished" as const,
  }));

  assert.deepEqual(simulated.map(matchOutcome), ["win", "draw", "loss"]);
});

test("las rutas incluyen estados vacíos, navegación y estilos responsive", async () => {
  const [
    home,
    matchesPage,
    matchesExplorer,
    standingsPage,
    header,
    footer,
    css,
  ] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/partidos/page.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../src/components/matches-explorer.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../app/clasificacion/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/header.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/site-footer.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(home, /La temporada todavía no ha comenzado/);
  assert.match(home, /Aún no hay resultados oficiales/);
  assert.match(home, /results-empty-state/);
  assert.doesNotMatch(home, /Fase 2 · Prototipo local/);
  assert.doesNotMatch(home, /Prototipo deportivo local/);
  assert.match(matchesPage, /MatchesExplorer/);
  assert.match(matchesPage, /season-summary/);
  assert.match(matchesExplorer, /useState<MatchView>\("month"\)/);
  assert.match(matchesExplorer, /window\.history\.replaceState/);
  assert.match(matchesExplorer, /Horario pendiente/);
  assert.doesNotMatch(matchesExplorer, /schedule-source/);
  assert.match(standingsPage, /Clasificación pendiente de resultados completos/);
  assert.match(header, /\["matches", "Partidos", "\/partidos"\]/);
  assert.match(header, /\["standings", "Clasificación", "\/clasificacion"\]/);
  assert.match(header, /aria-current=/);
  assert.match(header, /ThemeSelector/);
  assert.doesNotMatch(header, /profile-button|DemoBadge|Área personal/);
  assert.match(footer, /Última|Actualizado/);
  assert.match(footer, /Fuente:/);
  assert.doesNotMatch(footer, /Fase 2|Prototipo local/);
  assert.match(home, /href="\/partidos"/);
  assert.match(home, /href="\/clasificacion"/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /\.standings-table-wrap[\s\S]*overflow: auto/);
  assert.match(css, /\.match-list-row[\s\S]*min-height: 92px/);
  assert.match(css, /\.matches-toolbar[\s\S]*position: sticky/);
  assert.match(css, /\.schedule-list[\s\S]*grid-template-areas:/);
  assert.match(css, /\.results-empty-state[\s\S]*min-height: 104px/);
  assert.match(css, /\.site-header nav a\.active/);
});

test("la validación de imágenes admite solo URLs web sin credenciales", () => {
  assert.equal(
    isAllowedRemoteImageUrl("https://cdn.example.com/photo.jpg"),
    true,
  );
  assert.equal(isAllowedRemoteImageUrl("javascript:alert(1)"), false);
  assert.equal(isAllowedRemoteImageUrl("file:///tmp/photo.jpg"), false);
  assert.equal(
    isAllowedRemoteImageUrl("https://user:secret@example.com/photo.jpg"),
    false,
  );
});
