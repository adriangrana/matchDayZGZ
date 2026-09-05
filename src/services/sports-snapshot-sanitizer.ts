import { groupOneTeams } from "@/src/data/primera-federacion-teams";
import { ComputedStandingsProvider } from "@/src/providers/computed-standings-provider";
import type {
  FreeSportsInspection,
  NormalizedGroupMatch,
} from "@/src/providers/free-sports-types";

const FUTURE_TOLERANCE_MS = 5 * 60 * 1_000;
const RESULT_SOURCE_IDS = new Set([
  "rfef-results-article",
  "rfef-live-scoreboard",
  "sofascore-live-fallback",
  "sofascore-matchday-fallback",
]);

function isResultSourceId(id: string): boolean {
  return RESULT_SOURCE_IDS.has(id) || id.startsWith("rfef-results-article-r");
}

function isImpossibleFutureResult(match: NormalizedGroupMatch, now: Date): boolean {
  if (match.status !== "finished" || !match.score) return false;
  const startsAt = new Date(match.startsAt).getTime();
  if (!Number.isFinite(startsAt)) return false;
  return startsAt > now.getTime() + FUTURE_TOLERANCE_MS;
}

function resetImpossibleResult(
  match: NormalizedGroupMatch,
  now: Date,
): NormalizedGroupMatch {
  if (!isImpossibleFutureResult(match, now)) return match;

  const sources = match.sources.filter(
    (source) => !isResultSourceId(source.id),
  );
  const primary = sources[0];

  return {
    ...match,
    score: undefined,
    status: "scheduled",
    kickoffStatus:
      primary && primary.id !== "rfef-calendar-pdf"
        ? match.kickoffStatus
        : "unknown",
    sources,
    updatedAt: primary?.fetchedAt ?? match.updatedAt,
  };
}

function sanitizeMatches(
  matches: NormalizedGroupMatch[],
  now: Date,
): NormalizedGroupMatch[] {
  return matches.map((match) => resetImpossibleResult(match, now));
}

/**
 * Final invariant before persisting a sports snapshot: a fixture whose kickoff
 * is still in the future can never contribute a final score or league points.
 * This protects the table from broad HTML result pages accidentally matching
 * the return leg between the same two clubs.
 */
export function sanitizeSportsSnapshot(
  snapshot: FreeSportsInspection,
  options: { now?: Date } = {},
): FreeSportsInspection {
  const now = options.now ?? new Date();
  const matches = sanitizeMatches(snapshot.matches, now);
  const groupOneMatches = sanitizeMatches(snapshot.groupOneMatches ?? [], now);

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
