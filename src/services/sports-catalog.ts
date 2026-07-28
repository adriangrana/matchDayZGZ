import fallback from "@/src/data/rfef-group-2-2026-27.json";
import { officialSportsFacts } from "@/src/data/official-sports-facts";
import type {
  Match,
  SportsCatalogSnapshot,
  StandingsStatus,
} from "@/src/domain/models";
import { ComputedStandingsProvider } from "@/src/providers/computed-standings-provider";
import type { NormalizedGroupMatch } from "@/src/providers/free-sports-types";

const fallbackMatches = (fallback.matches as NormalizedGroupMatch[]).map(
  (match) => {
    const fact = officialSportsFacts.find(
      (candidate) =>
        candidate.round === match.round &&
        candidate.homeTeamName === match.homeTeam.name &&
        candidate.awayTeamName === match.awayTeam.name,
    );
    if (!fact) return match;
    return {
      ...match,
      venue: fact.venue ?? match.venue,
      sources: [...match.sources, fact.source],
      updatedAt: fact.source.fetchedAt,
    };
  },
);
const competition = {
  id: "primera-federacion-group-2-2026-27",
  name: "Primera Federación · Grupo II",
  shortName: "Primera Federación",
  season: "2026/27",
};

export function toCatalogMatch(match: NormalizedGroupMatch): Match {
  return {
    id: match.id,
    competition,
    round: match.roundLabel,
    dateBase: match.dateBase,
    startsAt:
      match.kickoffStatus === "confirmed" ? match.startsAt : match.dateBase,
    scheduleStatus: match.kickoffStatus,
    status: match.status,
    venue: match.venue,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    score: match.score,
    source:
      match.sources.find((source) => source.id === "rfef-calendar-pdf") ??
      match.sources[0]!,
    venueSource: match.venue
      ? match.sources.find(
          (source) => source.id === "real-zaragoza-official",
        )
      : undefined,
    updatedAt: match.updatedAt,
  };
}

export function standingsState(
  matches: NormalizedGroupMatch[],
): { status: StandingsStatus; missing: number } {
  const leagueMatches = matches.filter((match) => match.round > 0);
  const finished = leagueMatches.filter(
    (match) => match.status === "finished" && match.score,
  ).length;
  if (finished === 0) {
    return { status: "preseason", missing: leagueMatches.length };
  }
  return {
    status: finished === leagueMatches.length ? "complete" : "partial",
    missing: leagueMatches.length - finished,
  };
}

export function createSportsCatalogSnapshot(
  normalizedMatches: NormalizedGroupMatch[] = fallbackMatches,
  generatedAt = fallback.generatedAt,
): SportsCatalogSnapshot {
  const tableState = standingsState(normalizedMatches);
  const matches = normalizedMatches
    .filter(
      (match) =>
        match.homeTeam.id === "real-zaragoza" ||
        match.awayTeam.id === "real-zaragoza",
    )
    .map(toCatalogMatch)
    .sort(
      (first, second) =>
        new Date(first.startsAt).getTime() -
        new Date(second.startsAt).getTime(),
    );

  return {
    season: competition.season,
    matches,
    standings: new ComputedStandingsProvider().compute(normalizedMatches),
    standingsStatus: tableState.status,
    missingGroupResults: tableState.missing,
    generatedAt,
    stale: false,
    sourceErrors: [
      "No existe todavía una fuente pública completa de resultados y clasificación de la RFEF",
    ],
  };
}

export function getSportsCatalogSnapshot(): SportsCatalogSnapshot {
  return createSportsCatalogSnapshot();
}

export const rfefFallbackMatches = fallbackMatches;
