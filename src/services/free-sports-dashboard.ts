import type { SportsDashboardSnapshot } from "@/src/domain/models";
import {
  rfefFallbackMatches,
} from "@/src/services/sports-catalog";
import { getPersistedSportsCatalogCollection } from "@/src/services/persisted-sports-catalog";

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

export async function getFreeSportsDashboardSnapshot(
  now = new Date(),
): Promise<SportsDashboardSnapshot | undefined> {
  const { groupTwo: catalog, groupOne } =
    await getPersistedSportsCatalogCollection();
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

  const groupOneRecentMatches = groupOne.matches
    .filter((match) => match.status === "finished")
    .slice(-10)
    .reverse();
  const groupOneUpcomingMatches = groupOne.matches
    .filter((match) => match.status === "scheduled")
    .slice(0, 10);
  const groupTwoOverviewMatches = catalog.allMatches ?? catalog.matches;
  const groupTwoRecentMatches = groupTwoOverviewMatches
    .filter((match) => match.status === "finished")
    .sort(
      (first, second) =>
        new Date(second.startsAt).getTime() - new Date(first.startsAt).getTime(),
    )
    .slice(0, 10);
  const groupTwoUpcomingMatches = groupTwoOverviewMatches
    .filter((match) => match.status === "scheduled")
    .slice(0, 10);

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
      "Calendarios oficiales de los Grupos I y II cargados desde la RFEF. Las fechas son la base de cada jornada; los horarios se muestran solo cuando existe confirmación oficial.",
    generatedAt: syncedAt,
    freshness: "fresh",
    isDemo: false,
    mode: "real",
    stale: catalog.stale,
    sourceErrors: catalog.sourceErrors,
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
    groupOneUpcomingMatches,
    groupOneRecentMatches,
    groupOneStandings: groupOne.standings,
    groupOneStandingsStatus: groupOne.standingsStatus,
    groupOneMissingGroupResults: groupOne.missingGroupResults,
    groupOneGeneratedAt: groupOne.generatedAt,
    groupTwoUpcomingMatches,
    groupTwoRecentMatches,
    groupTwoFullStandings: catalog.standings,
    groupTwoStandingsStatus: catalog.standingsStatus,
    groupTwoMissingGroupResults: catalog.missingGroupResults,
  };
}

export { rfefFallbackMatches };
