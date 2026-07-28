import type { SportsDashboardSnapshot } from "@/src/domain/models";
import {
  getSportsCatalogSnapshot,
  rfefFallbackMatches,
} from "@/src/services/sports-catalog";

function homeStandings(
  entries: SportsDashboardSnapshot["standings"],
): SportsDashboardSnapshot["standings"] {
  const zaragozaIndex = entries.findIndex(
    (entry) => entry.team.id === "real-zaragoza",
  );
  const start = Math.max(
    0,
    Math.min(zaragozaIndex - 2, Math.max(0, entries.length - 5)),
  );
  return entries.slice(start, start + 5);
}

export function getFreeSportsDashboardSnapshot(
  now = new Date(),
): SportsDashboardSnapshot | undefined {
  const catalog = getSportsCatalogSnapshot();
  const zaragozaMatches = catalog.matches;
  const nowTime = now.getTime();
  const recentMatches = zaragozaMatches
    .filter((match) => match.status === "finished")
    .slice(-3)
    .reverse();
  const upcomingMatches = zaragozaMatches
    .filter(
      (match) =>
        match.status === "scheduled" &&
        new Date(match.startsAt).getTime() >= nowTime - 3_600_000,
    )
    .slice(0, 3);
  const nextMatch = upcomingMatches[0];
  if (!nextMatch) return undefined;

  const standings =
    catalog.standingsStatus === "complete"
      ? homeStandings(catalog.standings)
      : [];
  const syncedAt = catalog.generatedAt;
  const date = now.toISOString().slice(0, 10);
  return {
    nextMatch,
    recentMatches,
    upcomingMatches,
    standings,
    news: [],
    dailyBrief:
      "Calendario oficial del Grupo II cargado desde la RFEF. Las fechas son la base de cada jornada; el horario y el estadio permanecen pendientes hasta una confirmación oficial.",
    generatedAt: syncedAt,
    freshness: "fresh",
    isDemo: false,
    mode: "real",
    stale: false,
    sourceErrors: [
      "AS permanece desactivado porque sus condiciones accesibles reservan el uso mediante lectura mecánica",
    ],
    requestUsage: {
      date,
      used: 0,
      limit: 20,
      remaining: 20,
    },
    syncTimes: {
      fixtures: syncedAt,
      standings: syncedAt,
      metadata: syncedAt,
    },
    standingsStatus: catalog.standingsStatus,
    missingGroupResults: catalog.missingGroupResults,
  };
}

export { rfefFallbackMatches };
