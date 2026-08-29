"use client";

import { useState } from "react";
import { TeamMark } from "@/src/components/team-mark";
import { StandingsForm } from "@/src/components/standings-form";
import {
  sortStandings,
  standingZone,
  standingZoneLabel,
  StandingsZoneLegend,
} from "@/src/components/standings-zones";
import type { SportsCatalogSnapshot, SportsGroupSnapshot } from "@/src/domain/models";

type Snapshot = SportsCatalogSnapshot | SportsGroupSnapshot;

function formattedSync(value: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  }).format(new Date(value));
}

function StandingTable({ snapshot }: { snapshot: Snapshot }) {
  const isPreseason = snapshot.standingsStatus === "preseason";
  const standings = sortStandings(snapshot.standings);
  const matches = "allMatches" in snapshot ? snapshot.allMatches : snapshot.matches;
  return (
    <section className="standings-tab-panel" role="tabpanel" aria-labelledby={`tab-${snapshot.competition.id.includes("group-1") ? "group-1" : "group-2"}`}>
      <div className="standings-group-heading">
        <h2>{snapshot.competition.name}</h2>
        <span>Última actualización: {formattedSync(snapshot.generatedAt)}</span>
      </div>
      <aside className="standings-warning" role="status">
        <strong>
          {isPreseason
            ? "La temporada todavía no ha comenzado"
            : snapshot.standingsStatus === "complete"
              ? "Clasificación calculada con todos los resultados"
              : "Clasificación calculada y provisional"}
        </strong>
        <p>
          {snapshot.standingsStatus === "complete"
            ? "Tabla construida con resultados finales disponibles."
            : `Clasificación pendiente de resultados completos. Faltan ${snapshot.missingGroupResults} resultados.`}
        </p>
      </aside>
      <StandingsZoneLegend />
      <div className="standings-table-wrap">
        <table className="standings-table">
          <thead>
            <tr>
              <th scope="col">Pos</th><th scope="col">Equipo</th><th scope="col">PJ</th>
              <th scope="col">G</th><th scope="col">E</th><th scope="col">P</th>
              <th scope="col">GF</th><th scope="col">GC</th><th scope="col">DG</th><th scope="col">Pts</th>
              <th scope="col" className="standings-form-heading">Últimos 5</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((entry, index) => {
              const zone = standingZone(index, standings.length);
              const classes = [
                "standings-zone-row",
                `standings-zone-row-${zone}`,
                entry.team.id === "real-zaragoza" ? "standings-team-highlight" : "",
              ].filter(Boolean).join(" ");
              return (
                <tr className={classes} key={entry.team.id}>
                  <td><span className="standings-position-number">{index + 1}</span><span className="sr-only"> · {standingZoneLabel(zone)}</span></td>
                  <th scope="row">
                    <span className="standings-team-cell">
                      <TeamMark team={entry.team} size="tiny" />
                      <span>{entry.team.name}</span>
                    </span>
                  </th>
                  <td>{entry.played}</td><td>{entry.won}</td><td>{entry.drawn}</td><td>{entry.lost}</td>
                  <td>{entry.goalsFor ?? 0}</td><td>{entry.goalsAgainst ?? 0}</td><td>{entry.goalDifference}</td>
                  <td className="standings-points">{entry.points}</td>
                  <td className="standings-form-cell"><StandingsForm teamId={entry.team.id} matches={matches} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function StandingsTabs({
  groupTwo,
  groupOne,
  initialGroup = "group-1",
}: {
  groupTwo: SportsCatalogSnapshot;
  groupOne: SportsGroupSnapshot;
  initialGroup?: "group-1" | "group-2";
}) {
  const [activeGroup, setActiveGroup] = useState<"group-1" | "group-2">(initialGroup);
  const active = activeGroup === "group-1" ? groupOne : groupTwo;

  function selectGroup(group: "group-1" | "group-2") {
    setActiveGroup(group);
    const url = new URL(window.location.href);
    url.searchParams.set("grupo", group === "group-1" ? "1" : "2");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  return (
    <div className="standings-tabs">
      <div className="standings-tab-list" role="tablist" aria-label="Grupo de Primera Federación">
        <button
          id="tab-group-1"
          className={activeGroup === "group-1" ? "standings-tab is-active" : "standings-tab"}
          type="button"
          role="tab"
          aria-selected={activeGroup === "group-1"}
          aria-controls="standings-tab-panel"
          onClick={() => selectGroup("group-1")}
        >
          Grupo I
          <span>20 equipos</span>
        </button>
        <button
          id="tab-group-2"
          className={activeGroup === "group-2" ? "standings-tab is-active" : "standings-tab"}
          type="button"
          role="tab"
          aria-selected={activeGroup === "group-2"}
          aria-controls="standings-tab-panel"
          onClick={() => selectGroup("group-2")}
        >
          Grupo II
          <span>Real Zaragoza</span>
        </button>
      </div>
      <div id="standings-tab-panel">
        <StandingTable snapshot={active} />
      </div>
    </div>
  );
}
