import fallback from "@/src/data/rfef-group-2-2026-27.json";
import { officialSportsFacts } from "@/src/data/official-sports-facts";
import { groupOneTeams } from "@/src/data/primera-federacion-teams";
import type {
  Match,
  SportsCatalogSnapshot,
  StandingEntry,
  StandingsStatus,
  SportsGroupSnapshot,
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
export const groupTwoCompetition = {
  id: "primera-federacion-group-2-2026-27",
  name: "Primera Federación · Grupo II",
  shortName: "Primera Federación",
  season: "2026/27",
};
export const groupOneCompetition = {
  id: "primera-federacion-group-1-2026-27",
  name: "Primera Federación · Grupo I",
  shortName: "Primera Federación",
  season: "2026/27",
} as const;

export function toCatalogMatch(
  match: NormalizedGroupMatch,
  competition = groupTwoCompetition,
): Match {
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
  standings?: StandingEntry[],
): SportsCatalogSnapshot {
  const tableState = standingsState(normalizedMatches);
  const allMatches = normalizedMatches
    .map((match) => toCatalogMatch(match))
    .sort(
      (first, second) =>
        new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime(),
    );
  const matches = normalizedMatches
    .filter(
      (match) =>
        match.homeTeam.id === "real-zaragoza" ||
        match.awayTeam.id === "real-zaragoza",
    )
    .map((match) => toCatalogMatch(match))
    .sort(
      (first, second) =>
        new Date(first.startsAt).getTime() -
        new Date(second.startsAt).getTime(),
    );

  return {
    competition: groupTwoCompetition,
    season: groupTwoCompetition.season,
    matches,
    allMatches,
    standings:
      standings ??
      new ComputedStandingsProvider().compute(normalizedMatches),
    standingsStatus: tableState.status,
    missingGroupResults: tableState.missing,
    generatedAt,
    stale: false,
    sourceErrors: [
      "No existe todavía una fuente pública completa de resultados y clasificación de la RFEF",
    ],
  };
}

export function createSportsGroupSnapshot(
  normalizedMatches: NormalizedGroupMatch[],
  group: "group-1" | "group-2",
  generatedAt: string,
  standings?: StandingEntry[],
  options: { stale?: boolean; sourceErrors?: string[] } = {},
): SportsGroupSnapshot {
  const competition = group === "group-1" ? groupOneCompetition : groupTwoCompetition;
  const tableState = standingsState(normalizedMatches);
  return {
    group,
    competition,
    matches: normalizedMatches
      .map((match) => toCatalogMatch(match, competition))
      .sort(
        (first, second) =>
          new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime(),
      ),
    standings:
      standings ??
      new ComputedStandingsProvider(group === "group-1" ? groupOneTeams : undefined).compute(
        normalizedMatches,
      ),
    standingsStatus: tableState.status,
    missingGroupResults: tableState.missing,
    generatedAt,
    stale: options.stale ?? false,
    sourceErrors: options.sourceErrors ?? [],
  };
}

export function getSportsCatalogSnapshot(): SportsCatalogSnapshot {
  return createSportsCatalogSnapshot();
}

export const rfefFallbackMatches = fallbackMatches;
export const rfefFallbackGeneratedAt = fallback.generatedAt;
