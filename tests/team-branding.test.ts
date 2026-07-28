import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";
import {
  groupTwoTeamAliases,
  groupTwoTeams,
} from "../src/data/primera-federacion-teams";
import { TeamMark } from "../src/components/team-mark";
import type { TeamBrandingSnapshot } from "../src/providers/team-branding-provider";
import {
  candidateMatchesTeam,
  TheSportsDbBrandingProvider,
  validateBadgeBytes,
} from "../src/providers/thesportsdb-branding-provider";

test("corresponde nombres y aliases con el club español de fútbol", () => {
  const team = groupTwoTeams.find(
    (candidate) => candidate.id === "real-zaragoza",
  )!;
  assert.equal(
    candidateMatchesTeam(team, groupTwoTeamAliases[team.id]!, {
      idTeam: "133737",
      strTeam: "Real Zaragoza",
      strSport: "Soccer",
      strCountry: "Spain",
    }),
    true,
  );
  assert.equal(
    candidateMatchesTeam(team, groupTwoTeamAliases[team.id]!, {
      idTeam: "invalid",
      strTeam: "Zaragoza",
      strSport: "Basketball",
      strCountry: "Spain",
    }),
    false,
  );
});

test("rechaza el primer equipo homónimo de Atlético Madrileño", () => {
  const team = groupTwoTeams.find(
    (candidate) => candidate.id === "atletico-madrileno",
  )!;
  const aliases = groupTwoTeamAliases[team.id]!;

  assert.equal(
    candidateMatchesTeam(team, aliases, {
      idTeam: "133729",
      strTeam: "Atlético Madrid",
      strTeamAlternate: "Club Atlético de Madrid, Atlético de Madrid",
      strSport: "Soccer",
      strCountry: "Spain",
    }),
    false,
  );
  assert.equal(
    candidateMatchesTeam(team, aliases, {
      idTeam: "137820",
      strTeam: "Atlético Madrileño",
      strTeamAlternate: "Atlético Madrid B",
      strSport: "Soccer",
      strCountry: "Spain",
    }),
    true,
  );
});

test("rechaza imágenes vacías, pequeñas o con proporciones de seguimiento", () => {
  assert.equal(validateBadgeBytes("text/html", new Uint8Array(1_024)), undefined);

  const tinyPng = new Uint8Array(512);
  tinyPng.set([0x89, 0x50, 0x4e, 0x47]);
  new DataView(tinyPng.buffer).setUint32(16, 1);
  new DataView(tinyPng.buffer).setUint32(20, 1);
  assert.equal(validateBadgeBytes("image/png", tinyPng), undefined);

  const trackingPng = new Uint8Array(512);
  trackingPng.set([0x89, 0x50, 0x4e, 0x47]);
  new DataView(trackingPng.buffer).setUint32(16, 500);
  new DataView(trackingPng.buffer).setUint32(20, 50);
  assert.equal(validateBadgeBytes("image/png", trackingPng), undefined);
});

test("acepta una imagen proporcionada y la CSS mantiene su proporción", async () => {
  const png = new Uint8Array(512);
  png.set([0x89, 0x50, 0x4e, 0x47]);
  new DataView(png.buffer).setUint32(16, 512);
  new DataView(png.buffer).setUint32(20, 500);
  assert.deepEqual(validateBadgeBytes("image/png", png), {
    width: 512,
    height: 500,
  });

  const css = await readFile(
    new URL("../app/globals.css", import.meta.url),
    "utf8",
  );
  assert.match(css, /\.team-mark img[\s\S]*object-fit: contain/);
  assert.doesNotMatch(
    css.match(/\.team-mark img\s*\{[\s\S]*?\}/)?.[0] ?? "",
    /object-fit: cover/,
  );
});

test("el fallback reserva espacio sin icono ni iniciales", () => {
  const html = renderToStaticMarkup(
    React.createElement(TeamMark, {
      team: {
        id: "equipo-no-validado",
        name: "Equipo no validado",
        shortName: "Equipo",
        abbreviation: "ENV",
      },
    }),
  );

  assert.doesNotMatch(html, /ENV|<img/);
  assert.match(html, /team-mark-empty/);
});

test("la caché semanal evita nuevas solicitudes con los mismos equipos", async () => {
  const directory = await mkdtemp(join(tmpdir(), "matchday-badges-"));
  const cachePath = join(directory, "cache.json");
  const bundledPath = join(directory, "bundled.json");
  const now = new Date("2026-07-28T10:00:00Z");
  const cached: TeamBrandingSnapshot = {
    provider: "thesportsdb",
    syncedAt: "2026-07-27T10:00:00Z",
    refreshAfter: "2026-08-03T10:00:00Z",
    teamFingerprint: groupTwoTeams
      .map((team) => team.id)
      .sort()
      .join("|"),
    records: [],
    stats: {
      processed: 20,
      found: 20,
      validated: 20,
      rejected: 0,
      ambiguous: 0,
      missing: 0,
      requests: 40,
      fromCache: 0,
    },
  };
  await writeFile(cachePath, JSON.stringify(cached), "utf8");
  const provider = new TheSportsDbBrandingProvider(
    cachePath,
    bundledPath,
    async () => {
      throw new Error("No debe consultar la red");
    },
  );

  const result = await provider.sync({ now });
  assert.equal(result.stats.requests, 0);
  assert.equal(result.stats.fromCache, 0);
  assert.equal(JSON.parse(await readFile(bundledPath, "utf8")).provider, "thesportsdb");
});

test("Inicio, Partidos y Clasificación consumen el mismo componente", async () => {
  const files = await Promise.all(
    [
      "../app/page.tsx",
      "../src/components/matches-explorer.tsx",
      "../app/clasificacion/page.tsx",
    ].map((path) => readFile(new URL(path, import.meta.url), "utf8")),
  );
  assert.ok(files.every((file) => file.includes("<TeamMark")));
});

test("el snapshot validado usa copias locales sincronizadas", async () => {
  const snapshot = JSON.parse(
    await readFile(
      new URL(
        "../src/data/team-branding-snapshot.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ) as TeamBrandingSnapshot;

  assert.equal(snapshot.records.length, 20);
  assert.ok(
    snapshot.records.every(
      (record) =>
        record.validation === "validated" &&
        record.badgeUrl?.startsWith("https://") &&
        record.localAssetPath?.startsWith("/team-badges/"),
    ),
  );
});
