import fallback from "@/src/data/rfef-group-2-2026-27.json";
import type {
  Match,
  SportsDashboardSnapshot,
} from "@/src/domain/models";
import { ComputedStandingsProvider } from "@/src/providers/computed-standings-provider";
import type { NormalizedGroupMatch } from "@/src/providers/free-sports-types";

const fallbackMatches = fallback.matches as NormalizedGroupMatch[];
const competition = {
  id: "primera-federacion-group-2-2026-27",
  name: "Primera Federación · Grupo II",
  shortName: "Primera Federación",
  season: "2026/27",
};

function toDashboardMatch(match: NormalizedGroupMatch): Match {
  return {
    id: match.id,
    competition,
    round: match.roundLabel,
    startsAt: match.startsAt,
    scheduleStatus: match.kickoffStatus,
    status: match.status,
    venue: match.venue ?? "Por confirmar",
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    score: match.score,
    source: match.sources[0]!,
    updatedAt: match.updatedAt,
  };
}

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
  const zaragozaMatches = fallbackMatches
    .filter(
      (match) =>
        match.homeTeam.id === "real-zaragoza" ||
        match.awayTeam.id === "real-zaragoza",
    )
    .map(toDashboardMatch)
    .sort(
      (first, second) =>
        new Date(first.startsAt).getTime() -
        new Date(second.startsAt).getTime(),
    );
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

  const standings = new ComputedStandingsProvider().compute(fallbackMatches);
  const syncedAt = fallback.generatedAt;
  const date = now.toISOString().slice(0, 10);
  return {
    nextMatch,
    recentMatches,
    upcomingMatches,
    standings: homeStandings(standings),
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
  };
}

export const rfefFallbackMatches = fallbackMatches;

