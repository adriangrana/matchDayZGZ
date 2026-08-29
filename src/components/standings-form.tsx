import type { Match } from "@/src/domain/models";

export type FormOutcome = "win" | "draw" | "loss" | "pending";

export function recentFormForTeam(teamId: string, matches: Match[]): FormOutcome[] {
  const outcomes = matches
    .filter(
      (match) =>
        match.status === "finished" &&
        Boolean(match.score) &&
        (match.homeTeam.id === teamId || match.awayTeam.id === teamId),
    )
    .sort(
      (first, second) =>
        new Date(second.startsAt).getTime() - new Date(first.startsAt).getTime(),
    )
    .slice(0, 5)
    .reverse()
    .map<FormOutcome>((match) => {
      const isHome = match.homeTeam.id === teamId;
      const teamGoals = isHome ? match.score!.home : match.score!.away;
      const rivalGoals = isHome ? match.score!.away : match.score!.home;
      if (teamGoals > rivalGoals) return "win";
      if (teamGoals < rivalGoals) return "loss";
      return "draw";
    });

  return [...outcomes, ...Array<FormOutcome>(5 - outcomes.length).fill("pending")];
}

const outcomeLabels: Record<FormOutcome, string> = {
  win: "Victoria",
  draw: "Empate",
  loss: "Derrota",
  pending: "Sin partido",
};

const outcomeMarks: Record<FormOutcome, string> = {
  win: "✓",
  draw: "–",
  loss: "×",
  pending: "",
};

export function StandingsForm({ teamId, matches }: { teamId: string; matches: Match[] }) {
  const form = recentFormForTeam(teamId, matches);
  const playedLabels = form.filter((outcome) => outcome !== "pending").map((outcome) => outcomeLabels[outcome]);

  return (
    <span
      aria-label={playedLabels.length > 0 ? `Últimos partidos: ${playedLabels.join(", ")}` : "Todavía no ha disputado partidos"}
      className="standings-form"
    >
      {form.map((outcome, index) => (
        <i
          aria-hidden="true"
          className={`standings-form-dot standings-form-dot-${outcome}`}
          key={`${outcome}-${index}`}
          title={outcomeLabels[outcome]}
        >
          {outcomeMarks[outcome]}
        </i>
      ))}
    </span>
  );
}
