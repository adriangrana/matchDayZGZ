import type { Match } from "@/src/domain/models";
import { competitionCategory } from "@/src/services/sports-presenter";

export type CompetitionFilter = "all" | "league" | "cup" | "friendly";
export type MatchScope = "all" | "upcoming" | "finished" | "home" | "away";
export type MatchStateFilter = "all" | "upcoming" | "finished";
export type MatchConditionFilter = "all" | "home" | "away";
export type MatchView = "round" | "month";

export function filterMatches(
  matches: Match[],
  competition: CompetitionFilter,
  scope: MatchScope,
): Match[] {
  return matches.filter((match) => {
    if (
      competition !== "all" &&
      competitionCategory(match) !== competition
    ) {
      return false;
    }
    if (scope === "upcoming") return match.status !== "finished";
    if (scope === "finished") return match.status === "finished";
    if (scope === "home") return match.homeTeam.id === "real-zaragoza";
    if (scope === "away") return match.awayTeam.id === "real-zaragoza";
    return true;
  });
}

export function filterMatchesByCriteria(
  matches: Match[],
  competition: CompetitionFilter,
  state: MatchStateFilter,
  condition: MatchConditionFilter,
): Match[] {
  return filterMatches(
    filterMatches(matches, competition, state),
    "all",
    condition,
  );
}

export function groupMatches(
  matches: Match[],
  view: MatchView,
): Array<{ label: string; matches: Match[] }> {
  const groups = new Map<string, Match[]>();
  for (const match of matches) {
    const label =
      view === "round"
        ? match.round
        : new Intl.DateTimeFormat("es-ES", {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          }).format(
            new Date(
              `${match.dateBase ?? match.startsAt.slice(0, 10)}T12:00:00Z`,
            ),
          );
    groups.set(label, [...(groups.get(label) ?? []), match]);
  }
  return [...groups].map(([label, groupedMatches]) => ({
    label,
    matches: groupedMatches,
  }));
}

export function finishedByCompetition(
  matches: Match[],
): Array<{ label: string; matches: Match[] }> {
  const groups = new Map<string, Match[]>();
  matches
    .filter((match) => match.status === "finished" && match.score)
    .sort(
      (first, second) =>
        new Date(second.startsAt).getTime() -
        new Date(first.startsAt).getTime(),
    )
    .forEach((match) => {
      const label = match.competition.shortName;
      groups.set(label, [...(groups.get(label) ?? []), match]);
    });
  return [...groups].map(([label, groupedMatches]) => ({
    label,
    matches: groupedMatches,
  }));
}
