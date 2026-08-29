import type { StandingEntry } from "@/src/domain/models";

export type StandingZone = "promotion" | "playoff" | "safe" | "relegation";

export function sortStandings(entries: StandingEntry[]): StandingEntry[] {
  return [...entries]
    .sort(
      (first, second) =>
        second.points - first.points ||
        second.goalDifference - first.goalDifference ||
        (second.goalsFor ?? 0) - (first.goalsFor ?? 0) ||
        first.team.name.localeCompare(second.team.name, "es"),
    )
    .map((entry, index) => ({ ...entry, position: index + 1 }));
}

export function standingZone(index: number, total: number): StandingZone {
  const position = index + 1;
  if (position === 1) return "promotion";
  if (position <= 5) return "playoff";
  if (position > total - 5) return "relegation";
  return "safe";
}

export function standingZoneLabel(zone: StandingZone): string {
  if (zone === "promotion") return "Ascenso directo";
  if (zone === "playoff") return "Playoff de ascenso";
  if (zone === "relegation") return "Descenso";
  return "Permanencia";
}

export function StandingsZoneLegend({ compact = false }: { compact?: boolean }) {
  const items: Array<{ zone: StandingZone; label: string; positions: string }> = [
    { zone: "promotion", label: "Ascenso directo", positions: "1.º" },
    { zone: "playoff", label: "Playoff de ascenso", positions: "2.º–5.º" },
    { zone: "safe", label: "Permanencia", positions: "6.º–15.º" },
    { zone: "relegation", label: "Descenso", positions: "16.º–20.º" },
  ];

  return (
    <div
      aria-label="Leyenda de posiciones de la clasificación"
      className={compact ? "standings-zone-legend standings-zone-legend-compact" : "standings-zone-legend"}
    >
      {items.map((item) => (
        <span className="standings-zone-legend-item" key={item.zone}>
          <i className={`standings-zone-dot standings-zone-dot-${item.zone}`} aria-hidden="true" />
          <strong>{item.label}</strong>
          <small>{item.positions}</small>
        </span>
      ))}
    </div>
  );
}
