import {
  normalizeTeamName,
  resolveGroupOneTeam,
  resolveGroupTwoTeam,
} from "@/src/data/primera-federacion-teams";
import { officialSportsFacts } from "@/src/data/official-sports-facts";
import { groupOneTeams } from "@/src/data/primera-federacion-teams";
import { ComputedStandingsProvider } from "@/src/providers/computed-standings-provider";
import type {
  FreeSportsInspection,
  NormalizedGroupMatch,
  OfficialMatchPatch,
} from "@/src/providers/free-sports-types";

function resolvedTeamId(value: string): string | undefined {
  return resolveGroupTwoTeam(value)?.id ?? resolveGroupOneTeam(value)?.id;
}

function sameTeam(value: string, matchTeam: NormalizedGroupMatch["homeTeam"]): boolean {
  const resolved = resolvedTeamId(value);
  return resolved
    ? resolved === matchTeam.id
    : normalizeTeamName(value) === normalizeTeamName(matchTeam.name);
}

function verifiedFinishedFactFor(
  match: NormalizedGroupMatch,
): OfficialMatchPatch | undefined {
  return officialSportsFacts.find(
    (fact) =>
      fact.round === match.round &&
      fact.status === "finished" &&
      Boolean(fact.score) &&
      fact.source.id.startsWith("rfef-") &&
      sameTeam(fact.homeTeamName, match.homeTeam) &&
      sameTeam(fact.awayTeamName, match.awayTeam),
  );
}

export function applyVerifiedHistoricalMatches(
  matches: NormalizedGroupMatch[],
): NormalizedGroupMatch[] {
  return matches.map((match) => {
    const fact = verifiedFinishedFactFor(match);
    if (!fact?.score) return match;

    return {
      ...match,
      startsAt: fact.startsAt ?? match.startsAt,
      kickoffStatus: fact.startsAt ? fact.kickoffStatus : match.kickoffStatus,
      score: fact.score,
      status: "finished",
      sources: [
        fact.source,
        ...match.sources.filter((source) => source.id !== fact.source.id),
      ],
      updatedAt: fact.source.fetchedAt || match.updatedAt,
    };
  });
}

/**
 * Last authoritative historical pass before persistence. External providers may
 * be partial or temporarily unavailable, but a previously verified official
 * final result must never disappear from the league table on a later sync.
 */
export function applyVerifiedHistoricalResults(
  snapshot: FreeSportsInspection,
): FreeSportsInspection {
  const matches = applyVerifiedHistoricalMatches(snapshot.matches);
  const groupOneMatches = applyVerifiedHistoricalMatches(
    snapshot.groupOneMatches ?? [],
  );

  const standings = new ComputedStandingsProvider().compute(
    matches.filter((match) => match.status === "finished" && match.score),
  );
  const groupOneStandings = new ComputedStandingsProvider(groupOneTeams).compute(
    groupOneMatches.filter(
      (match) => match.status === "finished" && match.score,
    ),
  );

  return {
    ...snapshot,
    matches,
    groupOneMatches,
    zaragozaMatches: matches.filter(
      (match) =>
        match.homeTeam.id === "real-zaragoza" ||
        match.awayTeam.id === "real-zaragoza",
    ),
    standings,
    groupOneStandings,
  };
}
