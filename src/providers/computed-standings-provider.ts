import { groupTwoTeams } from "@/src/data/primera-federacion-teams";
import type { StandingEntry } from "@/src/domain/models";
import type { NormalizedGroupMatch } from "@/src/providers/free-sports-types";

interface MutableStanding extends StandingEntry {
  goalsFor: number;
  goalsAgainst: number;
}

export class ComputedStandingsProvider {
  readonly id = "computed-standings";

  compute(matches: NormalizedGroupMatch[]): MutableStanding[] {
    const table = new Map<string, MutableStanding>(
      groupTwoTeams.map((team) => [
        team.id,
        {
          position: 0,
          team,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          points: 0,
        },
      ]),
    );

    for (const match of matches) {
      if (match.status !== "finished" || !match.score) continue;
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
        goalDifference: entry.goalsFor - entry.goalsAgainst,
      }))
      .sort(
        (first, second) =>
          second.points - first.points ||
          second.goalDifference - first.goalDifference ||
          second.goalsFor - first.goalsFor ||
          first.team.name.localeCompare(second.team.name, "es"),
      )
      .map((entry, index) => ({ ...entry, position: index + 1 }));
  }

  compare(
    computed: StandingEntry[],
    published: StandingEntry[] | undefined,
  ): string[] {
    if (!published?.length) return [];
    const differences: string[] = [];
    const publishedByTeam = new Map(
      published.map((entry) => [entry.team.id, entry]),
    );
    for (const entry of computed) {
      const reference = publishedByTeam.get(entry.team.id);
      if (!reference) {
        differences.push(`${entry.team.name}: no aparece en la tabla publicada`);
        continue;
      }
      const fields = [
        ["PJ", entry.played, reference.played],
        ["PG", entry.won, reference.won],
        ["PE", entry.drawn, reference.drawn],
        ["PP", entry.lost, reference.lost],
        ["DG", entry.goalDifference, reference.goalDifference],
        ["PTS", entry.points, reference.points],
      ] as const;
      for (const [label, local, remote] of fields) {
        if (local !== remote) {
          differences.push(
            `${entry.team.name} ${label}: calculada ${local}, publicada ${remote}`,
          );
        }
      }
    }
    return differences;
  }
}

