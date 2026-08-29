import type { Match, StandingEntry } from "@/src/domain/models";

export interface LiveStandingScore {
  match: Match;
  label: string;
}

export function liveMatches(matches: Match[]): Match[] {
  return matches.filter((match) => match.status === "live");
}

export function applyLiveMatchesToStandings(
  standings: StandingEntry[],
  matches: Match[],
): StandingEntry[] {
  const currentLiveMatches = liveMatches(matches).filter((match) => Boolean(match.score));
  if (currentLiveMatches.length === 0) return standings;

  const table = new Map(
    standings.map((entry) => [
      entry.team.id,
      {
        ...entry,
        goalsFor: entry.goalsFor ?? 0,
        goalsAgainst: entry.goalsAgainst ?? 0,
      },
    ]),
  );

  for (const match of currentLiveMatches) {
    if (!match.score) continue;
    const home = table.get(match.homeTeam.id);
    const away = table.get(match.awayTeam.id);
    if (!home || !away) continue;

    home.played += 1;
    away.played += 1;
    home.goalsFor += match.score.home;
    home.goalsAgainst += match.score.away;
    away.goalsFor += match.score.away;
    away.goalsAgainst += match.score.home;

    if (match.score.home > match.score.away) {
      home.won += 1;
      home.points += 3;
      away.lost += 1;
    } else if (match.score.home < match.score.away) {
      away.won += 1;
      away.points += 3;
      home.lost += 1;
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  return [...table.values()]
    .map((entry) => ({
      ...entry,
      goalDifference: (entry.goalsFor ?? 0) - (entry.goalsAgainst ?? 0),
    }))
    .sort(
      (first, second) =>
        second.points - first.points ||
        second.goalDifference - first.goalDifference ||
        (second.goalsFor ?? 0) - (first.goalsFor ?? 0) ||
        first.team.name.localeCompare(second.team.name, "es"),
    )
    .map((entry, index) => ({ ...entry, position: index + 1 }));
}

export function liveScoreForTeam(
  teamId: string,
  matches: Match[],
): LiveStandingScore | undefined {
  const match = liveMatches(matches).find(
    (candidate) =>
      Boolean(candidate.score) &&
      (candidate.homeTeam.id === teamId || candidate.awayTeam.id === teamId),
  );
  if (!match?.score) return undefined;
  return {
    match,
    label: `${match.score.home}-${match.score.away}`,
  };
}
