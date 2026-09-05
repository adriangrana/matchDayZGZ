import type { Match } from "@/src/domain/models";
import { matchDateKey } from "@/src/services/sports-presenter";

export interface CurrentRoundSelection {
  roundLabel: string;
  matches: Match[];
}

function roundNumber(match: Match): number {
  const value = Number(match.round.match(/\d+/)?.[0]);
  return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
}

function chronological(matches: Match[]): Match[] {
  return [...matches].sort(
    (first, second) =>
      new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime(),
  );
}

export function selectCurrentRoundMatches(
  matches: Match[],
  todayDate: string,
): CurrentRoundSelection {
  const unique = [...new Map(matches.map((match) => [match.id, match])).values()];
  const rounds = new Map<number, Match[]>();

  for (const match of unique) {
    const round = roundNumber(match);
    if (round === Number.MAX_SAFE_INTEGER) continue;
    const entries = rounds.get(round) ?? [];
    entries.push(match);
    rounds.set(round, entries);
  }

  const orderedRounds = [...rounds.entries()].sort(([first], [second]) => first - second);
  const live = orderedRounds.find(([, entries]) =>
    entries.some((match) => match.status === "live"),
  );
  const today = orderedRounds.find(([, entries]) =>
    entries.some(
      (match) =>
        match.status !== "finished" && matchDateKey(match) === todayDate,
    ),
  );
  const upcoming = orderedRounds.find(([, entries]) =>
    entries.some(
      (match) =>
        match.status !== "finished" && matchDateKey(match) > todayDate,
    ),
  );
  const latestFinished = [...orderedRounds]
    .reverse()
    .find(([, entries]) => entries.some((match) => match.status === "finished"));
  const selected = live ?? today ?? upcoming ?? latestFinished ?? orderedRounds[0];

  if (!selected) return { roundLabel: "Jornada pendiente", matches: [] };
  const [, selectedMatches] = selected;
  return {
    roundLabel: selectedMatches[0]?.round ?? "Jornada pendiente",
    matches: chronological(selectedMatches).slice(0, 10),
  };
}
