import type { Team } from "@/src/domain/models";

export function TeamMark({
  team,
  featured = false,
  size = "normal",
}: {
  team: Team;
  featured?: boolean;
  size?: "tiny" | "small" | "normal";
}) {
  const classes = [
    "team-mark",
    featured ? "team-mark-featured" : "",
    `team-mark-${size}`,
    team.id === "real-zaragoza" ? "team-mark-zaragoza" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes} role="img" aria-label={`Escudo de ${team.name}`}>
      <span>{team.abbreviation}</span>
    </span>
  );
}

